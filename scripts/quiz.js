import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let currentQuiz = [];
let selectedAge = "";
let selectedTopic = "";
let user = JSON.parse(localStorage.getItem("loggedInUser") || "{}");

const ageSelect = document.getElementById("ageSelect");
const topicSelect = document.getElementById("topicSelect");
const startQuizBtn = document.getElementById("startQuizBtn");
const quizArea = document.getElementById("quizArea");
const quizTitle = document.getElementById("quizTitle");
const questionBox = document.getElementById("questionBox");
const submitQuizBtn = document.getElementById("submitQuizBtn");
const resultBox = document.getElementById("resultBox");

// Load topics dynamically
ageSelect.addEventListener("change", async () => {
  selectedAge = ageSelect.value;
  topicSelect.innerHTML = "<option value=''>--Select--</option>";

  if (!selectedAge) return;
  const res = await fetch("./data/math_topic.json");
  const data = await res.json();
  const topics = data[selectedAge];
  topics.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title;
    topicSelect.appendChild(opt);
  });
});

// Start quiz
startQuizBtn.addEventListener("click", async () => {
  selectedTopic = topicSelect.value;
  if (!selectedAge || !selectedTopic) {
    alert("Please select both age and topic!");
    return;
  }

  const res = await fetch("./data/quizzes.json");
  const data = await res.json();
  currentQuiz = data[selectedAge]?.[selectedTopic] || [];

  if (!currentQuiz.length) {
    alert("No quiz found for this topic!");
    return;
  }

  quizTitle.textContent = `Quiz: ${selectedTopic.toUpperCase()}`;
  questionBox.innerHTML = currentQuiz
    .map(
      (q, i) => `
    <div class="question-block">
      <p><strong>Q${i + 1}.</strong> ${q.question}</p>
      ${q.options
        .map(
          opt => `
        <label>
          <input type="radio" name="q${i}" value="${opt}" /> ${opt}
        </label>
      `
        )
        .join("")}
    </div>`
    )
    .join("");

  document.getElementById("quizSetup").style.display = "none";
  quizArea.style.display = "block";
});

// Submit quiz
submitQuizBtn.addEventListener("click", async () => {
  const answers = document.querySelectorAll("input[type=radio]:checked");
  let score = 0;
  let feedback = "";

  currentQuiz.forEach((q, i) => {
    const selected = [...answers].find(a => a.name === `q${i}`);
    if (selected && selected.value === q.answer) {
      score++;
    } else {
      feedback += `<p>❌ Q${i + 1}: ${q.hint}</p>`;
    }
  });

  // Save to Firestore
  await addDoc(collection(db, "quizResults"), {
    userId: user?.email || "guest",
     name: user?.name || "", // <-- Name is now saved!
    ageGroup: selectedAge,
    topicId: selectedTopic,
    score,
    total: currentQuiz.length,
    timestamp: serverTimestamp()
  });

  quizArea.style.display = "none";
  resultBox.style.display = "block";
  resultBox.innerHTML = `
    <h3>Your Score: ${score}/${currentQuiz.length}</h3>
    <div>${feedback || "<p>🎉 Great work! You got all correct!</p>"}</div>
    <button onclick="window.location.reload()">Take Another Quiz</button>
  `;
});
