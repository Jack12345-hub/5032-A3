<template>
  <div>
    <p class="mb-1">Average: {{ avg }} ({{ count }} ratings)</p>

    <div v-if="authed" class="d-flex align-items-center gap-2">
      <div>
        <button
          v-for="n in 5"
          :key="n"
          class="btn btn-sm me-1"
          :disabled="saving"
          :class="n <= myScore ? 'btn-warning' : 'btn-outline-secondary'"
          @click="onStarClick(n)"
          :aria-pressed="n === myScore"
          :title="`Rate ${n}`"
        >
          {{ n <= myScore ? "★" : "☆" }}
        </button>
      </div>

      <!-- Clear my rating -->
      <button
        v-if="myScore > 0"
        class="btn btn-sm btn-outline-secondary"
        :disabled="saving"
        @click="clearRating"
        title="Clear my rating"
      >
        Clear
      </button>
    </div>

    <div v-else class="text-muted">Please login to rate.</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { session } from "../store/session";

const props = defineProps({
  classId: { type: [String, Number], required: true },
});

const authed = computed(() => !!session.user);
const scores = ref({});         // { uid: score }
const myScore = ref(0);         // current user's score
const saving = ref(false);      // disable buttons while saving/deleting
let unsub = null;

// Live subscribe to ratings of this classId
onMounted(() => {
  const colRef = collection(db, "ratings", String(props.classId), "userRatings");
  unsub = onSnapshot(colRef, (snap) => {
    const map = {};
    snap.forEach((d) => (map[d.id] = Number(d.data().score || 0)));
    scores.value = map;
    myScore.value = session.user ? map[session.user.uid] || 0 : 0;
  });
});

onBeforeUnmount(() => { if (unsub) unsub(); });

const count = computed(() => Object.keys(scores.value).length);
const avg = computed(() => {
  const vals = Object.values(scores.value);
  if (!vals.length) return "0.00";
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return mean.toFixed(2);
});

// Save rating for current user
async function save(n) {
  if (!session.user) return;
  saving.value = true;
  try {
    const ref = doc(db, "ratings", String(props.classId), "userRatings", session.user.uid);
    await setDoc(ref, { uid: session.user.uid, score: n }, { merge: true });
  } finally {
    saving.value = false;
  }
}

// Click behavior: clicking the same star clears the rating; otherwise saves new score
async function onStarClick(n) {
  if (!session.user) return;
  if (n === myScore.value) {
    await clearRating();
  } else {
    await save(n);
  }
}

// Delete current user's rating document
async function clearRating() {
  if (!session.user) return;
  saving.value = true;
  try {
    const ref = doc(db, "ratings", String(props.classId), "userRatings", session.user.uid);
    await deleteDoc(ref);
  } finally {
    saving.value = false;
  }
}
</script>
