// scripts/doubtsolver.js
// 🤖 AI + Smart Local Fallback Hybrid (Guaranteed to Respond)

export async function solveDoubt(question) {
  const maxRetries = 3;
  const retryDelayMs = 3000;
  let attempt = 0;
  const lowerQ = question.toLowerCase();

  while (attempt < maxRetries) {
    try {
      console.log(`🔍 Attempt ${attempt + 1}: Sending to /ask-hf-ai`);

      const res = await fetch("http://localhost:3000/ask-hf-ai", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ prompt: question })
      });

      if (!res.ok) {
        let errorText = await res.text();
        let errorJson = {};
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          errorJson = { message: errorText };
        }

        // Retry on specific server or rate-limit issues
        if ([429, 500, 502].includes(res.status)) {
          if (attempt < maxRetries - 1) {
            console.warn(`⚠️ Server issue (status ${res.status}), retrying...`);
            await new Promise(r => setTimeout(r, retryDelayMs));
            attempt++;
            continue;
          }
        }

        // Throw the error to trigger fallback
        throw new Error(errorJson.error || errorJson.message || `HTTP ${res.status}`);
      }

      // ✅ Successful response
      const data = await res.json();
      const message = data.message || "Hmm, I couldn't think of an answer!";
      console.log("🧠 AI Response:", message);
      return message;

    } catch (err) {
      console.error(`❌ Attempt ${attempt + 1} failed:`, err);

      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, retryDelayMs));
        attempt++;
      } else {
        console.warn("⚠️ All AI attempts failed. Switching to offline fallback.");
        return getSmartFallbackAnswer(lowerQ);
      }
    }
  }

  // should never reach here, but just in case
  return getSmartFallbackAnswer(lowerQ);
}

// 🧩 Smart Offline Fallback Brain
function getSmartFallbackAnswer(q) {
  if (/hello|hi|hey/.test(q))
    return "Hi there! I’m PrepMate, your study friend! What do you want to learn today? 😊";

  if (/(\d+)\s*\+\s*(\d+)/.test(q)) {
    const [_, a, b] = q.match(/(\d+)\s*\+\s*(\d+)/);
    return `${a} plus ${b} is ${parseInt(a) + parseInt(b)}! Great job counting! 🎉`;
  }

  if (/(\d+)\s*-\s*(\d+)/.test(q)) {
    const [_, a, b] = q.match(/(\d+)\s*-\s*(\d+)/);
    return `${a} minus ${b} equals ${parseInt(a) - parseInt(b)}. You're quick with numbers! 🧮`;
  }

  if (/(\d+)\s*[\*x]\s*(\d+)/.test(q)) {
    const [_, a, b] = q.match(/(\d+)\s*[\*x]\s*(\d+)/);
    return `${a} times ${b} is ${parseInt(a) * parseInt(b)}. You're a multiplication master! ✖️`;
  }

  if (/(\d+)\s*\/\s*(\d+)/.test(q)) {
    const [_, a, b] = q.match(/(\d+)\s*\/\s*(\d+)/);
    return `${a} divided by ${b} is ${(parseInt(a) / parseInt(b)).toFixed(2)}. Well done! ➗`;
  }

  if (q.includes("count") || q.includes("numbers"))
    return "Let’s count together! 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ Yay! That was fun! 🎈";

  if (q.includes("shape") || q.includes("circle") || q.includes("square"))
    return "A circle is round like the sun ☀️, a square has 4 equal sides, and a triangle has 3 points! 🟢🟣🔺";

  if (q.includes("color"))
    return "Colors make our world bright! Red for apples 🍎, blue for the sky 🌈, green for leaves 🌿!";

  if (q.includes("animal"))
    return "Animals are amazing! 🐘 Elephants are big, 🐇 rabbits are small, 🐶 dogs are our friends!";

  return "Hmm, that’s an interesting question! 🤔 Can you try asking it in another way?";
}
