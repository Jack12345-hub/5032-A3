import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMhWLSmWl6pcgRhPU8TlnDQmAGSBEpsI0",
  authDomain: "week7-siyi.firebaseapp.com",
  projectId: "week7-siyi",
  storageBucket: "week7-siyi.firebasestorage.app",
  messagingSenderId: "422432926997",
  appId: "1:422432926997:web:6062c5f012459d70630d1c"
};

// Use existing app if it was already initialized (prevents duplicate-app error)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app; // optional