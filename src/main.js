// src/main.js
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.js";
import "bootstrap/dist/css/bootstrap.min.css";

// ---- Firebase imports ----
import { getApp, getApps, initializeApp } from "firebase/app";

// Firebase configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAMhWLSmWl6pcgRhPU8TlnDQmAGSBEpsI0",
  authDomain: "week7-siyi.firebaseapp.com",
  projectId: "week7-siyi",
  storageBucket: "week7-siyi.appspot.com", // ✅ corrected
  messagingSenderId: "422432926997",
  appId: "1:422432926997:web:6062c5f012459d70630d1c"
};

// Initialize Firebase only once
if (!getApps().length) {
  initializeApp(firebaseConfig);
} else {
  getApp();
}

// --------------------------

// Create and mount Vue app
createApp(App).use(router).mount("#app");
