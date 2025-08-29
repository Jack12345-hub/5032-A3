import { createRouter, createWebHistory } from "vue-router";
import Home from "../pages/Home.vue";
import Form from "../pages/Form.vue";
import About from "../pages/About.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/form", component: Form },
    { path: "/about", component: About },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
