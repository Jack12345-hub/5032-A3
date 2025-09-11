<template>
  <div class="container py-4 text-start" style="max-width: 640px">
    <h1 class="mb-3">Feedback Form</h1>
    <form @submit.prevent="submit" novalidate>
      <div class="mb-3">
        <label class="form-label">Your name</label>
        <input
          v-model.trim="form.name"
          class="form-control"
          required
          minlength="2"
          maxlength="40"
          placeholder="e.g., Alex"
        />
        <div class="form-text">2–40 characters.</div>
      </div>

      <div class="mb-3">
        <label class="form-label">Email</label>
        <input
          v-model.trim="form.email"
          class="form-control"
          type="email"
          required
          placeholder="name@example.com"
        />
      </div>

      <div class="mb-3">
        <label class="form-label">Message</label>
        <textarea
          v-model="form.message"
          class="form-control"
          rows="4"
          maxlength="300"
          placeholder="Write your message (no HTML)"
        ></textarea>
        <div class="form-text d-flex justify-content-between">
          <span>Preview (safe):</span>
          <span class="text-muted">{{ form.message.length }}/300</span>
        </div>
        <!-- Safe preview using plain text interpolation -->
        <div class="border rounded p-2 small bg-light mt-1">
          {{ form.message }}
        </div>
      </div>

      <button class="btn btn-primary">Submit</button>
      <span class="ms-2 text-success" v-if="ok">Submitted.</span>
      <span class="ms-2 text-danger" v-if="err">{{ err }}</span>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";

// Local form state with basic client-side validation
const form = ref({
  name: "",
  email: "",
  message: "",
});

const ok = ref(false);
const err = ref("");

// Demo-only: persist to localStorage to avoid backend code
function submit() {
  ok.value = false;
  err.value = "";

  // Minimal runtime validation
  if (!form.value.name || form.value.name.length < 2) {
    err.value = "Name is too short.";
    return;
  }
  if (!form.value.email) {
    err.value = "Email is required.";
    return;
  }
  // Store safely as plain JSON (no HTML rendering)
  const list = JSON.parse(localStorage.getItem("feedback_v1") || "[]");
  list.push({
    name: form.value.name,
    email: form.value.email,
    message: form.value.message,
    at: new Date().toISOString(),
  });
  localStorage.setItem("feedback_v1", JSON.stringify(list));
  ok.value = true;
}
</script>
