<template>
  <nav class="navbar navbar-dark bg-dark navbar-expand">
    <div class="container">
      <RouterLink to="/" class="navbar-brand">My Vue App</RouterLink>
      <ul class="navbar-nav ms-auto">
        <li class="nav-item"><RouterLink to="/" class="nav-link">Home</RouterLink></li>
        <li class="nav-item"><RouterLink to="/form" class="nav-link">Form</RouterLink></li>
        <li class="nav-item"><RouterLink to="/about" class="nav-link">About</RouterLink></li>
        <!-- New Firebase Login link -->
        <li class="nav-item"><RouterLink to="/firelogin" class="nav-link">Firebase Login</RouterLink></li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from "vue-router";
</script>
