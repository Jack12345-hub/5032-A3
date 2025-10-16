<template>
  <div class="map-container">
    <h2>💪 Find Nearby Gyms</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <div id="map"></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";

const error = ref("");

onMounted(() => {
  if (!window.google || !window.google.maps) {
    error.value = "Google Maps failed to load. Check your API key.";
    return;
  }

  // 默认墨尔本中心
  const defaultLocation = { lat: -37.8136, lng: 144.9631 };

  const map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 13,
  });

  // 尝试获取用户当前位置
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        map.setCenter(userPos);

        new google.maps.Marker({
          position: userPos,
          map,
          title: "You are here 🧍‍♂️",
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
      },
      () => {
        error.value = "Could not access your location, showing Melbourne city instead.";
      }
    );
  } else {
    error.value = "Geolocation is not supported by this browser.";
  }

  // 示例健身房数据（可改为从 Firestore 读取）
  const gyms = [
    { name: "PowerFit Gym", lat: -37.8105, lng: 144.964, address: "123 Collins St, Melbourne" },
    { name: "FlexZone Fitness", lat: -37.817, lng: 144.971, address: "200 Swanston St, Melbourne" },
    { name: "Core Strength Studio", lat: -37.815, lng: 144.955, address: "88 King St, Melbourne" },
  ];

  // 添加标记
  gyms.forEach((gym) => {
    const marker = new google.maps.Marker({
      position: { lat: gym.lat, lng: gym.lng },
      map,
      title: gym.name,
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<h4>${gym.name}</h4><p>${gym.address}</p>`,
    });

    marker.addListener("click", () => {
      infoWindow.open(map, marker);
    });
  });
});
</script>

<style scoped>
.map-container {
  text-align: center;
  margin: 20px auto;
  max-width: 900px;
}
#map {
  width: 100%;
  height: 500px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.error {
  color: red;
  margin: 10px 0;
}
</style>
