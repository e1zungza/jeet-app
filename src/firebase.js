import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCk3PXg5KC8hoXMKc7SBZudfN5yJAUiCOI",
  authDomain: "jeet-education-833f6.firebaseapp.com",
  projectId: "jeet-education-833f6",
  storageBucket: "jeet-education-833f6.firebasestorage.app",
  messagingSenderId: "895158913294",
  appId: "1:895158913294:web:abf9729c397a171c0f6f5f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);