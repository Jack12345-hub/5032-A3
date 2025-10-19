<template>
  <!-- Skip link: allow keyboard users to jump to main content -->
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <nav class="navbar navbar-dark bg-dark navbar-expand" role="navigation" aria-label="Main navigation">
    <div class="container">
      <RouterLink to="/" class="navbar-brand" aria-label="Go to Home">My Gym App</RouterLink>

      <!-- Toggler: keep aria-expanded in sync -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        :aria-expanded="isExpanded ? 'true' : 'false'"
        aria-controls="mainNav"
        aria-label="Toggle navigation menu"
        @click="toggleExpanded"
      >
        <span class="navbar-toggler-icon" aria-hidden="true"></span>
      </button>

      <div id="mainNav" class="collapse navbar-collapse" ref="navCollapse">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <RouterLink to="/" class="nav-link" @click="collapseIfMobile">Home</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink to="/members" class="nav-link" @click="collapseIfMobile">Members</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink to="/classes" class="nav-link" @click="collapseIfMobile">Classes</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink to="/form" class="nav-link" @click="collapseIfMobile">Form</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink to="/about" class="nav-link" @click="collapseIfMobile">About</RouterLink>
          </li>

          <!-- Gym Map -->
          <li class="nav-item">
            <RouterLink
              to="/map"
              class="nav-link"
              aria-label="Open Gym Map showing nearby gyms"
              @click="collapseIfMobile"
            >
              🗺️ Gym Map
            </RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink to="/book" class="nav-link" @click="collapseIfMobile">Book</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink to="/analytics" class="nav-link" @click="collapseIfMobile">Analytics</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink to="/public-classes" class="nav-link" @click="collapseIfMobile">Public API</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink :to="{ name: 'email-test' }" class="nav-link" @click="collapseIfMobile">Email Test</RouterLink>
          </li>

          <!-- Login / Register -->
          <li class="nav-item" v-if="!session.isAuthed">
            <RouterLink to="/firelogin" class="nav-link" @click="collapseIfMobile">Login</RouterLink>
          </li>
          <li class="nav-item" v-if="!session.isAuthed">
            <RouterLink to="/fireregister" class="nav-link" @click="collapseIfMobile">Register</RouterLink>
          </li>

          <!-- Admin -->
          <li class="nav-item" v-if="session.isAdmin">
            <RouterLink to="/admin" class="nav-link" @click="collapseIfMobile">Admin</RouterLink>
          </li>

          <!-- Logged-in state -->
          <li class="nav-item d-flex align-items-center" v-if="session.isAuthed">
            <span class="navbar-text small me-2" role="status" aria-live="polite">
              {{ session.profile?.email || session.user?.email }}
            </span>
            <button class="btn btn-sm btn-outline-light" type="button" @click="doLogout">
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { session } from "../store/session";

const router = useRouter();
const isExpanded = ref(false);
const navCollapse = ref(null);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

// On mobile, collapse the navbar after clicking a nav item
function collapseIfMobile() {
  if (!navCollapse.value) return;
  const hasShow = navCollapse.value.classList.contains("show");
  if (hasShow) {
    const btn = document.querySelector('[data-bs-target="#mainNav"]');
    btn?.click();
    isExpanded.value = false;
  }
}

async function doLogout() {
  try { await signOut(auth); } catch (e) { console.error("signOut failed:", e); }
  finally {
    session.user = null;
    session.profile = null;
    router.push("/firelogin");
  }
}

onMounted(() => {
  isExpanded.value = false;
});
</script>

<style scoped>
/* Visible keyboard focus (WCAG 2.4.7) */
.nav-link:focus,
.navbar-brand:focus,
.btn:focus,
.navbar-toggler:focus {
  outline: 3px solid #ffc107; /* high-contrast yellow */
  outline-offset: 2px;
}

/* Skip link (WCAG 2.4.1) */
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: #000;
  color: #fff;
  padding: 8px 12px;
  z-index: 1000;
}
.skip-link:focus {
  left: 8px;
  border-radius: 6px;
  text-decoration: none;
}

/* Current link can be auto-marked via aria-current="page"; customize style below */
.nav-link[aria-current="page"] {
  text-decoration: underline;
}
</style>
