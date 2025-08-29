<script setup>
import { reactive, ref, computed } from "vue";

const form = reactive({
  name: "",
  email: "",
  age: ""
});

const touched = reactive({
  name: false,
  email: false,
  age: false
});

function markTouched(field) {
  touched[field] = true;
}

const errors = computed(() => {
  const e = {};
  // name
  if (!form.name.trim()) e.name = "Name is required.";
  // email
  const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  if (!form.email) e.email = "Email is required.";
  else if (!emailOK) e.email = "Email format is invalid.";
  // age
  const ageNum = Number(form.age);
  if (form.age === "" || form.age === null) e.age = "Age is required.";
  else if (Number.isNaN(ageNum)) e.age = "Age must be a number.";
  else if (ageNum < 18 || ageNum > 65) e.age = "Age must be between 18 and 65.";
  return e;
});

const isValid = computed(() => Object.keys(errors.value).length === 0);

function submit() {
  // mark all as touched to show errors if user clicks directly
  Object.keys(touched).forEach(k => (touched[k] = true));
  if (!isValid.value) return;
  alert(`Submitted!\n${JSON.stringify(form, null, 2)}`);
  // reset (optional)
  form.name = "";
  form.email = "";
  form.age = "";
  Object.keys(touched).forEach(k => (touched[k] = false));
}
</script>

<template>
  <section aria-labelledby="form-heading">
    <h1 id="form-heading" class="mb-3">Register</h1>

    <form @submit.prevent="submit" novalidate class="row g-3">
      <!-- Name -->
      <div class="col-12 col-md-6">
        <label class="form-label" for="name">Name</label>
        <input
          id="name"
          v-model.trim="form.name"
          class="form-control"
          :class="{ 'is-invalid': touched.name && errors.name }"
          @blur="markTouched('name')"
          aria-describedby="nameHelp nameErr"
          aria-invalid="true"
        />
        <div id="nameHelp" class="form-text">Please enter your full name.</div>
        <div
          id="nameErr"
          v-if="touched.name && errors.name"
          class="invalid-feedback d-block"
          role="alert"
          aria-live="polite"
        >
          {{ errors.name }}
        </div>
      </div>

      <!-- Email -->
      <div class="col-12 col-md-6">
        <label class="form-label" for="email">Email</label>
        <input
          id="email"
          v-model.trim="form.email"
          type="email"
          class="form-control"
          :class="{ 'is-invalid': touched.email && errors.email }"
          @blur="markTouched('email')"
          placeholder="name@example.com"
          aria-describedby="emailErr"
        />
        <div
          id="emailErr"
          v-if="touched.email && errors.email"
          class="invalid-feedback d-block"
          role="alert"
          aria-live="polite"
        >
          {{ errors.email }}
        </div>
      </div>

      <!-- Age -->
      <div class="col-12 col-md-6">
        <label class="form-label" for="age">Age</label>
        <input
          id="age"
          v-model.number="form.age"
          type="number"
          min="18"
          max="65"
          class="form-control"
          :class="{ 'is-invalid': touched.age && errors.age }"
          @blur="markTouched('age')"
          aria-describedby="ageErr"
        />
        <div
          id="ageErr"
          v-if="touched.age && errors.age"
          class="invalid-feedback d-block"
          role="alert"
          aria-live="polite"
        >
          {{ errors.age }}
        </div>
      </div>

      <!-- Submit -->
      <div class="col-12">
        <button class="btn btn-success" :disabled="!isValid">Submit</button>
      </div>
    </form>
  </section>
</template>
