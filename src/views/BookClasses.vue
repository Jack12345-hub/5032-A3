<template>
  <a href="#main" class="skip-link">Skip to main content</a>

  <main id="main" class="wrap" tabindex="-1">
    <h1>📅 Book a Class</h1>

    <!-- 状态提示 -->
    <p v-if="loading" role="status" aria-live="polite">Loading...</p>
    <p v-if="err" class="text-danger" role="alert">{{ err }}</p>
    <p
      v-if="msg"
      :class="{ ok: ok, err: !ok }"
      role="status"
      aria-live="polite"
    >
      {{ msg }}
    </p>

    <!-- 无课程时：一键灌入示例数据 -->
    <div
      v-if="!loading && classes.length === 0"
      class="empty"
      role="region"
      aria-labelledby="emptyTitle"
    >
      <p id="emptyTitle">No classes found in Firestore.</p>
      <button @click="seedClasses">Seed demo classes</button>
    </div>

    <!-- 列表 -->
    <div v-else role="region" aria-labelledby="classTableTitle" :aria-busy="loading ? 'true' : 'false'">
      <h2 id="classTableTitle" class="visually-hidden">Available classes</h2>

      <table>
        <caption class="caption">
          Class timetable with capacity and your booking status. Use the Action column to book or cancel.
        </caption>
        <thead>
          <tr>
            <th scope="col">Class</th>
            <th scope="col">Time</th>
            <th scope="col">Capacity</th>
            <th scope="col">Enrolled</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in classes" :key="c.id">
            <th scope="row">{{ c.name }}</th>
            <td>{{ c.time }}</td>
            <td>{{ c.capacity }}</td>
            <td>{{ c.enrolled }}</td>
            <td>
              <!-- 已报名：显示 Cancel -->
              <button
                v-if="isBooked(c.id)"
                :disabled="busyCancelId === c.id"
                :aria-disabled="busyCancelId === c.id ? 'true' : 'false'"
                :aria-label="busyCancelId === c.id ? 'Cancelling booking for ' + (c.name || c.id) : 'Cancel booking for ' + (c.name || c.id)"
                @click="cancelClass(c.id)"
                class="btn-cancel"
              >
                {{ busyCancelId === c.id ? "Cancelling..." : "Cancel" }}
              </button>

              <!-- 未报名：显示 Book（满员时禁用） -->
              <button
                v-else
                :disabled="c.enrolled >= c.capacity || busyId === c.id"
                :aria-disabled="(c.enrolled >= c.capacity || busyId === c.id) ? 'true' : 'false'"
                :title="c.enrolled >= c.capacity ? 'Class is full' : ''"
                :aria-label="
                  c.enrolled >= c.capacity
                    ? 'Class is full'
                    : (busyId === c.id
                        ? 'Booking ' + (c.name || c.id)
                        : 'Book ' + (c.name || c.id))
                "
                @click="bookClass(c.id)"
              >
                {{
                  c.enrolled >= c.capacity
                    ? "Full"
                    : busyId === c.id
                    ? "Booking..."
                    : "Book"
                }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

/* ===========================
   云函数地址（按需替换）
   =========================== */
const BOOK_URL =
  "https://australia-southeast2-week7-siyi.cloudfunctions.net/bookClass";
const CANCEL_URL =
  "https://australia-southeast2-week7-siyi.cloudfunctions.net/cancelClass";

/* ===========================
   响应式状态
   =========================== */
const db = getFirestore();
const classes = ref([]);
const loading = ref(true);
const err = ref("");
const msg = ref("");
const ok = ref(false);

// 报名与取消时的忙碌标记
const busyId = ref("");
const busyCancelId = ref("");

// 当前用户已报名的 classId 集合
const myBookings = ref(new Set());

/* ===========================
   加载课程
   =========================== */
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

/* ===========================
   加载“我的报名”
   =========================== */
async function loadMyBookings() {
  myBookings.value = new Set();
  const user = auth.currentUser;
  if (!user) return;
  try {
    const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const data = d.data();
      if (data?.classId) myBookings.value.add(data.classId);
    });
  } catch (e) {
    console.error("loadMyBookings error:", e);
    // 静默失败不影响主流程
  }
}

/* ===========================
   一键灌入示例课程
   =========================== */
async function seedClasses() {
  const demo = [
    { id: "yoga",    name: "Yoga Flow",    time: "Mon 9:00 AM",  capacity: 12, enrolled: 0 },
    { id: "spin",    name: "Spin Class",   time: "Mon 6:00 PM",  capacity: 10, enrolled: 0 },
    { id: "pilates", name: "Pilates Core", time: "Tue 7:00 AM",  capacity: 8,  enrolled: 0 },
    { id: "boxfit",  name: "Box Fit",      time: "Tue 6:30 PM",  capacity: 14, enrolled: 0 },
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

/* ===========================
   是否已报名
   =========================== */
function isBooked(classId) {
  return myBookings.value.has(classId);
}

/* ===========================
   报名（调用云函数 bookClass）
   =========================== */
async function bookClass(classId) {
  const user = auth.currentUser;
  if (!user) {
    ok.value = false;
    msg.value = "⚠️ Please log in first.";
    return;
  }

  try {
    busyId.value = classId;
    err.value = "";
    ok.value = false;
    msg.value = "";

    const idToken = await user.getIdToken();
    const r = await fetch(BOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, idToken }),
    });
    const data = await r.json();

    if (!r.ok || data.ok === false) {
      const reason = data.error || "Book failed";
      ok.value = false;
      if (reason === "Already booked") {
        msg.value = "⚠️ You have already booked this class.";
      } else if (reason === "Class is full") {
        msg.value = "⚠️ This class is full.";
      } else if (reason === "Class not found") {
        msg.value = "⚠️ Class not found.";
      } else {
        msg.value = "⚠️ Booking failed: " + reason;
      }
      return;
    }

    ok.value = true;
    msg.value = `🎉 Successfully booked “${data.class?.name ?? classId}”!`;
    await loadClasses();     // 刷新人数
    await loadMyBookings();  // 刷新按钮状态
  } catch (e) {
    ok.value = false;
    msg.value = "⚠️ Booking failed: " + (e.message || String(e));
  } finally {
    busyId.value = "";
  }
}

/* ===========================
   取消报名（调用云函数 cancelClass）
   =========================== */
async function cancelClass(classId) {
  const user = auth.currentUser;
  if (!user) {
    ok.value = false;
    msg.value = "⚠️ Please log in first.";
    return;
  }

  try {
    busyCancelId.value = classId;
    err.value = "";
    ok.value = false;
    msg.value = "";

    const idToken = await user.getIdToken();
    const r = await fetch(CANCEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, idToken }),
    });
    const data = await r.json();

    if (!r.ok || data.ok === false) {
      const reason = data.error || "Cancel failed";
      ok.value = false;
      if (reason === "Not booked") {
        msg.value = "⚠️ You have not booked this class.";
      } else if (reason === "Class not found") {
        msg.value = "⚠️ Class not found.";
      } else {
        msg.value = "⚠️ Cancel failed: " + reason;
      }
      return;
    }

    ok.value = true;
    msg.value = `✅ Canceled booking for “${data.class?.name ?? classId}”.`;
    await loadClasses();     // 更新人数
    await loadMyBookings();  // 更新按钮状态
  } catch (e) {
    ok.value = false;
    msg.value = "⚠️ Cancel failed: " + (e.message || String(e));
  } finally {
    busyCancelId.value = "";
  }
}

/* ===========================
   生命周期与登录监听 + 焦点管理
   =========================== */
onMounted(async () => {
  await loadClasses();
  await loadMyBookings();

  // 登录状态变化时，刷新“我的报名”集合
  onAuthStateChanged(auth, async () => {
    await loadMyBookings();
  });

  // 路由进入后把焦点放到主内容，方便屏幕阅读器用户
  const main = document.getElementById("main");
  if (main) main.focus();
});
</script>

<style scoped>
/* Skip link：键盘用户可快速跳到主内容 */
.skip-link {
  position: absolute;
  left: -999px;
  top: -999px;
  background: #000;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
}
.skip-link:focus {
  left: 12px;
  top: 12px;
  z-index: 1000;
}

.wrap {
  max-width: 900px;
  margin: 40px auto;
}

.caption {
  text-align: left;
  padding: 6px 0 10px;
  color: #555;
  font-size: 0.95rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  table-layout: fixed;
}

th,
td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
  word-wrap: break-word;
}

th {
  background-color: #f6f6f6;
}

/* 可见焦点：确保键盘导航看得见 */
button:focus,
a:focus,
[tabindex="-1"]:focus {
  outline: 3px solid #1976d2;
  outline-offset: 2px;
}

button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background-color: #f0d140;
  color: #000; /* 浅黄背景搭配深字，提升对比度 */
  cursor: pointer;
}

button:disabled,
button[aria-disabled="true"] {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-cancel {
  background-color: #ff6b6b;
  color: #fff;
}

.empty {
  margin: 20px 0;
  text-align: center;
}

.ok {
  color: #2e7d32;
}

.err,
.text-danger {
  color: #c00;
}

/* 视觉隐藏但可被辅助技术读取 */
.visually-hidden {
  position: absolute !important;
  height: 1px; width: 1px;
  overflow: hidden; clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap; border: 0; padding: 0; margin: -1px;
}
</style>
