<template>
  <section style="padding:16px;max-width:900px;margin:0 auto">
    <h2>Get All Book API (Cloud Functions)</h2>
    <p v-if="loading">Loading...</p>
    <p v-if="error" style="color:#c00">{{ error }}</p>
    <pre v-if="jsondata">{{ pretty }}</pre>
  </section>
</template>

<script>
import axios from "axios";

export default {
  name: "GetAllBookAPI",
  data() {
    return { jsondata: null, error: null, loading: false };
  },
  computed: {
    // Format JSON output for better readability
    pretty() { return this.jsondata ? JSON.stringify(this.jsondata, null, 2) : ""; }
  },
  mounted() { this.load(); }, // Automatically fetch data when the page loads
  methods: {
    async load() {
      this.loading = true; this.error = null; this.jsondata = null;
      try {
        const url = import.meta.env.VITE_GETALLBOOKS_URL;
        if (!url) throw new Error("Missing VITE_GETALLBOOKS_URL");
        const { data } = await axios.get(url);
        this.jsondata = data; // Only use response.data
      } catch (e) {
        console.error(e);
        this.error = e?.response?.data?.error || e.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
