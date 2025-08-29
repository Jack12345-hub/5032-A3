<script setup>
/*
  Home.vue
  - Asynchronously fetches classes from /public/classes.json
  - Shows loading and error states
  - Provides search + sort (title | level | duration)
  - Uses a custom order for "level" instead of plain alphabetical
  - Renders a responsive card grid (Bootstrap)
*/
import { ref, computed, onMounted } from "vue";

/* ------------ UI state ------------ */
const loading = ref(true);
const error = ref("");

/* ------------ Data state ------------ */
const classes = ref([]);

/* ------------ Controls ------------ */
const query = ref("");
const sortBy = ref("level");    // 'title' | 'level' | 'duration'
const sortDir = ref("desc");    // 'asc' | 'desc'

/* ------------ Fetch function ------------ */
async function load() {
  loading.value = true;
  error.value = "";
  try {
    // Fetch from public/ (served at site root). Replace with real API when needed.
    const res = await fetch("/classes.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    classes.value = await res.json();

    // Optional tiny delay to make the loading state visible during demo
    await new Promise((r) => setTimeout(r, 150));
  } catch (e) {
    error.value = e?.message || "Failed to load data.";
  } finally {
    loading.value = false;
  }
}
onMounted(load);

/* ------------ Derived list: filter + sort ------------ */
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();

  // 1) Filter by title/level substring
  let arr = classes.value.filter((c) =>
    [c.title, c.level].join(" ").toLowerCase().includes(q)
  );

  // 2) Sort by chosen key
  const dir = sortDir.value === "asc" ? 1 : -1;

  // Custom rank for level so "Advanced" can appear before "Beginner" etc.
  // Adjust ranks if you add more levels.
  const levelRank = {
    All: 0,
    Beginner: 1,
    Intermediate: 2,
    Advanced: 3,
  };

  arr = arr.slice().sort((a, b) => {
    const k = sortBy.value;

    if (k === "level") {
      const ra = levelRank[a.level] ?? -Infinity;
      const rb = levelRank[b.level] ?? -Infinity;
      return (ra - rb) * dir;
    }

    if (typeof a[k] === "number" && typeof b[k] === "number") {
      return (a[k] - b[k]) * dir;
    }

    return String(a[k]).localeCompare(String(b[k])) * dir;
  });

  return arr;
});
</script>

<template>
  <section aria-labelledby="classes-heading">
    <h1 id="classes-heading" class="mb-3">Classes</h1>

    <!-- Controls: search + sort -->
    <div class="row g-2 mb-3">
      <div class="col-12 col-md-6">
        <input
          v-model="query"
          class="form-control"
          placeholder="Search by title or level..."
          aria-label="Search classes"
        />
      </div>

      <div class="col-6 col-md-3">
        <select v-model="sortBy" class="form-select" aria-label="Sort by">
          <option value="title">Sort by Title</option>
          <option value="level">Sort by Level</option>
          <option value="duration">Sort by Duration</option>
        </select>
      </div>

      <div class="col-6 col-md-3">
        <select v-model="sortDir" class="form-select" aria-label="Sort direction">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" class="alert alert-info" role="status" aria-live="polite">
      Loading classes…
    </div>

    <div v-else-if="error" class="alert alert-danger d-flex align-items-center justify-content-between" role="alert" aria-live="assertive">
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-outline-light" @click="load">Retry</button>
    </div>

    <!-- Card grid -->
    <div v-else class="row g-3">
      <div
        class="col-12 col-sm-6 col-lg-4 col-xl-3"
        v-for="c in filtered"
        :key="c.id"
      >
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">{{ c.title }}</h5>
            <p class="mb-1"><strong>Level:</strong> {{ c.level }}</p>
            <p class="mb-3"><strong>Duration:</strong> {{ c.duration }} mins</p>
            <button class="btn btn-primary w-100">Book</button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <p v-if="filtered.length === 0" class="text-muted">No results.</p>
    </div>
  </section>
</template>
