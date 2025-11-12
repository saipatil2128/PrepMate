import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { generateGeminiText } from "./gemini.js";

// =============== GLOBALS ===============
let scene, camera, renderer, mixer;
const clock = new THREE.Clock();
let lessonTextEl, lessonTitleEl, videoContainer, startLessonBtn;
let lessonInProgress = false;

// =============== 3D AVATAR SETUP ===============
function initAvatar() {
  const container = document.getElementById("avatarContainer");
  if (!container) {
    console.error("❌ Avatar container not found");
    return;
  }
  scene = new THREE.Scene();
  const width = container.clientWidth || 400;
  const height = container.clientHeight || 600;
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 1.4, 2.8);
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);
  window.addEventListener("resize", () => {
    const newWidth = container.clientWidth || 400;
    const newHeight = container.clientHeight || 600;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  });
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 2.5);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(0, 3, 3);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-2, 2, 2);
  scene.add(fillLight);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const loader = new GLTFLoader();
  loader.load(
    "./assets/teacher.glb",
    (gltf) => {
      const model = gltf.scene;
      model.position.set(0, -0.4, 0);
      model.scale.set(1.4, 1.4, 1.4);
      model.rotation.x = -0.15;
      scene.add(model);
      camera.lookAt(0, 0.7, 0);

      mixer = new THREE.AnimationMixer(model);
      if (gltf.animations.length > 0) {
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
        action.setLoop(THREE.LoopRepeat);
      }
    },
    undefined,
    (error) => console.error("❌ Error loading avatar:", error)
  );
}

// =============== ANIMATION LOOP ===============
function animate() {
  requestAnimationFrame(animate);
  if (renderer && scene && camera) {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
  }
}

function startTalking() {
  if (mixer && mixer._actions && mixer._actions.length > 0) {
    const action = mixer._actions[0];
    action.reset();
    action.play();
    action.setLoop(THREE.LoopRepeat);
    action.paused = false; // Ensure animation unpaused when talking starts
  }
}

function stopTalking() {
  if (mixer && mixer._actions && mixer._actions.length > 0) {
    const action = mixer._actions[0];
    action.paused = true; // PAUSE animation when speech ends
  }
}

// =============== TEXT-TO-SPEECH ===============
function speakText(text) {
  return new Promise((resolve) => {
    function actuallySpeak() {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.09;
      utterance.pitch = 1.9;
      utterance.volume = 1.0;
      const voices = speechSynthesis.getVoices();
      if (voices.length) {
        const friendlyVoice =
          voices.find(
            v =>
              v.name.toLowerCase().includes("child") ||
              v.name.toLowerCase().includes("girl") ||
              v.name.toLowerCase().includes("soft") ||
              v.name.toLowerCase().includes("female")
          ) || voices.find(v => v.lang.startsWith("en"));
        if (friendlyVoice) utterance.voice = friendlyVoice;
      }
      utterance.onstart = () => { startTalking(); };
      utterance.onend = () => { stopTalking(); resolve(); };
      speechSynthesis.speak(utterance);
    }
    if (speechSynthesis.getVoices().length === 0) {
      const once = () => {
        speechSynthesis.removeEventListener('voiceschanged', once);
        actuallySpeak();
      };
      speechSynthesis.addEventListener('voiceschanged', once);
    } else {
      actuallySpeak();
    }
  });
}

// =============== LESSON FLOW ===============
async function startLesson() {
  if (lessonInProgress) return;
  lessonInProgress = true;
  startLessonBtn.disabled = true;

  lessonTextEl.textContent = "";

  const selectedTopic = JSON.parse(localStorage.getItem("selectedTopic"));
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  if (!selectedTopic) {
    lessonTitleEl.textContent = "No topic selected. Please go back and select a topic.";
    startLessonBtn.disabled = false;
    lessonInProgress = false;
    return;
  }

  const topicTitle = selectedTopic?.title || "Today's Lesson";
  lessonTitleEl.textContent = topicTitle;
  const ageGroup = user?.age <= 6 ? "5-6" : user?.age <= 8 ? "7-8" : "9";

  try {
    const res = await fetch("./data/math_topics.json");
    const data = await res.json();
    const topicData = data[ageGroup]?.find(t => t.id === selectedTopic.id);

    if (!topicData) {
      lessonTitleEl.textContent = "Sorry, no lesson found for this topic.";
      startLessonBtn.disabled = false;
      lessonInProgress = false;
      return;
    }

    if (!videoContainer) {
      lessonTitleEl.textContent = "Error: Video container not found.";
      startLessonBtn.disabled = false;
      lessonInProgress = false;
      return;
    }
    videoContainer.innerHTML = "";

    if (topicData.video) {
      if (topicData.video.includes("youtube.com") || topicData.video.includes("youtu.be")) {
        const iframe = document.createElement("iframe");
        iframe.src = topicData.video;
        iframe.width = "100%";
        iframe.height = "100%";
        iframe.frameBorder = "0";
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.style.borderRadius = "15px";
        videoContainer.appendChild(iframe);
      } else {
        const video = document.createElement("video");
        video.src = topicData.video;
        video.controls = false;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.borderRadius = "15px";
        videoContainer.appendChild(video);
      }
    }

    const scriptText =
      topicData.script ||
      topicData.prompt ||
      topicData.description ||
      "Let's learn together!";

    const videoElement = videoContainer.querySelector("video");
    if (videoElement) {
      try {
        videoElement.currentTime = 0;
        await videoElement.play();
      } catch (err) {
        console.warn("⚠️ Autoplay blocked, user can click play manually.");
      }
    }

    await speakText(scriptText);

    console.log("🎬 Lesson completed!");
  } catch (error) {
    lessonTitleEl.textContent = "Error loading the lesson. Please try again.";
    startLessonBtn.disabled = false;
  }
  lessonInProgress = false;
}

// =============== EVENT BINDINGS & DOM INIT ===============
document.addEventListener("DOMContentLoaded", () => {
  lessonTextEl = document.getElementById("lessonText");
  lessonTitleEl = document.getElementById("lessonTitle");
  videoContainer = document.getElementById("videoContainer");
  startLessonBtn = document.getElementById("startLessonBtn");

  if (startLessonBtn) {
    startLessonBtn.addEventListener("click", startLesson);
  }

  const goToDoubtBtn = document.getElementById("goToDoubtBtn");
  if (goToDoubtBtn) {
    goToDoubtBtn.addEventListener("click", () => {
      window.location.href = "doubts.html";
    });
  }

  initAvatar();
  animate();
});
