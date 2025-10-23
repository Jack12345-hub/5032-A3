<template>
  <div class="container py-4 text-start">
    <h1 class="mb-3">Classes list</h1>

    <div v-if="!loaded && !err" class="text-muted">Loading...</div>
    <div v-if="err" class="alert alert-danger">{{ err }}</div>

    <div v-for="c in classes" :key="c.id" class="card mb-3 shadow-sm" v-if="classes.length">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between">
          <div>
            <h5 class="card-title mb-1">{{ c.title }}</h5>
            <div class="text-muted">Level: {{ c.level }} · {{ c.duration }} mins</div>
          </div>
          <!-- Rating widget (requires login) -->
          <div class="ms-3">
            <Rating :classId="c.id" />
          </div>
        </div>

        <!-- Optional notes input (safe text only) -->
        <div class="mt-3">
          <label class="form-label">My note (optional)</label>
          <input
            v-model="notes[c.id]"
            class="form-control"
            maxlength="120"
            placeholder="Write a short note (no HTML)"
          />
          <small class="text-muted">Preview: {{ notes[c.id] }}</small>
        </div>
      </div>
    </div>

    <div v-if="loaded && !err && !classes.length" class="text-muted">No classes.</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Rating from "../components/Rating.vue";

const classes = ref([]);
const notes = ref({});
const loaded = ref(false);
const err = ref("");

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const url =
      (base.endsWith('/') ? base : base + '/') + 'classes.json';

    console.log('[classes.json URL]', url); // 🔎 方便在控制台确认实际请求地址

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('classes.json must be an array');

    classes.value = data;
  } catch (e) {
    console.error('Failed to load classes.json', e);
    err.value = 'Failed to load class list. Please check classes.json path and deployment.';
  } finally {
    loaded.value = true;
  }
});
</script>
