<!-- src/components/SendgridForm.vue -->
<template>
  <section class="sg-wrap" aria-labelledby="sg-title">
    <h2 id="sg-title">Contact / SendGrid Test</h2>
    <p class="sub">Fill the form and send via Firebase Cloud Functions + SendGrid.</p>

    <form @submit.prevent="onSubmit" novalidate>
      <div class="row">
        <div class="field">
          <label for="sg-name">Name</label>
          <input id="sg-name" v-model.trim="form.name" autocomplete="name" required />
          <small v-if="errors.name" class="err">{{ errors.name }}</small>
        </div>

        <div class="field">
          <label for="sg-email">Email</label>
          <input id="sg-email" v-model.trim="form.email" type="email" autocomplete="email" required />
          <small v-if="errors.email" class="err">{{ errors.email }}</small>
        </div>
      </div>

      <div class="field">
        <label for="sg-message">Message</label>
        <textarea id="sg-message" v-model="form.message" rows="5" placeholder="Say something…"></textarea>
      </div>

      <div class="field">
        <label for="sg-files">Attachments (optional, max 2 files, ≤ 5MB each)</label>
        <input id="sg-files" type="file" multiple @change="onFilesChange" />
        <small class="muted" v-if="fileInfo.length">
          {{ fileInfo.map(f => `${f.name} (${Math.round(f.size/1024)} KB)`).join(' · ') }}
        </small>
        <small v-if="errors.files" class="err">{{ errors.files }}</small>
      </div>

      <div class="endpoint pill" role="note" aria-live="polite">
        <strong>Endpoint</strong><small>{{ url }}</small>
      </div>

      <div class="actions">
        <button class="btn" type="submit" :disabled="isLoading">
          <span v-if="isLoading" class="spinner" aria-hidden="true"></span>
          {{ isLoading ? 'Sending…' : 'Send' }}
        </button>
        <button class="ghost" type="button" @click="reset">Clear</button>
        <span class="muted" :class="{ ok: okStatus, err: errStatus }">{{ statusText }}</span>
      </div>

      <pre v-show="debugText" class="log" aria-live="polite">{{ debugText }}</pre>
    </form>
  </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

/**
 * Props
 * - endpoint: Custom Cloud Function URL (optional).
 *   If not provided, it will use the environment variable VITE_SENDFEEDBACK_URL.
 */
const props = defineProps({
  endpoint: { type: String, default: '' }
});

const url = computed(() => props.endpoint || import.meta.env.VITE_SENDFEEDBACK_URL || '');

const form = reactive({
  name: '',
  email: '',
  message: '',
  files: /** @type {File[]} */([])
});

const fileInfo = ref([]);
const isLoading = ref(false);
const statusText = ref('');
const okStatus = ref(false);
const errStatus = ref(false);
const debugText = ref('');

const errors = reactive({
  name: '',
  email: '',
  files: ''
});

function reset() {
  form.name = '';
  form.email = '';
  form.message = '';
  form.files = [];
  fileInfo.value = [];
  isLoading.value = false;
  statusText.value = '';
  okStatus.value = false;
  errStatus.value = false;
  debugText.value = '';
  Object.keys(errors).forEach(k => errors[k] = '');
}

// Handle file input changes
function onFilesChange(e) {
  const files = Array.from(e.target.files || []);
  form.files = files.slice(0, 2); // limit to 2 files
  fileInfo.value = form.files;
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
}

// Validate input fields
function validate() {
  let ok = true;
  errors.name = '';
  errors.email = '';
  errors.files = '';

  if (!form.name || form.name.trim().length < 2) {
    errors.name = 'Name too short.';
    ok = false;
  }
  if (!validEmail(form.email)) {
    errors.email = 'Invalid email address.';
    ok = false;
  }
  if (form.files.some(f => f.size > 5 * 1024 * 1024)) {
    errors.files = 'Each file must be ≤ 5MB.';
    ok = false;
  }
  return ok;
}

// Convert a File to base64
async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function onSubmit() {
  if (!url.value) {
    errStatus.value = true;
    okStatus.value = false;
    statusText.value = 'Missing endpoint. Set prop "endpoint" or VITE_SENDFEEDBACK_URL.';
    return;
  }
  if (!validate()) return;

  try {
    isLoading.value = true;
    errStatus.value = false;
    okStatus.value = false;
    statusText.value = 'Sending…';
    debugText.value = '';

    // Process attachments
    const attachments = [];
    for (const f of form.files.slice(0, 2)) {
      attachments.push({
        filename: f.name,
        mimeType: f.type || 'application/octet-stream',
        contentBase64: await fileToBase64(f)
      });
    }

    const resp = await fetch(url.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message || '',
        attachments
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      errStatus.value = true;
      okStatus.value = false;
      statusText.value = 'Failed to send.';
      debugText.value = JSON.stringify(data, null, 2);
      return;
    }

    okStatus.value = true;
    errStatus.value = false;
    statusText.value = 'Sent successfully!';
    debugText.value = JSON.stringify(data, null, 2);
  } catch (e) {
    errStatus.value = true;
    okStatus.value = false;
    statusText.value = `Error: ${e?.message || e}`;
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.sg-wrap{max-width:880px;margin:32px auto;padding:0 16px}
h2{margin:0 0 8px}
.sub{color:#64748b;margin:0 0 20px}
form{background:#0b1220;border:1px solid #1f2937;border-radius:16px;padding:20px;color:#e5e7eb}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.field{margin-bottom:14px}
label{display:block;margin-bottom:6px;color:#cbd5e1;font-weight:600}
input,textarea{width:100%;border:1px solid #334155;background:#0b1220;color:#e5e7eb;border-radius:10px;padding:10px 12px;outline:none}
input:focus,textarea:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.15)}
textarea{resize:vertical;min-height:120px}
input::file-selector-button{background:#0b1220;border:1px solid #334155;color:#cbd5e1;border-radius:8px;padding:6px 10px;margin-right:10px;cursor:pointer}
.muted{color:#94a3b8;font-size:13px}
.err{color:#ef4444}
.ok{color:#22c55e}
.actions{display:flex;gap:12px;align-items:center;margin-top:10px}
.btn{background:#2563eb;color:#fff;border:0;border-radius:10px;padding:10px 16px;cursor:pointer}
.btn[disabled]{opacity:.6;cursor:not-allowed}
.ghost{background:transparent;border:1px solid #334155;color:#cbd5e1;border-radius:10px;padding:10px 16px;cursor:pointer}
.log{white-space:pre-wrap;background:#0a0f1d;border:1px dashed #334155;border-radius:12px;padding:12px;margin-top:14px;max-height:240px;overflow:auto}
.pill{display:inline-flex;gap:8px;align-items:center;padding:8px 10px;border-radius:999px;background:#0b1220;border:1px solid #334155;margin:8px 0}
.spinner{width:16px;height:16px;border:2px solid #93c5fd;border-top-color:transparent;border-radius:50%;display:inline-block;margin-right:8px;animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (max-width: 720px){ .row{grid-template-columns:1fr} }
</style>
