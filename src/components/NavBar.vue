<template>
  <nav class="navbar navbar-dark bg-dark navbar-expand">
    <div class="container">
      <RouterLink to="/" class="navbar-brand">My Vue App</RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="mainNav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <RouterLink to="/" class="nav-link">Home</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/form" class="nav-link">Form</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/about" class="nav-link">About</RouterLink>
          </li>

          <!-- ✅ New: Add Book page -->
          <li class="nav-item">
            <RouterLink to="/addbook" class="nav-link" active-class="active">
              Add Book
            </RouterLink>
          </li>

          <!-- Show Login/Register when not authenticated -->
          <li class="nav-item" v-if="!session.isAuthed">
            <RouterLink to="/firelogin" class="nav-link">Login</RouterLink>
          </li>
          <li class="nav-item" v-if="!session.isAuthed">
            <RouterLink to="/fireregister" class="nav-link">Register</RouterLink>
          </li>

          <!-- Admin link only for admin role -->
          <li class="nav-item" v-if="session.isAdmin">
            <RouterLink to="/admin" class="nav-link">Admin</RouterLink>
          </li>

          <!-- Email + Logout when authenticated -->
          <li class="nav-item d-flex align-items-center" v-if="session.isAuthed">
            <span class="navbar-text small me-2">
              {{ session.profile?.email || session.user?.email }}
            </span>
            <button class="btn btn-sm btn-outline-light" @click="doLogout">
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
// Router is used to redirect to the login page after logout
import { useRouter } from "vue-router";
// Firebase sign-out API
import { signOut } from "firebase/auth";
// Shared Firebase instance
import { auth } from "../firebase";
// Reactive session store used by the UI
import { session } from "../store/session";

// Sign out and immediately clear local session, then redirect to login
const router = useRouter();
async function doLogout() {
  try {
    await signOut(auth); // sign out from Firebase
  } catch (e) {
    // log but do not block UI update
    console.error("signOut failed:", e);
  } finally {
    session.user = null;
    session.profile = null;
    router.push("/firelogin"); // go to login page
  }
}
</script>
