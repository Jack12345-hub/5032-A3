import { createRouter, createWebHistory } from "vue-router";

// Existing pages (now in "views")
import Home from "../views/Home.vue";
import Form from "../views/Form.vue";
import About from "../views/About.vue";

// Firebase pages
import FirebaseSigninView from "../views/FirebaseSigninView.vue";
import FirebaseRegisterView from "../views/FirebaseRegisterView.vue";

const routes = [
  { path: "/", name: "Home", component: Home },
  { path: "/form", name: "Form", component: Form },
  { path: "/about", name: "About", component: About },
  { path: "/firelogin", name: "FireLogin", component: FirebaseSigninView },
  { path: "/fireregister", name: "FireRegister", component: FirebaseRegisterView },
  { path: "/:pathMatch(.*)*", redirect: "/" }, // catch-all
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;