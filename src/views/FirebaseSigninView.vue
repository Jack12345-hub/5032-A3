<template>
  <div class="container" style="max-width:480px">
    <h2>Sign in</h2>
    <form @submit.prevent="onSubmit" novalidate>
      <label class="form-label">Email</label>
      <input class="form-control" v-model.trim="email" type="email" required />
      <label class="form-label mt-2">Password</label>
      <input class="form-control" v-model="password" type="password" required />
      <button class="btn btn-primary mt-3" :disabled="loading">Sign in</button>
      <p class="text-danger mt-2" v-if="err">{{ err }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "vue-router";
import { auth, db } from "../firebase";
import { session } from "../store/session";

const router = useRouter();
const email = ref(""); 
const password = ref(""); 
const loading = ref(false); 
const err = ref("");

// Sign in and load user profile from Firestore
async function onSubmit() {
  loading.value = true; err.value = "";
  try {
    const cred = await signInWithEmailAndPassword(auth, email.value, password.value);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    session.user = cred.user;
    // Load user profile from Firestore or default to user role
    session.profile = snap.exists() ? snap.data() : { uid: cred.user.uid, email: cred.user.email, role: "user" };
    router.push("/");
  } catch (e) {
    err.value = e.message || String(e);
  } finally { 
    loading.value = false; 
  }
}
</script>
