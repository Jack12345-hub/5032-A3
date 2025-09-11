// src/firebase.js
import { getApp, getApps } from "firebase/app";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 如果你已经在 main.js 初始化过（是的！），这里复用，不会重复 init
const firebaseConfig = {}; // 留空：我们只复用已初始化的 app
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
