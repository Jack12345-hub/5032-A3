<template>
  <div class="table-container">
    <h2>🧘 Gym Classes</h2>

    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search by class or instructor..."
      class="search-box"
    />

    <!-- ✅ 导出按钮 -->
    <div class="actions">
      <button type="button" @click="exportClassesCSV" aria-label="Export classes as CSV">Export CSV</button>
      <button type="button" @click="exportClassesPDF" aria-label="Export classes as PDF">Export PDF</button>
    </div>

    <table>
      <thead>
        <tr>
          <th @click="sortBy('name')">
            Class
            <span v-if="sortKey === 'name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th @click="sortBy('instructor')">
            Instructor
            <span v-if="sortKey === 'instructor'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th @click="sortBy('time')">
            Time
            <span v-if="sortKey === 'time'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th>Spots</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="c in paginatedClasses" :key="c.id">
          <td>{{ c.name }}</td>
          <td>{{ c.instructor }}</td>
          <td>{{ c.time }}</td>
          <td>{{ c.spots }}</td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button :disabled="page === 1" @click="page--">Prev</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button :disabled="page === totalPages" @click="page++">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
/* ⬇️ 如果你没有配置 @ 别名，请用相对路径 ../utils/export */
import { downloadCSV } from "../utils/export";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const classes = ref([
  { id: 1, name: "Yoga Flow", instructor: "Anna", time: "Mon 9:00 AM", spots: 12 },
  { id: 2, name: "Spin Class", instructor: "Brian", time: "Mon 6:00 PM", spots: 10 },
  { id: 3, name: "Pilates Core", instructor: "Cindy", time: "Tue 7:00 AM", spots: 8 },
  { id: 4, name: "Box Fit", instructor: "Daniel", time: "Tue 6:30 PM", spots: 14 },
  { id: 5, name: "Zumba Dance", instructor: "Eva", time: "Wed 5:00 PM", spots: 20 },
  { id: 6, name: "HIIT Express", instructor: "Frank", time: "Thu 8:00 AM", spots: 9 },
  { id: 7, name: "Stretch & Relax", instructor: "Grace", time: "Fri 7:30 AM", spots: 11 },
  { id: 8, name: "Power Pump", instructor: "Henry", time: "Fri 6:00 PM", spots: 15 },
  { id: 9, name: "Core Balance", instructor: "Ivy", time: "Sat 10:00 AM", spots: 13 },
  { id: 10, name: "Cardio Burn", instructor: "Jack", time: "Sun 9:00 AM", spots: 16 },
]);

const searchQuery = ref("");
const sortKey = ref("name");
const sortOrder = ref("asc");
const page = ref(1);
const itemsPerPage = 5;

const filteredClasses = computed(() =>
  classes.value.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.instructor.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

const sortedClasses = computed(() => {
  return [...filteredClasses.value].sort((a, b) => {
    const valA = a[sortKey.value];
    const valB = b[sortKey.value];
    if (valA < valB) return sortOrder.value === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder.value === "asc" ? 1 : -1;
    return 0;
  });
});

const totalPages = computed(() => Math.ceil(sortedClasses.value.length / itemsPerPage));
const paginatedClasses = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedClasses.value.slice(start, start + itemsPerPage);
});

function sortBy(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
}

/* ✅ 导出：导出的是“筛选+排序后的全部数据（sortedClasses）”，不是仅当前页 */
function exportClassesCSV() {
  const rows = sortedClasses.value.map(c => ({
    Class: c.name,
    Instructor: c.instructor,
    Time: c.time,
    Spots: c.spots
  }));
  downloadCSV("gym-classes.csv", rows);
}

function exportClassesPDF() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("Gym Classes", 40, 40);
  autoTable(doc, {
    startY: 60,
    head: [["Class", "Instructor", "Time", "Spots"]],
    body: sortedClasses.value.map(c => [c.name, c.instructor, c.time, String(c.spots)]),
    styles: { fontSize: 10 }
  });
  doc.save("gym-classes.pdf");
}
</script>

<style scoped>
.table-container {
  max-width: 800px;
  margin: 40px auto;
  text-align: center;
}
.search-box {
  padding: 8px;
  width: 60%;
  margin-bottom: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.actions{
  display:flex; gap:10px; justify-content:center; margin:8px 0 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}
th, td {
  padding: 10px;
  border: 1px solid #ddd;
}
th { cursor: pointer; background-color: #f6f6f6; }
th:hover { background-color: #f0d140; }
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}
button {
  padding: 6px 12px;
  border: none;
  background-color: #f0d140;
  border-radius: 6px;
  cursor: pointer;
}
button:disabled { background-color: #ddd; cursor: not-allowed; }
</style>
