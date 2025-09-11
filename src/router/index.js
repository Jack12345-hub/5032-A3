import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import Form from "../views/Form.vue";
import About from "../views/About.vue";
import FirebaseSigninView from "../views/FirebaseSigninView.vue";
import FirebaseRegisterView from "../views/FirebaseRegisterView.vue";
import Admin from "../views/Admin.vue"; // simple admin page
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { session } from "../store/session";

const routes = [
  { path: "/", name: "Home", component: Home },
  { path: "/form", name: "Form", component: Form },
  { path: "/about", name: "About", component: About },
  { path: "/firelogin", name: "FireLogin", component: FirebaseSigninView, meta: { public: true } },
  { path: "/fireregister", name: "FireRegister", component: FirebaseRegisterView, meta: { public: true } },
  { path: "/admin", name: "Admin", component: Admin, meta: { role: "admin" } },   // requires admin role
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({ history: createWebHistory(), routes });

// Wait for authentication state to restore once (e.g., after page refresh)
let authReady;
function ensureAuthReady() {
  if (authReady) return authReady;
  authReady = new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, async (u) => {
      session.user = u || null;
      session.profile = null;
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        session.profile = snap.exists() ? snap.data() : { uid: u.uid, email: u.email, role: "user" };
      }
      stop();
      resolve();
    });
  });
  return authReady;
}

router.beforeEach(async (to) => {
  await ensureAuthReady();
  if (to.meta?.public) return true;
  if (!session.isAuthed) return { name: "FireLogin", query: { next: to.fullPath } };
  if (to.meta?.role === "admin" && !session.isAdmin) return { name: "Home" };
  return true;
});

export default router;
