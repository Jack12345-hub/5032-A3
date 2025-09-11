<template>
  <div class="container py-4 text-start">
    <h1 class="mb-3">About</h1>
    <p>
      This is a basic web application demonstrating:
      authentication with Firebase, role-based access (user/admin),
      and a rating feature with aggregated averages per class.
    </p>
    <ul>
      <li>Authentication: Email/password via Firebase Auth.</li>
      <li>Role-based access: Admin-only route and navigation link.</li>
      <li>Rating: Per-class ratings stored in Firestore with live average.</li>
      <li>Security: Client-side validation and no dangerous HTML rendering.</li>
    </ul>
  </div>
</template>

<script setup>
// No script logic needed for a static About page
</script>
