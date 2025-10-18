<template>
  <div class="table-container">
    <h2>🏋️ Gym Members</h2>

    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search by member name..."
      class="search-box"
    />

    <!-- ✅ 导出按钮 -->
    <div class="actions">
      <button type="button" @click="exportMembersCSV" aria-label="Export members as CSV">Export CSV</button>
      <button type="button" @click="exportMembersPDF" aria-label="Export members as PDF">Export PDF</button>
    </div>

    <table>
      <thead>
        <tr>
          <th @click="sortBy('name')">
            Name
            <span v-if="sortKey === 'name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th @click="sortBy('level')">
            Level
            <span v-if="sortKey === 'level'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th @click="sortBy('joined')">
            Joined
            <span v-if="sortKey === 'joined'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="m in paginatedMembers" :key="m.id">
          <td>{{ m.name }}</td>
          <td>{{ m.level }}</td>
          <td>{{ m.joined }}</td>
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
/* ⬇️ 如果没有配置 @ 别名，就用 ../utils/export */
import { downloadCSV } from "../utils/export";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const members = ref([
  { id: 1, name: "Alice Smith", level: "Gold", joined: "2023-04-15" },
  { id: 2, name: "Bob Johnson", level: "Silver", joined: "2024-01-12" },
  { id: 3, name: "Cathy Lee", level: "Bronze", joined: "2022-11-30" },
  { id: 4, name: "Daniel Wong", level: "Gold", joined: "2023-08-20" },
  { id: 5, name: "Eva Chen", level: "Silver", joined: "2023-09-03" },
  { id: 6, name: "Frank Zhou", level: "Bronze", joined: "2022-10-15" },
  { id: 7, name: "Grace Liu", level: "Gold", joined: "2023-07-10" },
  { id: 8, name: "Henry Park", level: "Silver", joined: "2023-12-01" },
  { id: 9, name: "Ivy Brown", level: "Bronze", joined: "2024-02-17" },
  { id: 10, name: "Jake Wilson", level: "Gold", joined: "2022-09-08" },
  { id: 11, name: "Kelly Tan", level: "Silver", joined: "2024-03-14" },
]);

const searchQuery = ref("");
const sortKey = ref("name");
const sortOrder = ref("asc");
const page = ref(1);
const itemsPerPage = 5;

const filteredMembers = computed(() => {
  return members.value.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const sortedMembers = computed(() => {
  return [...filteredMembers.value].sort((a, b) => {
    const valA = a[sortKey.value];
    const valB = b[sortKey.value];
    if (valA < valB) return sortOrder.value === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder.value === "asc" ? 1 : -1;
    return 0;
  });
});

const totalPages = computed(() => Math.ceil(sortedMembers.value.length / itemsPerPage));
const paginatedMembers = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedMembers.value.slice(start, start + itemsPerPage);
});

function sortBy(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
}

/* ✅ 导出全部筛选+排序后的结果 */
function exportMembersCSV() {
  const rows = sortedMembers.value.map(m => ({
    Name: m.name,
    Level: m.level,
    Joined: m.joined
  }));
  downloadCSV("gym-members.csv", rows);
}

function exportMembersPDF() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("Gym Members", 40, 40);
  autoTable(doc, {
    startY: 60,
    head: [["Name", "Level", "Joined"]],
    body: sortedMembers.value.map(m => [m.name, m.level, m.joined]),
    styles: { fontSize: 10 }
  });
  doc.save("gym-members.pdf");
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
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
th, td { padding: 10px; border: 1px solid #ddd; }
th { cursor: pointer; background-color: #f6f6f6; }
th:hover { background-color: #f0d140; }
.pagination { display:flex; justify-content:center; align-items:center; gap:10px; }
button { padding: 6px 12px; border: none; background-color: #f0d140; border-radius: 6px; cursor: pointer; }
button:disabled { background-color: #ddd; cursor: not-allowed; }
</style>
