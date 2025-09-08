<!-- src/views/FirebaseSigninView.vue -->
<template>
  <div class="container" style="max-width: 420px;">
    <h2 class="mt-4 mb-3">Sign in</h2>

    <div class="mb-3">
      <input
        v-model="email"
        type="email"
        class="form-control"
        placeholder="Email"
      />
    </div>

    <div class="mb-3">
      <input
        v-model="password"
        type="password"
        class="form-control"
        placeholder="Password"
      />
    </div>

    <div class="d-flex gap-2 mb-2">
      <button class="btn btn-primary" @click="signin">Sign in via Firebase</button>
      <RouterLink class="btn btn-outline-secondary ms-auto" to="/fireregister">Go to Register</RouterLink>
    </div>

    <p v-if="error" class="text-danger">Error: {{ error }}</p>
    <p v-if="user" class="text-success">Signed in as: <strong>{{ user.email }}</strong></p>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter, RouterLink } from "vue-router"
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth"

const email = ref("")
const password = ref("")
const error = ref("")
const user = ref(null)

const router = useRouter()
const auth = getAuth()

// keep UI synchronized with the current authentication state
onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    user.value = u
    if (u) console.log("Current user:", u) // log the current signed-in user
  })
})

async function signin() {
  error.value = ""
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    console.log("Firebase Sign-in Successful!")
    console.log("auth.currentUser:", auth.currentUser) // log the current user object
    router.push("/") // redirect to Home after successful login
  } catch (e) {
    console.error(e)
    error.value = e.code || e.message // show error message if sign-in fails
  }
}
</script>
