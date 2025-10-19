<template>
  <div class="map-container">
    <div class="head">
      <h2>💪 Find Nearby Gyms</h2>

      <div class="controls">
        <!-- Added: Search box (Places Autocomplete) -->
        <input
          ref="searchInput"
          type="text"
          class="search"
          placeholder="Search suburb, address or landmark…"
          aria-label="Search area"
        />

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
        <button class="btn" @click="useMapCenter">Search this area</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div id="map"></div>

    <div class="legend">
      <span class="dot user"></span> You
      <span class="sep">•</span>
      <span class="dot gym"></span> Gyms ({{ markerCount }})
      <span class="sep">•</span>
      <span class="ring"></span> Radius {{ radiusKm }} km
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
// Optional: enable MarkerClusterer for clearer display of many points
// npm i @googlemaps/markerclusterer
// import { MarkerClusterer } from "@googlemaps/markerclusterer";

const error = ref("");
const radiusKm = ref(3);        // Search radius (km)
const openNowOnly = ref(false); // Show only open gyms
const markerCount = ref(0);
const searchInput = ref(null);  // Added: reference to search input

let map = null;
let infoWindow = null;
let idleListener = null;
let geolocateMarker = null;
let searchMarker = null;        // Added: marker for search center
let radiusCircle = null;        // Added: circle showing search radius
const gymMarkers = [];
let clusterer = null; // If MarkerClusterer is used, this manages markers
let refreshTimer = null;
let autocomplete = null;        // Added: Places Autocomplete instance

const MELBOURNE_CBD = { lat: -37.8136, lng: 144.9631 };

/** Utility: Clear all current gym markers */
function clearGymMarkers() {
  if (clusterer) {
    clusterer.clearMarkers();
  }
  gymMarkers.forEach(m => m.setMap && m.setMap(null));
  gymMarkers.length = 0;
  markerCount.value = 0;
}

/** Utility: Add a single place marker and attach InfoWindow */
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
      `<div style="max-width:240px;line-height:1.35">
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

/** Core: Perform Places Nearby Search around center (handle pagination, max ~60 results) */
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
        error.value = "Failed to fetch results from Places API: ensure Places API and billing are enabled, or check your quota.";
      }
      if (clusterer) clusterer.addMarkers(gymMarkers);
      return;
    }

    results.forEach(addGymMarker);
    totalFetched += results.length;

    if (pagination && pagination.hasNextPage) {
      setTimeout(() => pagination.nextPage(), 400);
    } else {
      if (clusterer) {
        clusterer.clearMarkers();
        clusterer.addMarkers(gymMarkers);
      }
    }
  }

  service.nearbySearch(request, handlePage);
}

/** Draw or update radius circle */
function drawRadiusCircle(center) {
  const meters = Math.round(radiusKm.value * 1000);
  if (!radiusCircle) {
    radiusCircle = new google.maps.Circle({
      strokeColor: "#2b78ff",
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
      fillColor: "#2b78ff",
      fillOpacity: 0.08,
      map,
      center,
      radius: meters,
      clickable: false,
    });
  } else {
    radiusCircle.setCenter(center);
    radiusCircle.setRadius(meters);
    if (!radiusCircle.getMap()) radiusCircle.setMap(map);
  }
}

/** Initialize search from center: mark user/search point, trigger search, and set idle listener for auto refresh */
function initSearch(center, opts = { markUser: false, markSearch: false }) {
  if (!map) return;

  // User location marker
  if (opts.markUser) {
    if (geolocateMarker) geolocateMarker.setMap(null);
    geolocateMarker = new google.maps.Marker({
      position: center,
      map,
      title: "You are here 🧍‍♂️",
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    });
  }

  // Search center marker (from autocomplete)
  if (opts.markSearch) {
    if (searchMarker) searchMarker.setMap(null);
    searchMarker = new google.maps.Marker({
      position: center,
      map,
      title: "Search center",
      icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
    });
  }

  map.setCenter(center);
  drawRadiusCircle(center);
  clearGymMarkers();
  findGymsNear(center);

  if (idleListener) {
    google.maps.event.removeListener(idleListener);
  }
  idleListener = map.addListener("idle", () => {
    // Update radius circle after drag/zoom, avoid too frequent searches
    drawRadiusCircle(map.getCenter());
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      clearGymMarkers();
      findGymsNear(map.getCenter());
    }, 500);
  });
}

/** Manual refresh button: re-search from current map center */
function manualRefresh() {
  if (!map) return;
  clearGymMarkers();
  findGymsNear(map.getCenter());
}

/** Added: Use current map center as new search area */
function useMapCenter() {
  if (!map) return;
  initSearch(map.getCenter(), { markUser: false, markSearch: true });
}

/** When radius or openNowOnly changes, update circle and refresh results */
watch(radiusKm, () => {
  if (!map) return;
  drawRadiusCircle(map.getCenter());
  manualRefresh();
});
watch(openNowOnly, () => manualRefresh());

onMounted(() => {
  if (!window.google || !window.google.maps) {
    error.value = "Google Maps failed to load. Check your API key and ensure libraries=places is included.";
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

  // If using MarkerClusterer, uncomment and ensure dependency is installed
  // clusterer = new MarkerClusterer({ map, markers: [] });

  // Initialize Places Autocomplete
  if (searchInput.value) {
    autocomplete = new google.maps.places.Autocomplete(searchInput.value, {
      fields: ["geometry", "name", "formatted_address"],
      // types: ["geocode"], // uncomment to restrict to addresses only
    });
    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place || !place.geometry) {
        error.value = "Selected place has no geometry. Try another search.";
        return;
      }
      error.value = "";

      // Use viewport when available, else center + appropriate zoom
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
        // Slightly zoom in to avoid too wide a view
        const listener = map.addListener("idle", () => {
          if (map.getZoom() > 16) map.setZoom(16);
          google.maps.event.removeListener(listener);
          initSearch(place.geometry.location, { markSearch: true });
        });
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(15);
        initSearch(place.geometry.location, { markSearch: true });
      }
    });
  }

  // Attempt to locate user first
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        initSearch(userCenter, { markUser: true });
      },
      () => {
        error.value = "Unable to access your location. Showing gyms near Melbourne CBD instead.";
        initSearch(MELBOURNE_CBD, { markUser: false });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  } else {
    error.value = "Geolocation not supported. Showing gyms near Melbourne CBD instead.";
    initSearch(MELBOURNE_CBD, { markUser: false });
  }
});

// Cleanup resources on unmount
onBeforeUnmount(() => {
  if (idleListener) {
    google.maps.event.removeListener(idleListener);
    idleListener = null;
  }
  clearTimeout(refreshTimer);
  if (geolocateMarker) geolocateMarker.setMap(null);
  if (searchMarker) searchMarker.setMap(null);
  if (radiusCircle) radiusCircle.setMap(null);
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

/* Added: search box styling */
.controls .search {
  width: 280px;
  max-width: 50vw;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
}
.controls .search:focus {
  border-color: #2b78ff;
  box-shadow: 0 0 0 3px rgba(43,120,255,.12);
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

/* Decorative circle indicator */
.legend .ring {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #2b78ff;
  border-radius: 999px;
  transform: translateY(1px);
}
</style>
