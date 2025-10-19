<template>
  <div class="container py-4" style="max-width: 880px">
    <h1 class="mb-3">Admin: Class Reminder</h1>
    <p class="text-muted">Send reminder emails to all users who booked a selected class.</p>

    <!-- Status messages -->
    <div v-if="loading" class="alert alert-secondary py-2">Loading classes…</div>
    <div v-if="err" class="alert alert-danger py-2" role="alert">{{ err }}</div>
    <div v-if="msg" class="alert" :class="ok ? 'alert-success' : 'alert-warning'" role="status">
      {{ msg }}
    </div>

    <!-- Message shown when no classes exist -->
    <div v-if="!loading && classes.length === 0" class="alert alert-info">
      No classes found. Go to <RouterLink to="/book">Book</RouterLink> page to seed demo classes first.
    </div>

    <!-- Form -->
    <form v-if="classes.length" @submit.prevent>
      <div class="mb-3">
        <label class="form-label" for="cls">Class</label>
        <select id="cls" class="form-select" v-model="form.classId" required>
          <option disabled value="">-- Choose a class --</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">
            {{ c.name }} — {{ c.time }} ({{ c.enrolled }}/{{ c.capacity }})
          </option>
        </select>
        <div class="form-text">
          Current enrollments are displayed for reference.
        </div>
      </div>

      <div class="row g-3">
        <div class="col-md-8">
          <label class="form-label" for="subj">Email Subject</label>
          <input id="subj" class="form-control" v-model.trim="form.subject"
                 placeholder="(Optional) e.g., Reminder: Yoga Flow tomorrow" />
        </div>
        <div class="col-md-4">
          <label class="form-label" for="max">Max recipients</label>
          <input id="max" type="number" min="1" class="form-control" v-model.number="form.max" />
          <div class="form-text">Safety limit (default 200).</div>
        </div>
      </div>

      <div class="mt-3">
        <label class="form-label" for="text">Plain Text (for clients without HTML)</label>
        <textarea id="text" class="form-control" rows="3" v-model="form.text"
                  placeholder="Optional plain-text body."></textarea>
      </div>

      <div class="mt-3">
        <label class="form-label" for="html">HTML Body</label>
        <textarea id="html" class="form-control" rows="4" v-model="form.html"
                  placeholder="<p>Optional <b>HTML</b> body.</p>"></textarea>
        <div class="form-text">
          If subject/text/html are empty, the server will generate a default message based on the class.
        </div>
      </div>

      <div class="d-flex align-items-center gap-2 mt-3">
        <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="preview">
          {{ busy && mode==='preview' ? 'Previewing…' : 'Preview recipients' }}
        </button>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="sendNow">
          {{ busy && mode==='send' ? 'Sending…' : 'Send reminder' }}
        </button>
      </div>
    </form>

    <!-- Dry run results -->
    <div v-if="previewList.length" class="card mt-4">
      <div class="card-header">Preview recipients (dry run) — {{ previewList.length }}</div>
      <div class="card-body small">
        <code style="white-space: pre-wrap">{{ previewList.join(', ') }}</code>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// ⛳ Replace with your deployed Cloud Function URL
const REMINDER_URL =
  "https://australia-southeast2-week7-siyi.cloudfunctions.net/sendClassReminder";

const db = getFirestore();
const classes = ref([]);
const loading = ref(true);
const busy = ref(false);
const ok = ref(false);
const err = ref("");
const msg = ref("");
const mode = ref("");           // 'preview' | 'send'
const previewList = ref([]);

const form = ref({
  classId: "",
  subject: "",
  text: "",
  html: "",
  max: 200,
});

onMounted(loadClasses);

async function loadClasses() {
  loading.value = true;
  err.value = "";
  try {
    const snap = await getDocs(collection(db, "classes"));
    classes.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error(e);
    err.value = e.message || "Failed to load classes.";
  } finally {
    loading.value = false;
  }
}

function payload(dryRun) {
  const p = {
    classId: form.value.classId,
    dryRun: !!dryRun,
    max: form.value.max || undefined,
  };
  if (form.value.subject?.trim()) p.subject = form.value.subject.trim();
  if (form.value.text?.trim()) p.text = form.value.text.trim();
  if (form.value.html?.trim()) p.html = form.value.html.trim();
  return p;
}

// Utility function to get the selected class
function getPicked() {
  return classes.value.find(c => c.id === form.value.classId) || null;
}

async function preview() {
  if (!form.value.classId) { msg.value = "Please choose a class."; ok.value = false; return; }
  busy.value = true; mode.value = "preview"; msg.value = ""; err.value = ""; ok.value = false;
  previewList.value = [];
  try {
    const r = await fetch(REMINDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(true)),   // dryRun = true
    });
    const data = await r.json();
    if (!r.ok || data.ok === false) throw new Error(data.error || "Preview failed");

    previewList.value = data.recipients || [];

    // ✅ Fallback: if backend doesn't return class info, use the local selection
    const picked = getPicked();
    const clsName = data.class?.name ?? picked?.name ?? "(unknown)";
    const clsTime = data.class?.time ?? picked?.time ?? "(unknown)";

    ok.value = true;
    msg.value = `Dry run OK for "${clsName}" at ${clsTime}. ${previewList.value.length} recipient(s) found.`;
  } catch (e) {
    err.value = e.message || "Preview failed.";
  } finally {
    busy.value = false;
  }
}

async function sendNow() {
  if (!form.value.classId) { msg.value = "Please choose a class."; ok.value = false; return; }
  busy.value = true; mode.value = "send"; msg.value = ""; err.value = ""; ok.value = false;
  try {
    const r = await fetch(REMINDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(false)),  // dryRun = false
    });
    const data = await r.json();
    if (!r.ok || data.ok === false) throw new Error(data.error || "Send failed");

    // ✅ Fallback: if backend doesn't return class info, use the local selection
    const picked = getPicked();
    const clsName = data.class?.name ?? picked?.name ?? "(unknown)";
    const clsTime = data.class?.time ?? picked?.time ?? "(unknown)";

    ok.value = true;
    if ((data.sent ?? 0) > 0) {
      msg.value = `Sent ${data.sent} reminder(s) for class "${clsName}" at ${clsTime}.`;
    } else {
      msg.value = `No recipients found for class "${clsName}" at ${clsTime}.`;
    }
  } catch (e) {
    err.value = e.message || "Send failed.";
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.card-header { font-weight: 600; }
</style>
