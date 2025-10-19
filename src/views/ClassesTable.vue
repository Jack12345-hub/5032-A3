<template>
  <div class="table-container">
    <h2>🧘 Gym Classes</h2>

    <!-- 全局搜索 -->
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search class/instructor/time..."
      class="search-box"
      aria-label="Search all columns"
    />

    <!-- 导出 -->
    <div class="actions">
      <button type="button" @click="exportClassesCSV" aria-label="Export classes as CSV">Export CSV</button>
      <button type="button" @click="exportClassesPDF" aria-label="Export classes as PDF">Export PDF</button>
    </div>

    <table aria-label="Gym classes table">
      <caption class="caption">
        Class timetable with instructor, time and remaining spots. Click a column header to sort.
      </caption>

      <thead>
        <tr>
          <th scope="col"
              @click="sortBy('name')"
              :aria-sort="ariaSort('name')">
            Class
            <span v-if="sortKey === 'name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th scope="col"
              @click="sortBy('instructor')"
              :aria-sort="ariaSort('instructor')">
            Instructor
            <span v-if="sortKey === 'instructor'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th scope="col"
              @click="sortBy('time')"
              :aria-sort="ariaSort('time')">
            Time
            <span v-if="sortKey === 'time'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th scope="col">Spots</th>
        </tr>

        <!-- 按列搜索 -->
        <tr class="filters">
          <th><input v-model="fClass" placeholder="Filter class…" aria-label="Filter by class" /></th>
          <th><input v-model="fInstructor" placeholder="Filter instructor…" aria-label="Filter by instructor" /></th>
          <th><input v-model="fTime" placeholder="Filter time…" aria-label="Filter by time" /></th>
          <th></th>
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

const classes = ref([
  { id: 1,  name: "Yoga Flow",       instructor: "Anna",   time: "Mon 9:00 AM",  spots: 12 },
  { id: 2,  name: "Spin Class",      instructor: "Brian",  time: "Mon 6:00 PM",  spots: 10 },
  { id: 3,  name: "Pilates Core",    instructor: "Cindy",  time: "Tue 7:00 AM",  spots: 8  },
  { id: 4,  name: "Box Fit",         instructor: "Daniel", time: "Tue 6:30 PM",  spots: 14 },
  { id: 5,  name: "Zumba Dance",     instructor: "Eva",    time: "Wed 5:00 PM",  spots: 20 },
  { id: 6,  name: "HIIT Express",    instructor: "Frank",  time: "Thu 8:00 AM",  spots: 9  },
  { id: 7,  name: "Stretch & Relax", instructor: "Grace",  time: "Fri 7:30 AM",  spots: 11 },
  { id: 8,  name: "Power Pump",      instructor: "Henry",  time: "Fri 6:00 PM",  spots: 15 },
  { id: 9,  name: "Core Balance",    instructor: "Ivy",    time: "Sat 10:00 AM", spots: 13 },
  { id: 10, name: "Cardio Burn",     instructor: "Jack",   time: "Sun 9:00 AM",  spots: 16 },
  // 再加一些演示数据，便于分页
  { id: 11, name: "Mobility Flow",   instructor: "Kate",   time: "Sun 4:00 PM",  spots: 12 },
  { id: 12, name: "Strength 101",    instructor: "Leo",    time: "Wed 7:00 PM",  spots: 18 },
]);

// 搜索与排序
const searchQuery   = ref("");
const fClass        = ref("");
const fInstructor   = ref("");
const fTime         = ref("");
const sortKey       = ref("name");
const sortOrder     = ref("asc");

// 分页（每页 10 行）
const page          = ref(1);
const itemsPerPage  = 10;

// 条件变化时回到第 1 页
watch([searchQuery, fClass, fInstructor, fTime], () => { page.value = 1; });

const filteredClasses = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return classes.value.filter(c => {
    const hitGlobal     = !q || [c.name, c.instructor, c.time].some(v => String(v).toLowerCase().includes(q));
    const hitClass      = !fClass.value      || c.name.toLowerCase().includes(fClass.value.toLowerCase());
    const hitInstructor = !fInstructor.value || c.instructor.toLowerCase().includes(fInstructor.value.toLowerCase());
    const hitTime       = !fTime.value       || c.time.toLowerCase().includes(fTime.value.toLowerCase());
    return hitGlobal && hitClass && hitInstructor && hitTime;
  });
});

const sortedClasses = computed(() => {
  const key = sortKey.value;
  const order = sortOrder.value;
  return [...filteredClasses.value].sort((a, b) => {
    const A = a[key], B = b[key];
    // 字符串忽略大小写，数字正常比较
    const aVal = typeof A === "string" ? A.toLowerCase() : A;
    const bVal = typeof B === "string" ? B.toLowerCase() : B;
    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ?  1 : -1;
    return 0;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedClasses.value.length / itemsPerPage)));
const paginatedClasses = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedClasses.value.slice(start, start + itemsPerPage);
});

// 保护：如果筛选导致页码越界，自动回到最后一页
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
