<template>
  <div class="map-container">
    <div class="head">
      <h2>💪 Find Nearby Gyms</h2>
      <div class="controls">
        <label>
          Radius:
          <select v-model.number="radiusKm">
            <option :value="1">1 km</option>
            <option :value="2">2 km</option>
            <option :value="3">3 km</option>
            <option :value="5">5 km</option>
          </select>
        </label>
        <label class="chk">
          <input type="checkbox" v-model="openNowOnly" />
          Open now
        </label>
        <button class="btn" @click="manualRefresh">Refresh</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div id="map"></div>

    <div class="legend">
      <span class="dot user"></span> You
      <span class="sep">•</span>
      <span class="dot gym"></span> Gyms ({{ markerCount }})
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
// 可选：安装并启用标记聚合（大量点位更清晰）
// npm i @googlemaps/markerclusterer
// import { MarkerClusterer } from "@googlemaps/markerclusterer";

const error = ref("");
const radiusKm = ref(3);        // 搜索半径（km）
const openNowOnly = ref(false); // 仅营业中
const markerCount = ref(0);

let map = null;
let infoWindow = null;
let idleListener = null;
let geolocateMarker = null;
const gymMarkers = [];
let clusterer = null; // 若启用 MarkerClusterer，用它来托管 markers
let refreshTimer = null;

const MELBOURNE_CBD = { lat: -37.8136, lng: 144.9631 };

/** 工具：清空当前的健身房标记 */
function clearGymMarkers() {
  if (clusterer) {
    clusterer.clearMarkers();
  }
  gymMarkers.forEach(m => m.setMap && m.setMap(null));
  gymMarkers.length = 0;
  markerCount.value = 0;
}

/** 工具：给单个 place 打点并绑定 InfoWindow */
function addGymMarker(place) {
  if (!place?.geometry?.location) return;

  const marker = new google.maps.Marker({
    position: place.geometry.location,
    map,
    title: place.name,
  });

  marker.addListener("click", () => {
    const addr = place.vicinity || place.formatted_address || "";
    const rating = place.rating ? `⭐ ${place.rating}` : "";
    const total = place.user_ratings_total ? ` (${place.user_ratings_total})` : "";
    const ratingHtml = rating ? `<div style="margin-top:4px">${rating}${total}</div>` : "";

    infoWindow.setContent(
      `<div style="max-width:220px">
         <strong>${place.name}</strong>
         <div>${addr}</div>
         ${ratingHtml}
       </div>`
    );
    infoWindow.open(map, marker);
  });

  gymMarkers.push(marker);
  markerCount.value = gymMarkers.length;
}

/** 关键：基于中心点进行 Places 附近搜索（处理分页，最多 ~60 条） */
function findGymsNear(center) {
  if (!map) return;
  const service = new google.maps.places.PlacesService(map);
  let totalFetched = 0;

  const request = {
    location: center,
    radius: Math.round(radiusKm.value * 1000), // meters
    type: "gym",
    openNow: openNowOnly.value || false,
  };

  function handlePage(results, status, pagination) {
    if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
      if (totalFetched === 0) {
        error.value = "无法从 Places API 获取结果：请检查是否启用 Places API 与计费，或是否超出配额。";
      }
      // 尝试在错误时也更新聚合器（清空或已有的）
      if (clusterer) clusterer.addMarkers(gymMarkers);
      return;
    }

    results.forEach(addGymMarker);
    totalFetched += results.length;

    if (pagination && pagination.hasNextPage) {
      // 官方建议 nextPage 前延迟，避免速率限制
      setTimeout(() => pagination.nextPage(), 400);
    } else {
      // 分页结束后再统一聚合（如果启用）
      if (clusterer) {
        clusterer.clearMarkers();
        clusterer.addMarkers(gymMarkers);
      }
    }
  }

  service.nearbySearch(request, handlePage);
}

/** 根据给定中心初始化搜索：标记用户点、触发搜索并绑定 idle 监听做自动刷新 */
function initSearch(center, markUser = false) {
  if (markUser) {
    // 清理旧用户标记
    if (geolocateMarker) geolocateMarker.setMap(null);
    geolocateMarker = new google.maps.Marker({
      position: center,
      map,
      title: "You are here 🧍‍♂️",
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    });
  }

  map.setCenter(center);
  clearGymMarkers();
  findGymsNear(center);

  // 监听地图 idle（拖拽/缩放结束），节流后重搜
  if (idleListener) {
    google.maps.event.removeListener(idleListener);
  }
  idleListener = map.addListener("idle", () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      clearGymMarkers();
      findGymsNear(map.getCenter());
    }, 500);
  });
}

/** 手动刷新按钮：根据当前中心重搜 */
function manualRefresh() {
  if (!map) return;
  clearGymMarkers();
  findGymsNear(map.getCenter());
}

onMounted(() => {
  if (!window.google || !window.google.maps) {
    error.value = "Google Maps failed to load. Check your API key and libraries=places.";
    return;
  }

  map = new google.maps.Map(document.getElementById("map"), {
    center: MELBOURNE_CBD,
    zoom: 14,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  infoWindow = new google.maps.InfoWindow();

  // 若启用聚合，请取消注释并确保已安装依赖
  // clusterer = new MarkerClusterer({ map, markers: [] });

  // 优先尝试定位用户
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        initSearch(userCenter, true);
      },
      () => {
        error.value = "无法访问你的定位，将显示墨尔本市中心附近的健身房。";
        initSearch(MELBOURNE_CBD, false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  } else {
    error.value = "浏览器不支持定位，将显示墨尔本市中心附近的健身房。";
    initSearch(MELBOURNE_CBD, false);
  }
});

// 卸载时清理资源
onBeforeUnmount(() => {
  if (idleListener) {
    google.maps.event.removeListener(idleListener);
    idleListener = null;
  }
  clearTimeout(refreshTimer);
  if (geolocateMarker) geolocateMarker.setMap(null);
  clearGymMarkers();
  if (infoWindow) infoWindow.close();
});
</script>

<style scoped>
.map-container {
  text-align: center;
  margin: 20px auto;
  max-width: 980px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.controls .chk {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}
.btn:hover {
  background: #f5f5f5;
}

#map {
  width: 100%;
  height: 520px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}

.error {
  color: #d00;
  margin: 6px 0 10px;
}

.legend {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.legend .dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}
.legend .dot.user { background: #2b78ff; }
.legend .dot.gym  { background: #4caf50; }
.legend .sep { opacity: .5; }
</style>
