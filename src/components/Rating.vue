<template>
  <div>
    <p class="mb-1">Average: {{ avg }} ({{ count }} ratings)</p>
    <div v-if="authed">
      <button v-for="n in 5" :key="n" class="btn btn-sm me-1"
              :class="n <= myScore ? 'btn-warning' : 'btn-outline-secondary'"
              @click="save(n)">{{ n <= myScore ? '★' : '☆' }}</button>
    </div>
    <div v-else class="text-muted">Please login to rate.</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";
import { session } from "../store/session";

const props = defineProps({ classId: { type: [String, Number], required: true } });
const authed = computed(() => !!session.user);

const scores = ref({});            // { uid: score }
const myScore = ref(0);
let unsub = null;

onMounted(() => {
  const col = collection(db, "ratings", String(props.classId), "userRatings");
  unsub = onSnapshot(col, (snap) => {
    const map = {};
    snap.forEach((d) => { map[d.id] = d.data().score || 0; });
    scores.value = map;
    myScore.value = session.user ? (map[session.user.uid] || 0) : 0;
  });
});
onBeforeUnmount(() => unsub && unsub());

const count = computed(() => Object.keys(scores.value).length);
const avg = computed(() => {
  const vals = Object.values(scores.value);
  if (!vals.length) return 0;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
});

async function save(n) {
  if (!session.user) return;
  const ref = doc(db, "ratings", String(props.classId), "userRatings", session.user.uid);
  await setDoc(ref, { uid: session.user.uid, score: n }, { merge: true });
}
</script>
