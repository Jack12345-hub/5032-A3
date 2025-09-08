import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.js";
import "bootstrap/dist/css/bootstrap.min.css";

// ---- Firebase imports ----
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration (copied from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAMhWLSmWl6pcgRhPU8TlnDQmAGSBEpsI0",
  authDomain: "week7-siyi.firebaseapp.com",
  projectId: "week7-siyi",
  storageBucket: "week7-siyi.firebasestorage.app",
  messagingSenderId: "422432926997",
  appId: "1:422432926997:web:6062c5f012459d70630d1c"
};

// Initialize Firebase
initializeApp(firebaseConfig);
// --------------------------

createApp(App).use(router).mount("#app");
