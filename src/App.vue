<template>
  <NavBar />
  <main class="container py-4">
    <router-view />
  </main>
</template>
<script setup>
import NavBar from "./components/NavBar.vue";
</script>