<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-bold text-slate-900">🗺️ School Locations</h3>
      <div class="text-sm text-slate-600">
        {{ schools.length }} schools mapped
      </div>
    </div>

    <div
      v-if="schools.length > 0"
      class="relative h-96 rounded-lg overflow-hidden border border-slate-200"
    >
      <div ref="mapContainer" class="w-full h-full"></div>
    </div>

    <div
      v-else
      class="h-96 flex flex-col items-center justify-center rounded-lg bg-slate-50 text-slate-600"
    >
      <MapPinIcon class="w-12 h-12 mb-3 text-slate-400" />
      <p class="text-sm font-medium">No school locations to display</p>
      <p class="text-xs text-slate-500 mt-1">
        Schools will appear on the map once you add them
      </p>
      <NuxtLink
        to="/schools/new"
        class="mt-4 px-4 py-2 bg-brand-blue-500 text-white text-sm rounded-lg hover:bg-brand-blue-600 transition-colors"
      >
        Add School
      </NuxtLink>
    </div>

    <!-- Legend -->
    <div
      v-if="schools.length > 0"
      class="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm"
      role="list"
      aria-label="School status legend"
    >
      <div class="flex items-center gap-2 text-slate-600" role="listitem">
        <div
          class="w-5 h-5 rounded-full bg-slate-400 border-2 border-slate-600 flex items-center justify-center"
        >
          <span class="text-white text-xs font-bold" aria-hidden="true">?</span>
        </div>
        <span>Researching</span>
      </div>
      <div class="flex items-center gap-2 text-slate-900" role="listitem">
        <div
          class="w-5 h-5 rounded-full bg-blue-500 border-2 border-slate-600 flex items-center justify-center"
        >
          <svg
            class="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span>Contacted</span>
      </div>
      <div class="flex items-center gap-2 text-slate-900" role="listitem">
        <div
          class="w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-600 flex items-center justify-center"
        >
          <svg
            class="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
        </div>
        <span>Interested</span>
      </div>
      <div class="flex items-center gap-2 text-slate-900" role="listitem">
        <div
          class="w-5 h-5 rounded-full bg-orange-500 border-2 border-slate-600 flex items-center justify-center"
        >
          <svg
            class="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"
            />
          </svg>
        </div>
        <span>Offer</span>
      </div>
      <div class="flex items-center gap-2 text-slate-900" role="listitem">
        <div
          class="w-5 h-5 rounded-full bg-red-500 border-2 border-slate-600 flex items-center justify-center"
        >
          <svg
            class="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <span>Committed</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import L from "leaflet";
import { MapPinIcon } from "@heroicons/vue/24/outline";
import { useUserStore } from "~/stores/user";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import type { School } from "~/types/models";

interface Props {
  schools: School[];
}

const props = defineProps<Props>();
const mapContainer = ref<HTMLDivElement | null>(null);
const userStore = useUserStore();
const preferenceManager = usePreferenceManager();
let mapInstance: L.Map | null = null;
let isInitializing = false;

const getMapCenter = (): [number, number] => {
  const locationPref = preferenceManager.getHomeLocation.value;
  if (locationPref?.latitude && locationPref?.longitude) {
    return [locationPref.latitude, locationPref.longitude];
  }
  return [39.8283, -98.5795];
};

const getMarkerColor = (status?: string): string => {
  // Resolve design token colors
  const root = document.documentElement;
  const statusColorMap: Record<string, string> = {
    contacted:
      getComputedStyle(root).getPropertyValue("--brand-blue-500").trim() ||
      "#3b82f6",
    interested:
      getComputedStyle(root).getPropertyValue("--brand-emerald-500").trim() ||
      "#10b981",
    offer_received:
      getComputedStyle(root).getPropertyValue("--brand-orange-500").trim() ||
      "#f59e0b",
    committed:
      getComputedStyle(root).getPropertyValue("--destructive").trim() ||
      "#ef4444",
  };
  return (
    statusColorMap[status || ""] ||
    getComputedStyle(root).getPropertyValue("--muted-foreground").trim() ||
    "#9ca3af"
  );
};

const createMarkerIcon = (color: string) => {
  return L.divIcon({
    html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}"></div>`,
    iconSize: [32, 32],
    className: "custom-marker",
  });
};

const initializeMap = () => {
  try {
    if (!mapContainer.value || isInitializing) return;

    isInitializing = true;

    // Destroy existing map instance if it exists
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }

    // Clear the container
    if (mapContainer.value) {
      mapContainer.value.innerHTML = "";
    }

    const center = getMapCenter();
    const zoom = props.schools.length > 0 ? 3 : 6;

    // Initialize map
    mapInstance = L.map(mapContainer.value).setView(center, zoom);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapInstance);

    // Add home location marker if no schools
    if (
      props.schools.length === 0 &&
      (center[0] !== 39.8283 || center[1] !== -98.5795)
    ) {
      const homeMarker = L.marker(center, {
        icon: L.divIcon({
          html: '<div class="w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-lg flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg></div>',
          iconSize: [32, 32],
          className: "custom-marker",
        }),
        title: "Your Home Location",
      }).bindPopup(`
        <div class="text-sm">
          <p class="font-bold">Your Home Location</p>
          <p class="text-gray-600">Schools will appear on the map as you add them</p>
        </div>
      `);

      homeMarker.addTo(mapInstance);
    }

    // Add school markers if schools exist
    if (props.schools.length > 0) {
      const schoolsWithCoords: Array<School & { lat: number; lng: number }> =
        [];

      props.schools.forEach((school) => {
        // Use actual coordinates from academic_info if available
        const lat = school.academic_info?.latitude;
        const lng = school.academic_info?.longitude;

        if (typeof lat === "number" && typeof lng === "number") {
          schoolsWithCoords.push({ ...school, lat, lng });
        }
      });

      // Create a feature group for clustering
      const markerGroup = L.featureGroup();

      schoolsWithCoords.forEach((school) => {
        const color = getMarkerColor(school.status);
        const marker = L.marker([school.lat, school.lng], {
          icon: createMarkerIcon(color),
          title: school.name,
        });

        const city = school.academic_info?.city || school.city || "";
        const state = school.academic_info?.state || school.state || "";
        const location =
          [city, state].filter(Boolean).join(", ") || "Location TBD";

        marker.bindPopup(`
          <div style="font-size: 12px; min-width: 280px;">
            <p style="margin: 4px 0; font-weight: bold; font-size: 13px;">${school.name}</p>
            <p style="margin: 2px 0; color: #666;">${location}</p>
            <p style="margin: 2px 0; color: #666; text-transform: capitalize;">Status: ${school.status?.replace("_", " ") || "Unknown"}</p>
          </div>
        `);

        marker.addTo(markerGroup);
      });

      markerGroup.addTo(mapInstance);

      // Fit bounds to all markers with animation disabled to prevent zoom animation crashes
      if (markerGroup.getLayers().length > 0) {
        mapInstance.fitBounds(markerGroup.getBounds(), {
          padding: [50, 50],
          animate: false,
          duration: 0,
        });
      }
    }

    isInitializing = false;
  } catch (error) {
    console.error("[SchoolMapWidget] Error initializing map:", error);
    isInitializing = false;
  }
};

onMounted(() => {
  initializeMap();
});

watch(
  () => props.schools,
  () => {
    initializeMap();
  },
);
</script>

<style scoped>
:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.leaflet-popup) {
  margin-bottom: 0;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
}

:deep(.leaflet-popup-content) {
  margin: 0;
  width: auto !important;
  min-width: 280px;
  max-width: 320px;
}

:deep(.leaflet-popup-tip) {
  background: white;
}
</style>
