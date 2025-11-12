// Import Firebase libraries (use latest modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 🔥 Replace the below config with your actual Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyBeyp87gBo-OZljZYo3hd8516Woi94_B8g",
  authDomain: "sai2128.firebaseapp.com",
  projectId: "sai2128",
  storageBucket: "sai2128.appspot.com",
  messagingSenderId: "255118295773",
  appId: "1:255118295773:web:fdf9522edf1c73cb089134"
};

// Initialize Firebase
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Re-throw with helpful message
  throw new Error("Firebase initialization failed. Please check your configuration and ensure Authentication is enabled in Firebase Console.");
}

// Export for use in other files
export { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword };
