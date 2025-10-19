<template>
  <!-- Main content landmark, used for “Skip to main content” navigation -->
  <main id="main-content" class="container py-4 text-start" style="max-width: 640px"
        aria-labelledby="form-title">
    <h1 id="form-title" class="mb-3">Feedback Form</h1>

    <!-- aria-describedby links to overall instructions (optional) -->
    <p id="form-help" class="visually-hidden">
      Required fields are marked and errors will be announced.
    </p>

    <form @submit.prevent="submit" novalidate aria-describedby="form-help">
      <!-- Name -->
      <div class="mb-3">
        <label class="form-label" for="name">Your name</label>
        <input
          id="name"
          v-model.trim="form.name"
          class="form-control"
          required
          minlength="2"
          maxlength="40"
          autocomplete="name"
          placeholder="e.g., Alex"
          :aria-invalid="Boolean(errors.name)"
          aria-describedby="name-help name-error"
        />
        <div id="name-help" class="form-text">2–40 characters.</div>
        <div v-if="errors.name"
             id="name-error"
             class="text-danger small mt-1"
             role="alert"
             aria-live="assertive">
          {{ errors.name }}
        </div>
      </div>

      <!-- Email -->
      <div class="mb-3">
        <label class="form-label" for="email">Email</label>
        <input
          id="email"
          v-model.trim="form.email"
          class="form-control"
          type="email"
          required
          autocomplete="email"
          placeholder="name@example.com"
          :aria-invalid="Boolean(errors.email)"
          aria-describedby="email-error"
        />
        <div v-if="errors.email"
             id="email-error"
             class="text-danger small mt-1"
             role="alert"
             aria-live="assertive">
          {{ errors.email }}
        </div>
      </div>

      <!-- Message -->
      <div class="mb-3">
        <label class="form-label" for="message">Message</label>
        <textarea
          id="message"
          v-model="form.message"
          class="form-control"
          rows="4"
          maxlength="300"
          placeholder="Write your message (no HTML)"
          aria-describedby="message-help message-count"
        ></textarea>
        <div id="message-help" class="form-text d-flex justify-content-between">
          <span>Preview (safe):</span>
          <span id="message-count" class="text-muted">{{ form.message.length }}/300</span>
        </div>
        <div class="border rounded p-2 small bg-light mt-1" aria-live="polite">
          {{ form.message }}
        </div>
      </div>

      <button class="btn btn-primary" type="submit">Submit</button>
      <span class="ms-2 text-success" v-if="ok" role="status" aria-live="polite">Submitted.</span>
      <span class="ms-2 text-danger" v-if="err" role="alert" aria-live="assertive">{{ err }}</span>
    </form>
  </main>
</template>

<script setup>
import { reactive, ref } from "vue";

const form = reactive({ name: "", email: "", message: "" });
const ok = ref(false);
const err = ref("");
const errors = reactive({ name: "", email: "" });

function submit() {
  ok.value = false;
  err.value = "";
  errors.name = "";
  errors.email = "";

  // Basic validation (with screen reader announcements)
  if (!form.name || form.name.length < 2) {
    errors.name = "Please enter at least 2 characters for your name.";
  }
  if (!form.email) {
    errors.email = "Email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (errors.name || errors.email) {
    err.value = "Please fix the errors above.";
    return;
  }

  // Demo: save locally
  const list = JSON.parse(localStorage.getItem("feedback_v1") || "[]");
  list.push({ ...form, at: new Date().toISOString() });
  localStorage.setItem("feedback_v1", JSON.stringify(list));
  ok.value = true;
}
</script>

<style scoped>
/* Visible focus and minimum contrast (WCAG 1.4.3 / 2.4.7) */
.form-control:focus, .btn:focus {
  outline: 3px solid #ffcc00;
  outline-offset: 2px;
}

/* Screen reader accessible but visually hidden (WCAG utility class) */
.visually-hidden {
  position: absolute !important;
  height: 1px; width: 1px;
  overflow: hidden; clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap; border: 0; padding: 0; margin: -1px;
}
</style>
