<template>
  <div class="container">
    <div class="header">
      <h1>WEATHER APP</h1>

      <div class="search-bar">
        <input
          type="text"
          v-model="city"
          placeholder="Enter city name (e.g. Clayton, AU)"
          class="search-input"
        />
        <button @click="searchByCity" class="search-button">Search</button>
      </div>
    </div>

    <!-- Main content: displayed only when data is available -->
    <main v-if="weatherData">
      <div id="weatherData">
        <h2>{{ weatherData.name }}, {{ weatherData.sys.country }}</h2>

        <div>
          <img :src="iconUrl" alt="Weather Icon" />
          <p>{{ temperature }} °C</p>
          <span>{{ weatherData.weather[0].description }}</span>
        </div>
      </div>
    </main>

    <p v-else class="hint">Tip: allow location access to auto-load current weather, or search for a city.</p>
  </div>
</template>

<script>
// 10.1.1 axios is used to make HTTP requests
import axios from "axios";

// Read API key from .env.local
const apikey = import.meta.env.VITE_OWM_KEY;

export default {
  name: "WeatherView",
  data() {
    return {
      city: "",
      weatherData: null, // Current weather data
    };
  },
  computed: {
    // Since units=metric is used, the temperature is already in Celsius (no need to convert from Kelvin)
    temperature() {
      return this.weatherData ? Math.round(this.weatherData.main.temp) : null;
    },
    // Weather icon URL (high-resolution @2x)
    iconUrl() {
      return this.weatherData
        ? `https://openweathermap.org/img/wn/${this.weatherData.weather[0].icon}@2x.png`
        : null;
    },
  },
  mounted() {
    // When the page loads, try to fetch weather data for the user's current location
    this.fetchCurrentLocationWeather();
  },
  methods: {
    // Fetch weather data for the current location
    async fetchCurrentLocationWeather() {
      if (!navigator.geolocation) {
        // If the browser doesn't support geolocation, default to Clayton
        this.searchByCity("Clayton, AU");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async ({ coords: { latitude, longitude } }) => {
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apikey}&units=metric`;
          await this.fetchWeatherData(url);
        },
        // Fallback when the user denies location access
        () => this.searchByCity("Clayton, AU")
      );
    },

    // Search weather by city name (triggered by button click)
    async searchByCity(q) {
      const query = typeof q === "string" ? q : this.city;
      if (!query) return;
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        query
      )}&appid=${apikey}&units=metric`;
      await this.fetchWeatherData(url);
    },

    // Common function to request and store weather data
    async fetchWeatherData(url) {
      try {
        const { data } = await axios.get(url);
        this.weatherData = data;
      } catch (error) {
        console.error("Error fetching weather data:", error);
        alert(
          "Failed to fetch weather: " +
            (error?.response?.data?.message || error.message)
        );
      }
    },
  },
};
</script>

<style scoped>
.container { padding: 16px; max-width: 720px; margin: 0 auto; }
.header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.search-bar { display: flex; gap: 8px; }
.search-input { padding: 8px 12px; min-width: 260px; }
.search-button { padding: 8px 12px; cursor: pointer; }
.hint { opacity: .7; margin-top: 16px; }
main img { vertical-align: middle; }
</style>
