import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ========== SIGN UP ==========
document.getElementById("signupBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Signup successful!");
    window.location.href = "dashboard.html";
  } catch (error) {
    alert(error.message);
  }
});

// ========== LOGIN ==========
document.getElementById("loginBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful!");
    window.location.href = "dashboard.html";
  } catch (error) {
    alert(error.message);
  }
});

// ========== CHECK USER STATE ==========
onAuthStateChanged(auth, (user) => {
  if (window.location.pathname.includes("dashboard.html") && !user) {
    // If user not logged in and tries to open dashboard directly
    window.location.href = "index.html";
  }
});

// ========== LOGOUT ==========
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out!");
  window.location.href = "index.html";
});
