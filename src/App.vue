<template>
  <div id="layout">
    <!-- Show header only when not on the CountBookAPI page -->
    <NavBar v-if="showHeader" />

    <main class="container py-4">
      <!-- Routed pages are rendered here -->
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from './components/NavBar.vue';

const route = useRoute();

// Hide the header on the CountBookAPI page
const showHeader = computed(() => route.name !== 'CountBookAPI');
</script>
