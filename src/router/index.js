// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";

// Views
import Home from "../views/Home.vue";
import Form from "../views/Form.vue";
import About from "../views/About.vue";
import AddBookView from "../views/AddBookView.vue";          // ✅ new page for Task 8.1
import FirebaseSigninView from "../views/FirebaseSigninView.vue";
import FirebaseRegisterView from "../views/FirebaseRegisterView.vue";
import Admin from "../views/Admin.vue"; // simple admin page

// Auth & Firestore
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { session } from "../store/session";

// -------------------- Routes --------------------
const routes = [
  { path: "/", name: "Home", component: Home },

  { path: "/form", name: "Form", component: Form },

  { path: "/about", name: "About", component: About },

  // ✅ Public route to add a book (for eFolio Task 8.1 screenshots)
  { path: "/addbook", name: "AddBook", component: AddBookView, meta: { public: true } },

  // Auth pages are public
  { path: "/firelogin", name: "FireLogin", component: FirebaseSigninView, meta: { public: true } },
  { path: "/fireregister", name: "FireRegister", component: FirebaseRegisterView, meta: { public: true } },

  // Admin requires admin role
  { path: "/admin", name: "Admin", component: Admin, meta: { role: "admin" } },

  // Fallback
  { path: "/:pathMatch(.*)*", redirect: "/" }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// -------------------- Auth bootstrap --------------------
// Ensure we restore Firebase auth state once (useful after hard refresh)
let authReady;
function ensureAuthReady() {
  if (authReady) return authReady;

  authReady = new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, async (u) => {
      // Keep session store in sync with Firebase auth
      session.user = u || null;
      session.profile = null;

      // If logged in, hydrate profile from Firestore "users/{uid}"
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          session.profile = snap.exists()
            ? snap.data()
            : { uid: u.uid, email: u.email, role: "user" };
        } catch (e) {
          console.error("Failed to load user profile:", e);
          session.profile = { uid: u.uid, email: u.email, role: "user" };
        }
      }

      stop();
      resolve();
    });
  });

  return authReady;
}

// -------------------- Global guard --------------------
router.beforeEach(async (to) => {
  // Allow public routes without waiting for auth
  if (to.meta?.public) return true;

  // For protected routes, make sure auth state is restored
  await ensureAuthReady();

  // If not authenticated, redirect to login and preserve destination
  if (!session.isAuthed) {
    return { name: "FireLogin", query: { next: to.fullPath } };
  }

  // If a route requires a specific role, check it
  if (to.meta?.role === "admin" && !session.isAdmin) {
    return { name: "Home" };
  }

  return true;
});

export default router;
