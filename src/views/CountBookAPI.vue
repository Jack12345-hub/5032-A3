<template>
  <section style="padding:16px;max-width:820px;margin:0 auto">
    <h2>Count Book API (Cloud Functions)</h2>

    <p v-if="loading">Loading...</p>
    <p v-if="error" style="color:#c00">{{ error }}</p>

    <!-- As required by the lecture: wrap raw JSON in <pre> -->
    <pre v-if="jsondata">{{ formatted }}</pre>
  </section>
</template>

<script>
import axios from "axios";

export default {
  name: "CountBookAPI",
  data() {
    return {
      jsondata: null,
      error: null,
      loading: false,
    };
  },
  computed: {
    // Format JSON for better readability
    formatted() {
      return this.jsondata ? JSON.stringify(this.jsondata, null, 2) : "";
    },
  },
  mounted() {
    this.getBookCountAPI(); // Automatically fetch data when the page is loaded (no button needed)
  },
  methods: {
    async getBookCountAPI() {
      this.loading = true;
      this.error = null;
      this.jsondata = null;

      try {
        const url =
          import.meta.env.VITE_COUNT_URL ||
          ""; // Example: https://australia-southeast1-<your-project>.cloudfunctions.net/countBooks
        if (!url) throw new Error("Missing VITE_COUNT_URL in .env.local");

        const { data } = await axios.get(url);
        // According to the lecture: only return response.data
        this.jsondata = data;
      } catch (err) {
        console.error("Error fetching book count:", err);
        this.error =
          err?.response?.data?.error ||
          err?.message ||
          "Unknown error from Cloud Function";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
