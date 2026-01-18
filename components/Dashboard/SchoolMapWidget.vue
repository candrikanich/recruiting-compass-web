<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-bold text-slate-900">🗺️ School Locations</h3>
      <div class="text-sm text-slate-600">{{ schools.length }} schools mapped</div>
    </div>

    <div v-if="schools.length > 0" class="relative h-96 rounded-lg overflow-hidden border border-slate-200">
      <div ref="mapContainer" class="w-full h-full"></div>
    </div>

    <div v-else class="h-96 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600">
      <p>Add schools to see them on the map</p>
    </div>

    <!-- Legend -->
    <div v-if="schools.length > 0" class="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
      <div class="flex items-center gap-2 text-slate-600">
        <div class="w-3 h-3 rounded-full bg-slate-400"></div>
        <span>Researching</span>
      </div>
      <div class="flex items-center gap-2 text-slate-900">
        <div class="w-3 h-3 rounded-full bg-blue-500"></div>
        <span>Contacted</span>
      </div>
      <div class="flex items-center gap-2 text-slate-900">
        <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
        <span>Interested</span>
      </div>
      <div class="flex items-center gap-2 text-slate-900">
        <div class="w-3 h-3 rounded-full bg-orange-500"></div>
        <span>Offer</span>
      </div>
      <div class="flex items-center gap-2 text-slate-900">
        <div class="w-3 h-3 rounded-full bg-red-500"></div>
        <span>Committed</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import L from 'leaflet'
import type { School } from '~/types/models'

interface Props {
  schools: School[]
}

const props = defineProps<Props>()
const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: L.Map | null = null

const getMarkerColor = (status?: string): string => {
  // Resolve design token colors
  const root = document.documentElement
  const statusColorMap: Record<string, string> = {
    contacted: getComputedStyle(root).getPropertyValue('--brand-blue-500').trim() || '#3b82f6',
    interested: getComputedStyle(root).getPropertyValue('--brand-emerald-500').trim() || '#10b981',
    offer_received: getComputedStyle(root).getPropertyValue('--brand-orange-500').trim() || '#f59e0b',
    committed: getComputedStyle(root).getPropertyValue('--destructive').trim() || '#ef4444',
  }
  return statusColorMap[status || ''] || (getComputedStyle(root).getPropertyValue('--muted-foreground').trim() || '#9ca3af')
}

const createMarkerIcon = (color: string) => {
  return L.divIcon({
    html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}"></div>`,
    iconSize: [32, 32],
    className: 'custom-marker',
  })
}

onMounted(() => {
  if (!mapContainer.value || props.schools.length === 0) return

  // Initialize map centered on US
  mapInstance = L.map(mapContainer.value).setView([39.8283, -98.5795], 3)

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mapInstance)

  // Add markers for schools
  const schoolsWithCoords: Array<School & { lat: number; lng: number }> = []

  props.schools.forEach((school) => {
    // Use city/state as fallback, or approximate coordinates
    // In a production app, you'd geocode these properly
    let lat = 39.8283
    let lng = -98.5795

    // Simple hash-based positioning for demo (should be proper geocoding)
    const hash = (school.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    lat += ((hash % 40) - 20)
    lng += ((hash % 80) - 40)

    schoolsWithCoords.push({ ...school, lat, lng })
  })

  // Create a feature group for clustering
  const markerGroup = L.featureGroup()

  schoolsWithCoords.forEach((school) => {
    const color = getMarkerColor(school.status)
    const marker = L.marker([school.lat, school.lng], {
      icon: createMarkerIcon(color),
      title: school.name,
    })

    marker.bindPopup(`
      <div class="text-sm">
        <p class="font-bold">${school.name}</p>
        <p class="text-gray-600">${school.city}, ${school.state}</p>
        <p class="text-gray-600 capitalize">Status: ${school.status?.replace('_', ' ') || 'Unknown'}</p>
      </div>
    `)

    marker.addTo(markerGroup)
  })

  markerGroup.addTo(mapInstance)

  // Fit bounds to all markers
  if (markerGroup.getLayers().length > 0) {
    mapInstance.fitBounds(markerGroup.getBounds(), { padding: [50, 50] })
  }
})
</script>

<style scoped>
:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

:deep(.leaflet-popup-content) {
  margin: 0;
  width: auto !important;
}
</style>
