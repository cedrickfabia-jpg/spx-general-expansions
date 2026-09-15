import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web config is public by design; it is not a secret.
const firebaseConfig = {
  apiKey: "AIzaSyAAxjmPh4ueSb2cjJOZ7qlZJOY1EjVQWak",
  authDomain: "spx-general-expansions.firebaseapp.com",
  projectId: "spx-general-expansions",
  storageBucket: "spx-general-expansions.firebasestorage.app",
  messagingSenderId: "124131121925",
  appId: "1:124131121925:web:06eb5dc8f84779e26df56c",
  measurementId: "G-8JF1T3935B"
};

export const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
