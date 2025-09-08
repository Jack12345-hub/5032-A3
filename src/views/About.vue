<template>
  <section class="container py-4">
    <h1 class="mb-3">About</h1>
    <p class="text-muted">FIT5032 A1.2 – Basic App Dev (V1)</p>

    <!-- Tech Stack -->
    <h5 class="mt-4">Tech Stack</h5>
    <ul>
      <li>Vue 3 + Vite (modern build setup)</li>
      <li>Vue Router (multi-page navigation)</li>
      <li>Bootstrap 5 (responsive grid & UI styling)</li>
      <li>Fetch API (asynchronous JSON data loading)</li>
    </ul>

    <!-- Business Requirements Mapping -->
    <h5 class="mt-4">Business Requirements Mapping</h5>
    <ul>
      <li><strong>BR (A.1)</strong>: Vue 3 project structure, Router, modular components (NavBar)</li>
      <li><strong>BR (A.2)</strong>: Responsive design with Bootstrap grid (tested on &lt;576px, 576–768px, 992–1200px, &gt;1400px)</li>
      <li><strong>BR (B.1)</strong>: Form page with validations (required fields, email format, age range, real-time feedback)</li>
      <li><strong>BR (B.2)</strong>: Home page loads class list from external JSON file via Fetch API, with search & sorting</li>
    </ul>

    <!-- Run Instructions -->
    <h5 class="mt-4">How to Run</h5>
    <pre class="bg-light p-3 rounded border">
npm install
npm run dev
    </pre>

    <!-- GitHub Repo -->
    <p class="mt-3">
      GitHub: 
      <a href="https://github.com/Jack12345-hub/5032-A1.2" target="_blank" rel="noopener">
        Jack12345-hub/5032-A1.2
      </a>
    </p>
  </section>
</template>
