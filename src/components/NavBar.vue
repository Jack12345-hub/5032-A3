<template>
  <nav class="navbar navbar-dark bg-dark navbar-expand">
    <div class="container">
      <RouterLink to="/" class="navbar-brand">My Vue App</RouterLink>
      <ul class="navbar-nav ms-auto">
        <li class="nav-item"><RouterLink to="/" class="nav-link">Home</RouterLink></li>
        <li class="nav-item"><RouterLink to="/form" class="nav-link">Form</RouterLink></li>
        <li class="nav-item"><RouterLink to="/about" class="nav-link">About</RouterLink></li>

        <!-- If no user is logged in -->
        <template v-if="!user">
          <li class="nav-item"><RouterLink to="/firelogin" class="nav-link">Login</RouterLink></li>
          <li class="nav-item"><RouterLink to="/fireregister" class="nav-link">Register</RouterLink></li>
        </template>

        <!-- If user is logged in -->
        <template v-else>
          <li class="nav-item">
            <span class="navbar-text text-white me-2">
              Signed in as: <strong>{{ user.email }}</strong>
            </span>
          </li>
          <li class="nav-item">
            <button class="btn btn-outline-light btn-sm" @click="logout">Logout</button>
          </li>
        </template>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const user = ref(null);
const auth = getAuth();

// keep UI in sync with auth state
onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    user.value = u;
  });
});

// logout function
function logout() {
  signOut(auth)
    .then(() => {
      console.log("User signed out");
      console.log("auth.currentUser after logout:", auth.currentUser); // should be null
    })
    .catch((error) => {
      console.error("Logout error:", error);
    });
}
</script>
