const container = document.getElementById("topicsContainer");
const headerText = document.getElementById("headerText");
const backBtn = document.getElementById("backBtn");

// Get user info from localStorage (set during login)
let user = null;
try {
  const storedUser = localStorage.getItem("loggedInUser");
  if (storedUser) {
    user = JSON.parse(storedUser);
  }
} catch (e) {
  console.error("Error parsing loggedInUser:", e);
}
let userAge = user?.age;
console.log("🔍 Initial userAge from localStorage:", userAge);

// Fallback: try to get age from separate localStorage keys
if (!userAge) {
  userAge = parseInt(localStorage.getItem("userAge"));
  if (userAge) {
    // Reconstruct user object if missing
    if (!user) {
      user = { age: userAge, grade: localStorage.getItem("userGrade") };
      localStorage.setItem("loggedInUser", JSON.stringify(user));
    } else {
      user.age = userAge;
      localStorage.setItem("loggedInUser", JSON.stringify(user));
    }
  }
}

// Final fallback: try to get from Firebase if still not found
if (!userAge) {
  (async () => {
    try {
      const { auth, db } = await import("./firebase.js");
      const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
      
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data();
            userAge = userData.age;
            console.log("✅ User data fetched from Firebase:", userData);
            console.log("✅ User age:", userAge);
            
            // Store in localStorage for future use
            localStorage.setItem("userAge", userAge);
            localStorage.setItem("userGrade", userData.grade);
            const userDataLocal = { email: firebaseUser.email, age: userAge, grade: userData.grade };
            localStorage.setItem("loggedInUser", JSON.stringify(userDataLocal));
            
            // Now load topics
            loadTopics();
          } else {
            console.error("❌ User document not found in Firestore");
            alert("⚠️ User data not found in database. Please sign up again.");
            window.location.href = "index.html";
          }
        } else {
          alert("⚠️ Please log in again. Age not found!");
          window.location.href = "index.html";
        }
      });
    } catch (error) {
      console.error("Error fetching from Firebase:", error);
      alert("⚠️ Please log in again. Age not found!");
      window.location.href = "index.html";
    }
  })();
} else {
  // Age found, load topics immediately
  loadTopics();
}

// Fetch JSON data and filter by age group
async function loadTopics() {
  try {
    // Ensure we have userAge - get from localStorage if not set
    if (!userAge) {
      const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));
      userAge = storedUser?.age || parseInt(localStorage.getItem("userAge"));
    }
    
    if (!userAge) {
      container.innerHTML = "<p>Age not found. Please log in again.</p>";
      return;
    }
    
    const response = await fetch("./data/math_topics.json");
    const data = await response.json();

    console.log("🔍 Loading topics for age:", userAge);
    let ageGroup;
    if (userAge >= 5 && userAge <= 6) ageGroup = "5-6";
    else if (userAge >= 7 && userAge <= 8) ageGroup = "7-8";
    else ageGroup = "9";

    console.log("✅ Selected age group:", ageGroup);
    const topics = data[ageGroup];
    console.log("✅ Topics found:", topics);

    if (!topics || topics.length === 0) {
      container.innerHTML = "<p>No topics found for your age group 😔</p>";
      return;
    }

    headerText.textContent = `Math Topics for Age ${ageGroup} 🧮`;
    displayTopics(topics);
  } catch (error) {
    console.error("Error loading topics:", error);
    container.innerHTML = "<p>Failed to load topics 😔</p>";
  }
}

// Display the topics as clickable cards
function displayTopics(topics) {
  container.innerHTML = "";
  topics.forEach((topic) => {
    const div = document.createElement("div");
    div.className = "topic-card";
    div.innerHTML = `
      <strong>${topic.title}</strong>
      <p class="topic-desc">${topic.description}</p>
    `;
    div.addEventListener("click", () => {
      localStorage.setItem("selectedTopic", JSON.stringify(topic));
      window.location.href = "lesson.html";
    });
    container.appendChild(div);
  });
}

backBtn.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});
