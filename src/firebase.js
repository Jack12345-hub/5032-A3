// src/firebase.js
import { getApp, getApps } from "firebase/app";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// If Firebase has already been initialized in main.js (which it has),
// reuse the existing app instance to avoid re-initialization
const firebaseConfig = {}; // Leave empty: we only reuse the initialized app
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);