<template>
  <div class="container mt-4" style="max-width: 400px;">
    <h2>Create an Account</h2>

    <!-- Email input -->
    <div class="mb-3">
      <input
        type="email"
        class="form-control"
        placeholder="Email"
        v-model="email"
      />
    </div>

    <!-- Password input -->
    <div class="mb-3">
      <input
        type="password"
        class="form-control"
        placeholder="Password"
        v-model="password"
      />
    </div>

    <!-- Register button -->
    <div class="d-grid">
      <button class="btn btn-primary" @click="register">Save to Firebase</button>
    </div>

    <!-- Error message -->
    <p v-if="error" class="text-danger mt-2">Error: {{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { useRouter } from "vue-router"

// form values
const email = ref("")
const password = ref("")
const error = ref("")

// router for redirect after register
const router = useRouter()
const auth = getAuth()

// register function
const register = () => {
  error.value = ""
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .then((data) => {
      console.log("Firebase Register Successful!", data)
      // redirect to login page after success
      router.push("/firelogin")
    })
    .catch((err) => {
      console.error("Firebase Register Error:", err.code)
      error.value = err.code
    })
}
</script>
