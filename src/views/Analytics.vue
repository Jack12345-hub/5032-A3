<template>
  <div class="wrap">
    <h2>📊 Gym Analytics</h2>
    <div class="cards">
      <div class="card"><Bar :data="levelData" :options="opts" /></div>
      <div class="card"><Line :data="bookingData" :options="opts" /></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Bar, Line } from "vue-chartjs";
import { Chart, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from "chart.js";
Chart.register(BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

// demo: can be replaced with aggregated data from Firestore
const levelData = ref({
  labels: ["Gold","Silver","Bronze"],
  datasets:[{ label:"Members", data:[12,18,9] }]
});
const bookingData = ref({
  labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
  datasets:[{ label:"Bookings", data:[4,6,5,7,3,8,2] }]
});
const opts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:"bottom"}} };
</script>

<style scoped>
.wrap{max-width:1000px;margin:24px auto}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{height:360px;padding:12px;border:1px solid #eee;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
@media (max-width:900px){.cards{grid-template-columns:1fr}}
</style>
