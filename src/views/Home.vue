<template>
  <div class="container py-4 text-start">
    <h1 class="mb-3">Available Classes</h1>

    <div v-if="!loaded" class="text-muted">Loading...</div>

    <div v-for="c in classes" :key="c.id" class="card mb-3 shadow-sm">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between">
          <div>
            <h5 class="card-title mb-1">{{ c.title }}</h5>
            <div class="text-muted">
              Level: {{ c.level }} · {{ c.duration }} mins
            </div>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Rating from "../components/Rating.vue";

// Local state for class list and simple notes preview
const classes = ref([]);
const notes = ref({});
const loaded = ref(false);

// Load classes.json from the project root (public or /)
onMounted(async () => {
  try {
    const res = await fetch("/classes.json");
    classes.value = await res.json();
  } catch (e) {
    console.error("Failed to load classes.json", e);
  } finally {
    loaded.value = true;
  }
});
</script>
