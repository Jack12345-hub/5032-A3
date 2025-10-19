<template>
  <div class="wrap">
    <h2>🌐 Public Classes (Read-only)</h2>

    <!-- Controls -->
    <div class="toolbar">
      <label>
        Order by:
        <select v-model="orderBy">
          <option value="">(none)</option>
          <option value="time">time</option>
          <option value="name">name</option>
          <option value="capacity">capacity</option>
          <option value="enrolled">enrolled</option>
        </select>
      </label>

      <label>
        Limit:
        <select v-model.number="limit">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </label>

      <button @click="fetchData" :disabled="loading">
        {{ loading ? "Loading..." : "Refresh" }}
      </button>

      <span class="tip">This endpoint is public read-only JSON.</span>
    </div>

    <!-- Status messages -->
    <p v-if="error" class="err">❌ {{ error }}</p>
    <p v-if="!loading && !error" class="ok">
      ✅ Loaded {{ data.length }} item(s)
    </p>

    <!-- Empty state -->
    <div v-if="!loading && !error && data.length === 0" class="empty">
      No classes found.
    </div>

    <!-- Table display -->
    <table v-else-if="!loading && !error">
      <thead>
        <tr>
          <th>ID</th>
          <th>Class</th>
          <th>Time</th>
          <th>Capacity</th>
          <th>Enrolled</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in data" :key="c.id">
          <td><code>{{ c.id }}</code></td>
          <td>{{ c.name }}</td>
          <td>{{ c.time }}</td>
          <td>{{ c.capacity }}</td>
          <td>{{ c.enrolled }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Raw JSON view (collapsible) -->
    <details class="json">
      <summary>Raw JSON</summary>
      <pre>{{ rawJson }}</pre>
    </details>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

// ✅ Replace with your deployed public endpoint
const BASE =
  "https://australia-southeast2-week7-siyi.cloudfunctions.net/publicClasses";

const data = ref([]);
const loading = ref(false);
const error = ref("");
const orderBy = ref("time"); // Default: order by time
const limit = ref(20);       // Default: limit 20

const rawJson = computed(() =>
  JSON.stringify(
    { ok: true, count: data.value.length, data: data.value },
    null,
    2
  )
);

/** Fetch data from public endpoint */
async function fetchData() {
  loading.value = true;
  error.value = "";
  data.value = [];
  try {
    const qs = new URLSearchParams();
    if (orderBy.value) qs.set("orderBy", orderBy.value);
    if (limit.value) qs.set("limit", String(limit.value));

    const url = qs.toString() ? `${BASE}?${qs.toString()}` : BASE;
    const r = await fetch(url, { method: "GET" });
    const json = await r.json();
    if (!r.ok || json.ok === false) {
      throw new Error(json.error || `HTTP ${r.status}`);
    }
    data.value = json.data || [];
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<style scoped>
.wrap {
  max-width: 960px;
  margin: 36px auto;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.toolbar button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #f0d140;
  cursor: pointer;
}
.tip {
  color: #666;
  font-size: 0.9rem;
}

.ok { color: #2e7d32; }
.err { color: #c00; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}
th, td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}
th { background: #f6f6f6; }
.empty { padding: 24px 0; color: #666; }

.json { margin-top: 16px; }
pre {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 12px;
  overflow: auto;
}
</style>
