<script setup>
import { reactive, computed } from "vue";
const form = reactive({ name: "", email: "", age: "" });

const errors = computed(() => {
  const e = {};
  if (!form.name.trim()) e.name = "Name is required.";
  const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  if (!form.email) e.email = "Email is required.";
  else if (!emailOK) e.email = "Email format is invalid.";
  const ageNum = Number(form.age);
  if (!form.age) e.age = "Age is required.";
  else if (Number.isNaN(ageNum)) e.age = "Age must be a number.";
  else if (ageNum < 18 || ageNum > 65) e.age = "Age must be between 18 and 65.";
  return e;
});

function submit() {
  if (Object.keys(errors.value).length) return;
  alert(`Submitted!\n${JSON.stringify(form, null, 2)}`);
}
</script>

<template>
  <h1 class="mb-3">Register</h1>
  <form @submit.prevent="submit" novalidate class="row g-3">
    <div class="col-12 col-md-6">
      <label class="form-label">Name</label>
      <input v-model.trim="form.name" class="form-control" />
      <div v-if="errors.name" class="text-danger small">{{ errors.name }}</div>
    </div>
    <div class="col-12 col-md-6">
      <label class="form-label">Email</label>
      <input v-model.trim="form.email" type="email" class="form-control" />
      <div v-if="errors.email" class="text-danger small">{{ errors.email }}</div>
    </div>
    <div class="col-12 col-md-6">
      <label class="form-label">Age</label>
      <input v-model="form.age" type="number" class="form-control" />
      <div v-if="errors.age" class="text-danger small">{{ errors.age }}</div>
    </div>
    <div class="col-12">
      <button :disabled="Object.keys(errors).length" class="btn btn-success">Submit</button>
    </div>
  </form>
</template>
