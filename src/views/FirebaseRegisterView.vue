<template>
  <div class="container" style="max-width:480px">
    <h2>Register</h2>
    <form @submit.prevent="onSubmit" novalidate>
      <label class="form-label">Email</label>
      <input class="form-control" v-model.trim="email" type="email" required />

      <label class="form-label mt-2">Password</label>
      <input class="form-control" v-model="password" type="password"
             required pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*\\d).{6,}"
             title="≥6位，含大小写字母和数字"/>

      <label class="form-label mt-2">Role</label>
      <select class="form-select" v-model="role">
        <option value="user">user</option>
        <option value="admin">admin</option>
      </select>

      <button class="btn btn-primary mt-3" :disabled="loading">Create account</button>
      <p class="text-success mt-2" v-if="ok">Registered! You can sign in now.</p>
      <p class="text-danger mt-2" v-if="err">{{ err }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const email = ref(""); const password = ref(""); const role = ref("user");
const loading = ref(false); const ok = ref(false); const err = ref("");

async function onSubmit() {
  loading.value = true; ok.value = false; err.value = "";
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      role: role.value,              // <—— 角色写入
      createdAt: serverTimestamp(),
    });
    ok.value = true;
  } catch (e) {
    err.value = e.message || String(e);
  } finally { loading.value = false; }
}
</script>
