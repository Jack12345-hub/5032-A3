// src/store/session.js
import { reactive } from "vue";

export const session = reactive({
  user: null,      // Firebase User object (or null)
  profile: null,   // { uid, email, role }
  get isAuthed() { return !!this.user; },         // whether the user is authenticated
  get role() { return this.profile?.role || "user"; }, // current role, default is "user"
  get isAdmin() { return this.role === "admin"; },    // true if role is admin
});