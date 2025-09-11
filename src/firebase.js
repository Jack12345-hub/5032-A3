// src/firebase.js
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Ensure a Firebase app exists.
 * - If main.js has already initialized Firebase, reuse that instance.
 * - If this file is imported before main.js (e.g., via router), initialize here.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAMhWLSmWl6pcgRhPU8TlnDQmAGSBEpsI0",
  authDomain: "week7-siyi.firebaseapp.com",
  projectId: "week7-siyi",
  storageBucket: "week7-siyi.appspot.com", // correct bucket domain
  messagingSenderId: "422432926997",
  appId: "1:422432926997:web:6062c5f012459d70630d1c"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export commonly used Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
