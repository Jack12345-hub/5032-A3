<script setup>
import { ref, computed } from "vue";
import { classes } from "../assets/data.js";
const q = ref("");
const filtered = computed(() =>
  classes.filter(c => (c.title + " " + c.level).toLowerCase().includes(q.value.toLowerCase()))
);
</script>

<template>
  <h1 class="mb-3">Classes</h1>
  <input v-model="q" class="form-control mb-3" placeholder="Search..." />
  <div class="row g-3">
    <div class="col-12 col-sm-6 col-lg-4" v-for="c in filtered" :key="c.id">
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">{{ c.title }}</h5>
          <p class="mb-1"><strong>Level:</strong> {{ c.level }}</p>
          <p><strong>Duration:</strong> {{ c.duration }} mins</p>
          <button class="btn btn-primary w-100">Book</button>
        </div>
      </div>
    </div>
  </div>
</template>
