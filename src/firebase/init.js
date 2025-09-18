// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Export Firestore instance
export default db;