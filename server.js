import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { HfInference } from "@huggingface/inference";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
app.use(express.json());
const corsOptions = {
  origin: '*',
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Authorization"],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  next();
});
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'OPTIONS') {
    console.log(`   Headers:`, req.headers);
  }
  next();
});
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Whoa! Too many questions. Please wait a minute before trying again." },
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/ask-hf-ai", limiter);

app.get("/test", (req, res) => {
  res.json({ message: "Server is working!", timestamp: new Date().toISOString() });
});
app.get("/last-error", (req, res) => {
  res.json({ lastError: null, timestamp: new Date().toISOString() });
});
app.get("/", (req, res) => {
  res.json({status: "Server is running", routes: ["/test", "/ask-hf-ai"], timestamp: new Date().toISOString() });
});
app.options("/ask-hf-ai", (req, res) => { res.status(204).end(); });
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
// Hugging Face works without API key for some models, but with rate limits
const hf = new HfInference(HF_API_KEY || undefined);

if (HF_API_KEY) {
  console.log(`✅ Hugging Face API key loaded (${HF_API_KEY.length} chars)`);
} else {
  console.log(`⚠️  No Hugging Face API key - using free tier (rate limited)`);
}

app.post("/ask-hf-ai", async (req, res) => {
  console.log("📥 Received POST request to /ask-hf-ai");
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }
  
  // Try multiple models as fallback - using models that work well for Q&A
  const models = [
    "google/flan-t5-base",         // Best for Q&A, works without API key
    "microsoft/DialoGPT-small",    // Conversational, smaller/faster
    "gpt2"                         // Fallback
  ];
  
  let lastError = null;
  
  for (const model of models) {
    try {
      console.log(`🔄 Trying model: ${model}`);
      
      // Set timeout for the request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 30000)
      );
      
      let response;
      if (model === "google/flan-t5-base") {
        // Use text generation for Q&A model with proper formatting
        const formattedPrompt = `Question: ${prompt}\nAnswer:`;
        response = await Promise.race([
          hf.textGeneration({
            model: model,
            inputs: formattedPrompt,
            parameters: { 
              max_new_tokens: 150, 
              temperature: 0.7,
              do_sample: true
            }
          }),
          timeoutPromise
        ]);
      } else {
        // Use conversational/text generation for other models
        response = await Promise.race([
          hf.textGeneration({
            model: model,
            inputs: `You are a helpful teacher. Answer this question simply: ${prompt}`,
            parameters: { 
              max_new_tokens: 200, 
              temperature: 0.7, 
              return_full_text: false,
              do_sample: true
            }
          }),
          timeoutPromise
        ]);
      }
      
      // Extract answer from response
      let answer = response.generated_text || response[0]?.generated_text || "";
      
      // Clean up the answer
      if (answer) {
        // Remove the original prompt if it's included
        if (answer.includes(prompt)) {
          answer = answer.replace(prompt, "").trim();
        }
        // Remove common prefixes
        answer = answer.replace(/^(Answer:|Response:)\s*/i, "").trim();
        
        if (answer.length > 0) {
          console.log(`✅ Success with model: ${model}`);
          return res.json({ message: answer });
        }
      }
      
      // If answer is empty, try next model
      console.log(`⚠️ Model ${model} returned empty answer, trying next...`);
      continue;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Model ${model} failed:`, error.message);
      
      // If it's a timeout or network error, try next model
      if (error.message.includes("timeout") || error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
        console.log(`   Network/timeout error, trying next model...`);
        continue;
      }
      
      // If it's a 503 (service unavailable), try next model
      if (error.status === 503 || error.message.includes("503")) {
        console.log(`   Service unavailable, trying next model...`);
        continue;
      }
      
      // For other errors, try next model
      continue;
    }
  }
  
  // All models failed - provide a helpful fallback response
  console.error("❌ All models failed. Last error:", lastError?.message);
  
  // Provide a simple fallback answer based on keywords
  const lowerPrompt = prompt.toLowerCase();
  let fallbackAnswer = "I'm having trouble connecting to my AI brain right now, but I'd love to help you! ";
  
  if (lowerPrompt.includes("what") || lowerPrompt.includes("explain")) {
    fallbackAnswer += "Could you try asking your question again in a moment? The AI service is temporarily busy.";
  } else if (lowerPrompt.includes("how")) {
    fallbackAnswer += "Please try again in a few seconds. The system is processing your request.";
  } else {
    fallbackAnswer += "The AI service is experiencing high traffic. Please wait a moment and try again.";
  }
  
  // Return 200 with fallback message instead of error, so user gets a response
  return res.status(200).json({ 
    message: fallbackAnswer,
    note: "AI service temporarily unavailable - this is a fallback response"
  });
});
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}`, availableRoutes: ["/", "/test", "/ask-hf-ai"] });
});
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Hugging Face Proxy running at http://localhost:${PORT}`);
  console.log(`   POST /ask-hf-ai - Main API endpoint`);
  console.log(`⚠️  Keep this window open - server is running...`);
});
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other server first.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});
