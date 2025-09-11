<template>
  <div id="layout">
    <NavBar />
    <main class="container py-4">
      <!-- Routed pages render here -->
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import NavBar from "./components/NavBar.vue";
</script>