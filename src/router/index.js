import { createRouter, createWebHistory } from "vue-router";

// Existing pages
import Home from "../pages/Home.vue";
import Form from "../pages/Form.vue";
import About from "../pages/About.vue";

// New Firebase Sign-in page
import FirebaseSigninView from "../pages/FirebaseSigninView.vue";

const routes = [
  { path: "/", name: "Home", component: Home },
  { path: "/form", name: "Form", component: Form },
  { path: "/about", name: "About", component: About },
  { path: "/firelogin", name: "FireLogin", component: FirebaseSigninView },
  { path: "/:pathMatch(.*)*", redirect: "/" }, // Catch-all route (redirect unknown paths to Home)
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
