// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";

// Views
import Home from "../views/Home.vue";
import Form from "../views/Form.vue";
import About from "../views/About.vue";
import AddBookView from "../views/AddBookView.vue";          // ✅ Task 8.1 page
import FirebaseSigninView from "../views/FirebaseSigninView.vue";
import FirebaseRegisterView from "../views/FirebaseRegisterView.vue";
import Admin from "../views/Admin.vue"; // Simple admin page
import GetBookCountView from "../views/GetBookCountView.vue"; // ✅ NEW: 9.2/9.3 Book counter page
import WeatherView from "../views/WeatherView.vue"; // ← Newly added
import CountBookAPI from "../views/CountBookAPI.vue";
import GetAllBookAPI from "../views/GetAllBookAPI.vue";

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

  // ✅ Public route for adding a book (for eFolio Task 8.1 screenshots)
  { path: "/addbook", name: "AddBook", component: AddBookView, meta: { public: true } },

  // ✅ NEW: Book counter page (9.2/9.3). Public for testing before login or Cloud Function setup
  { path: "/GetBookCount", name: "GetBookCount", component: GetBookCountView, meta: { public: true } },

  // Public authentication pages
  { path: "/firelogin", name: "FireLogin", component: FirebaseSigninView, meta: { public: true } },
  { path: "/fireregister", name: "FireRegister", component: FirebaseRegisterView, meta: { public: true } },

  // Admin route requires admin role
  { path: "/admin", name: "Admin", component: Admin, meta: { role: "admin" } },

  {
    path: "/WeatherCheck",   // ← Consistent with course material
    name: "WeatherCheck",
    component: WeatherView,
    meta: { public: true },
  },

  {
    path: "/CountBookAPI",
    name: "CountBookAPI",
    component: CountBookAPI,
    meta: { public: true }, // ← Public for easy access by tutors for screenshots
  },

  {
    path: "/GetAllBookAPI",
    name: "GetAllBookAPI",
    component: GetAllBookAPI,
    meta: { public: true }, // or meta: { public: true, hideHeader: true } if you want to hide the header
  },

  // Fallback route for unknown paths
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// -------------------- Auth Initialization --------------------
// Ensures Firebase authentication state is restored (useful after a hard refresh)
let authReady;
function ensureAuthReady() {
  if (authReady) return authReady;

  authReady = new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, async (u) => {
      // Keep the session store synchronized with Firebase authentication state
      session.user = u || null;
      session.profile = null;

      // If logged in, fetch user profile from Firestore "users/{uid}"
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

// -------------------- Global Route Guard --------------------
router.beforeEach(async (to) => {
  // Allow access to all public routes without authentication
  if (to.meta?.public) return true;

  // Wait for Firebase auth state before accessing protected routes
  await ensureAuthReady();

  // Redirect unauthenticated users to the login page, keeping their intended destination
  if (!session.isAuthed) {
    return { name: "FireLogin", query: { next: to.fullPath } };
  }

  // Check role-based access (e.g., admin)
  if (to.meta?.role === "admin" && !session.isAdmin) {
    return { name: "Home" };
  }

  return true;
});

export default router;
