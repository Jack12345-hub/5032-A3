<template>
  <section id="app" style="padding:24px">
    <h1>Book Counter</h1>

    <button @click="getBookCount">Get Book Count</button>

    <!-- 6.3: Conditional rendering logic -->
    <p v-if="count !== null">Total number of books: {{ count }}</p>
    <p v-else-if="error">{{ error }}</p>
  </section>
</template>

<script>
import axios from 'axios';

export default {
  name: 'GetBookCountView',
  data() {
    return {
      count: null, // 6.3: set to null when there is no data
      error: null,
    };
  },
  methods: {
    // 6.5 + 6.6: use async/await with axios and try/catch
    async getBookCount() {
      this.error = null;
      try {
        // ⚠️ 9.4: Configure the real cloud function URL later.
        // For now, read from the environment variable; if not configured, show a friendly error.
        const url = import.meta.env.VITE_COUNT_URL;
        if (!url) throw new Error('Count service URL not configured yet (set VITE_COUNT_URL in .env during 9.4).');

        const response = await axios.get(url);
        // Expect backend to return { count: number }
        this.count = response.data.count;
      } catch (err) {
        console.error('Error fetching book count:', err);
        // 6.3: When count is not available, show "error" (or a more descriptive message)
        this.error = 'error';
        this.count = null;
      }
    },
  },
};
</script>
