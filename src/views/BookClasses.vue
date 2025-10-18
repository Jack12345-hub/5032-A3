<template>
  <div class="wrap">
    <h2>📅 Book a Class</h2>

    <!-- 状态提示 -->
    <p v-if="loading">Loading...</p>
    <p v-if="err" class="text-danger">{{ err }}</p>
    <p v-if="msg" :class="{'ok': ok, 'err': !ok}" aria-live="assertive">{{ msg }}</p>

    <!-- 当没有课程时，显示按钮 -->
    <div v-if="!loading && classes.length === 0" class="empty">
      <p>No classes found in Firestore.</p>
      <button @click="seedClasses">Seed demo classes</button>
    </div>

    <!-- 表格展示 -->
    <table v-else>
      <thead>
        <tr>
          <th>Class</th>
          <th>Time</th>
          <th>Capacity</th>
          <th>Enrolled</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in classes" :key="c.id">
          <td>{{ c.name }}</td>
          <td>{{ c.time }}</td>
          <td>{{ c.capacity }}</td>
          <td>{{ c.enrolled }}</td>
          <td>
            <button
              :disabled="c.enrolled >= c.capacity || busyId === c.id"
              @click="bookClass(c.id)"
            >
              {{ c.enrolled >= c.capacity
                ? 'Full'
                : busyId === c.id
                ? 'Booking...'
                : 'Book' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getFirestore, collection, getDocs, setDoc, doc, updateDoc, increment } from "firebase/firestore";
import { auth } from "../firebase";

const db = getFirestore();
const classes = ref([]);
const loading = ref(true);
const err = ref("");
const msg = ref("");
const ok = ref(false);
const busyId = ref("");

// 加载课程数据
async function loadClasses() {
  loading.value = true;
  err.value = "";
  try {
    const snap = await getDocs(collection(db, "classes"));
    classes.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("loadClasses error:", e);
    err.value = e.message || "Failed to load classes.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadClasses();
});

// 一键灌入示例数据
async function seedClasses() {
  const demo = [
    { id: "yoga", name: "Yoga Flow", time: "Mon 9:00 AM", capacity: 12, enrolled: 0 },
    { id: "spin", name: "Spin Class", time: "Mon 6:00 PM", capacity: 10, enrolled: 0 },
    { id: "pilates", name: "Pilates Core", time: "Tue 7:00 AM", capacity: 8, enrolled: 0 },
    { id: "boxfit", name: "Box Fit", time: "Tue 6:30 PM", capacity: 14, enrolled: 0 },
  ];

  try {
    await Promise.all(
      demo.map((c) => setDoc(doc(db, "classes", c.id), c, { merge: true }))
    );
    await loadClasses();
    ok.value = true;
    msg.value = "✅ Demo classes added successfully!";
  } catch (e) {
    console.error(e);
    ok.value = false;
    msg.value = "❌ Failed to seed demo classes: " + e.message;
  }
}

// 模拟预约逻辑（未来可改成云函数）
async function bookClass(classId) {
  try {
    busyId.value = classId;
    const ref = doc(db, "classes", classId);
    await updateDoc(ref, { enrolled: increment(1) });
    msg.value = "🎉 Successfully booked!";
    await loadClasses();
  } catch (e) {
    msg.value = "⚠️ Booking failed: " + e.message;
  } finally {
    busyId.value = "";
  }
}
</script>

<style scoped>
.wrap {
  max-width: 900px;
  margin: 40px auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}
th, td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
}
th {
  background-color: #f6f6f6;
}
button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background-color: #f0d140;
  cursor: pointer;
}
button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.empty {
  margin: 20px 0;
  text-align: center;
}
.ok {
  color: green;
}
.err {
  color: red;
}
</style>
