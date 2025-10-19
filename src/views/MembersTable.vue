<template>
  <div class="table-container">
    <h2>🏋️ Gym Members</h2>

    <!-- 全局搜索 -->
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search member/level/join date..."
      class="search-box"
      aria-label="Search all columns"
    />

    <!-- 导出 -->
    <div class="actions">
      <button type="button" @click="exportMembersCSV" aria-label="Export members as CSV">Export CSV</button>
      <button type="button" @click="exportMembersPDF" aria-label="Export members as PDF">Export PDF</button>
    </div>

    <table aria-label="Gym members table">
      <caption class="caption">
        Members list with level and joined date. Click a column header to sort.
      </caption>

      <thead>
        <tr>
          <th scope="col"
              @click="sortBy('name')"
              :aria-sort="ariaSort('name')">
            Name
            <span v-if="sortKey === 'name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th scope="col"
              @click="sortBy('level')"
              :aria-sort="ariaSort('level')">
            Level
            <span v-if="sortKey === 'level'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th scope="col"
              @click="sortBy('joined')"
              :aria-sort="ariaSort('joined')">
            Joined
            <span v-if="sortKey === 'joined'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
        </tr>

        <!-- 按列搜索 -->
        <tr class="filters">
          <th><input v-model="fName"   placeholder="Filter name…"   aria-label="Filter by name" /></th>
          <th><input v-model="fLevel"  placeholder="Filter level…"  aria-label="Filter by level" /></th>
          <th><input v-model="fJoined" placeholder="Filter joined…" aria-label="Filter by joined date" /></th>
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
      <button :disabled="page === 1" @click="page--" aria-label="Previous page">Prev</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button :disabled="page === totalPages" @click="page++" aria-label="Next page">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { downloadCSV } from "../utils/export";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const members = ref([
  { id: 1,  name: "Alice Smith",  level: "Gold",   joined: "2023-04-15" },
  { id: 2,  name: "Bob Johnson",  level: "Silver", joined: "2024-01-12" },
  { id: 3,  name: "Cathy Lee",    level: "Bronze", joined: "2022-11-30" },
  { id: 4,  name: "Daniel Wong",  level: "Gold",   joined: "2023-08-20" },
  { id: 5,  name: "Eva Chen",     level: "Silver", joined: "2023-09-03" },
  { id: 6,  name: "Frank Zhou",   level: "Bronze", joined: "2022-10-15" },
  { id: 7,  name: "Grace Liu",    level: "Gold",   joined: "2023-07-10" },
  { id: 8,  name: "Henry Park",   level: "Silver", joined: "2023-12-01" },
  { id: 9,  name: "Ivy Brown",    level: "Bronze", joined: "2024-02-17" },
  { id: 10, name: "Jake Wilson",  level: "Gold",   joined: "2022-09-08" },
  { id: 11, name: "Kelly Tan",    level: "Silver", joined: "2024-03-14" },
  // 多几条方便演示分页
  { id: 12, name: "Leo Sun",      level: "Gold",   joined: "2024-05-02" },
  { id: 13, name: "Mina Park",    level: "Bronze", joined: "2023-03-22" },
]);

// 搜索与排序
const searchQuery = ref("");
const fName  = ref("");
const fLevel = ref("");
const fJoined= ref("");
const sortKey   = ref("name");
const sortOrder = ref("asc");

// 分页（每页 10 行）
const page         = ref(1);
const itemsPerPage = 10;

// 条件变化时回到第 1 页
watch([searchQuery, fName, fLevel, fJoined], () => { page.value = 1; });

const filteredMembers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return members.value.filter(m => {
    const hitGlobal = !q || [m.name, m.level, m.joined].some(v => String(v).toLowerCase().includes(q));
    const hitName   = !fName.value   || m.name.toLowerCase().includes(fName.value.toLowerCase());
    const hitLevel  = !fLevel.value  || m.level.toLowerCase().includes(fLevel.value.toLowerCase());
    const hitJoined = !fJoined.value || String(m.joined).toLowerCase().includes(fJoined.value.toLowerCase());
    return hitGlobal && hitName && hitLevel && hitJoined;
  });
});

const sortedMembers = computed(() => {
  const key = sortKey.value;
  const order = sortOrder.value;
  return [...filteredMembers.value].sort((a, b) => {
    const A = a[key], B = b[key];
    const aVal = typeof A === "string" ? A.toLowerCase() : A;
    const bVal = typeof B === "string" ? B.toLowerCase() : B;
    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ?  1 : -1;
    return 0;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedMembers.value.length / itemsPerPage)));
const paginatedMembers = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedMembers.value.slice(start, start + itemsPerPage);
});

watch(totalPages, (tp) => { if (page.value > tp) page.value = tp; });

function sortBy(key) {
  if (sortKey.value === key) {
    sortOrder.value = (sortOrder.value === "asc") ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
}

function ariaSort(key) {
  if (sortKey.value !== key) return "none";
  return sortOrder.value === "asc" ? "ascending" : "descending";
}

/* 导出：筛选+排序后的全部数据 */
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
.table-container { max-width: 900px; margin: 40px auto; text-align: center; }
.search-box { padding: 8px; width: 60%; margin-bottom: 12px; border: 1px solid #ccc; border-radius: 8px; }
.actions { display:flex; gap:10px; justify-content:center; margin:8px 0 12px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
caption { text-align: left; padding: 6px 0 10px; color: #555; }
th, td { padding: 10px; border: 1px solid #ddd; }
th { cursor: pointer; background-color: #f6f6f6; }
th:hover { background-color: #f0d140; }
.filters input { width: 95%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; }
.pagination { display:flex; justify-content:center; align-items:center; gap:10px; }
button { padding: 6px 12px; border: none; background-color: #f0d140; border-radius: 6px; cursor: pointer; }
button:disabled { background-color: #ddd; cursor: not-allowed; }
</style>
