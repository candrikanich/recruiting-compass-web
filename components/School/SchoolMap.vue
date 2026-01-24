<template>
  <div class="school-map">
    <div
      v-if="hasCoordinates"
      ref="mapContainer"
      class="h-48 w-full rounded-lg overflow-hidden border border-slate-300"
    ></div>
    <div
      v-else
      class="h-48 w-full rounded-lg flex items-center justify-center bg-slate-50 border border-slate-300"
    >
      <p class="text-sm text-center px-4 text-slate-600">
        No location data available.<br />
        <span class="text-xs">Use "Lookup" to fetch coordinates.</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import type { Map as LeafletMap, Marker } from "leaflet";

const props = defineProps<{
  latitude?: number | null;
  longitude?: number | null;
  schoolName?: string;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: LeafletMap | null = null;
let marker: Marker | null = null;

const hasCoordinates = computed(() => {
  return props.latitude != null && props.longitude != null;
});

const initMap = async () => {
  if (!mapContainer.value || !hasCoordinates.value) return;

  // Dynamic import of Leaflet (client-side only)
  const L = await import("leaflet");

  // Import Leaflet CSS
  await import("leaflet/dist/leaflet.css");

  // Fix for default marker icons in bundled apps
  const iconProto = L.Icon.Default.prototype as any;
  delete iconProto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });

  const lat = props.latitude!;
  const lng = props.longitude!;

  map = L.map(mapContainer.value, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([lat, lng], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  marker = L.marker([lat, lng]).addTo(map);

  if (props.schoolName) {
    marker.bindPopup(`<strong>${props.schoolName}</strong>`).openPopup();
  }
};

const updateMarker = async () => {
  if (!map || !hasCoordinates.value) return;

  const L = await import("leaflet");
  const lat = props.latitude!;
  const lng = props.longitude!;

  map.setView([lat, lng], 13);

  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng]).addTo(map);
  }

  if (props.schoolName && marker) {
    marker.bindPopup(`<strong>${props.schoolName}</strong>`);
  }
};

watch([() => props.latitude, () => props.longitude], () => {
  if (map) {
    updateMarker();
  } else if (hasCoordinates.value) {
    initMap();
  }
});

onMounted(() => {
  if (hasCoordinates.value) {
    initMap();
  }
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
    marker = null;
  }
});
</script>

<style>
.school-map {
  min-height: 12rem;
}
</style>
