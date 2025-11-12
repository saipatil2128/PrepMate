import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { solveDoubt } from "./doubtsolver.js";

// =============== DOM Elements ===============
const avatarContainer = document.getElementById("avatarCircle");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
let mixer;

// =============== Emoji Removal Helper ===============
function removeEmojis(text) {
  // Removes most emoji, preserves numbers, regular symbols, letters, and punctuation
  // This regex matches the vast majority of emojis
  return text.replace(/([\u203C-\u3299]|[\uD83C-\uDBFF\uDC00-\uDFFF])+|\uFE0F/g, '').replace(/[\u200D]/g, '');
}

// =============== AVATAR SETUP (Small Circle) ===============
function initAvatar() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(200, 200);
  avatarContainer.appendChild(renderer.domElement);
  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(light);
  camera.position.z = 2;
  const loader = new GLTFLoader();
  loader.load(
    "./assets/teacher.glb",
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
      console.log("✅ Avatar loaded successfully");
    },
    undefined,
    (error) => console.error("❌ Error loading avatar:", error)
  );
  function animate() {
    requestAnimationFrame(animate);
    if (mixer) mixer.update(0.01);
    renderer.render(scene, camera);
  }
  animate();
}

// =============== SPEECH SYNTHESIS ===============
function speakText(text) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.4;
    utter.volume = 1.0;
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
      const friendlyVoice =
        voices.find(v =>
          v.name.toLowerCase().includes("child") ||
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("girl")
        ) || voices.find(v => v.lang.startsWith("en"));
      if (friendlyVoice) utter.voice = friendlyVoice;
    } else {
      speechSynthesis.onvoiceschanged = () => speakText(text);
      return;
    }
    utter.onend = resolve;
    synth.cancel();
    synth.speak(utter);
  });
}

// =============== SPEECH RECOGNITION ===============
function startVoiceInput() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.start();
  recognition.onresult = (event) => {
    const question = event.results[0][0].transcript;
    input.value = question;
    sendQuestion();
  };
  recognition.onerror = (err) => {
    console.error("Voice error:", err);
  };
}

// =============== CHAT HANDLER ===============
async function sendQuestion() {
  const question = input.value.trim();
  if (!question) return;
  appendMessage("user", question);
  input.value = "";
  try {
    const reply = await solveDoubt(question);
    const cleanedReply = removeEmojis(reply);
    appendMessage("ai", cleanedReply);
    await speakText(cleanedReply);
  } catch (error) {
    let errorMsg = error.message || "Sorry, I couldn't connect to the AI assistant right now.";
    if (error.details) {
      // Handle specific error types
      if (error.details.status === 429 || error.details.error?.code === 'insufficient_quota') {
        errorMsg = "⚠️ Your OpenAI account has insufficient credits/quota.\n\n";
        errorMsg += "To fix this:\n";
        errorMsg += "1. Go to https://platform.openai.com/account/billing\n";
        errorMsg += "2. Add payment method and credits to your account\n";
        errorMsg += "3. Or check your usage limits\n\n";
        errorMsg += "Error: " + (error.details.error?.message || "Insufficient quota");
      } else if (error.details.status === 401 || error.message.includes("API key")) {
        errorMsg += "\n\n💡 To fix this:\n1. Make sure you have a .env file in your project root\n2. Add: OPENAI_API_KEY=sk-your_actual_key\n3. Restart the server (Ctrl+C then node server.js)\n4. Make sure there are no spaces around the = sign";
      }
    }
    appendMessage("ai", removeEmojis(errorMsg));
    console.error("Error solving doubt:", error);
  }
}

function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = sender === "user" ? "userMsg" : "aiMsg";
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// =============== EVENTS ===============
sendBtn.addEventListener("click", sendQuestion);
micBtn.addEventListener("click", startVoiceInput);

// Initialize avatar
initAvatar();
