// src/store/session.js
import { reactive } from "vue";

export const session = reactive({
  user: null,      // Firebase User 对象（或 null）
  profile: null,   // { uid, email, role }
  get isAuthed() { return !!this.user; },
  get role() { return this.profile?.role || "user"; },
  get isAdmin() { return this.role === "admin"; },
});