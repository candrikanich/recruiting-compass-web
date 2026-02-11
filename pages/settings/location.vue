<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">Home Location</h1>
        <p class="text-slate-600">
          Set your home address to calculate distances to schools
        </p>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div
        v-if="isLoading"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading preferences...</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Address Section -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-lg font-semibold text-slate-900 mb-4">Address</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Street Address</label
              >
              <input
                v-model="localLocation.address"
                type="text"
                placeholder="123 Main Street"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >City</label
                >
                <input
                  v-model="localLocation.city"
                  type="text"
                  placeholder="Chicago"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >State</label
                >
                <input
                  v-model="localLocation.state"
                  type="text"
                  placeholder="IL"
                  maxlength="2"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >ZIP Code</label
                >
                <input
                  v-model="localLocation.zip"
                  type="text"
                  placeholder="60601"
                  maxlength="10"
                  @blur="triggerSave"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Coordinates Section -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">Coordinates</h2>
              <p class="text-sm text-slate-500">
                Auto-detected from address or enter manually
              </p>
            </div>
            <button
              @click="handleGeocode"
              :disabled="geocoding || !hasAddress"
              class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              <MapPinIcon class="w-4 h-4" />
              {{ geocoding ? "Looking up..." : "Lookup from Address" }}
            </button>
          </div>

          <div
            v-if="geocodeError"
            class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
          >
            {{ geocodeError }}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Latitude</label
              >
              <input
                v-model.number="localLocation.latitude"
                type="number"
                step="0.000001"
                placeholder="41.8781"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Longitude</label
              >
              <input
                v-model.number="localLocation.longitude"
                type="number"
                step="0.000001"
                placeholder="-87.6298"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <p
            v-if="localLocation.latitude && localLocation.longitude"
            class="mt-3 text-sm text-emerald-600 flex items-center gap-1"
          >
            <CheckCircleIcon class="w-4 h-4" />
            Coordinates set - distances will be calculated automatically
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3">
          <button
            @click="handleClear"
            class="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Clear
          </button>
          <button
            @click="handleSave"
            :disabled="saving"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {{ saving ? "Saving..." : "Save Location" }}
          </button>
        </div>

        <!-- Success/Error Messages -->
        <div
          v-if="saveSuccess"
          class="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
        >
          <p class="text-emerald-700 flex items-center gap-2">
            <CheckCircleIcon class="w-5 h-5" />
            Home location saved successfully
          </p>
        </div>
        <div
          v-if="error"
          class="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p class="text-red-700">Error: {{ error }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useGeocoding } from "~/composables/useGeocoding";
import { useAutoSave } from "~/composables/useAutoSave";
import Header from "~/components/Header.vue";
import {
  ArrowLeftIcon,
  MapPinIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/outline";
import type { HomeLocation } from "~/types/models";

definePageMeta({ middleware: "auth" });

const {
  isLoading,
  error,
  getHomeLocation,
  setHomeLocation,
  loadAllPreferences,
} = usePreferenceManager();
const {
  geocodeAddress,
  loading: geocoding,
  error: geocodeError,
} = useGeocoding();

const localLocation = reactive<HomeLocation>({
  address: "",
  city: "",
  state: "",
  zip: "",
  latitude: undefined,
  longitude: undefined,
});

const saving = ref(false);
const saveSuccess = ref(false);

// Auto-save configuration for zip code
const { triggerSave } = useAutoSave({
  debounceMs: 500,
  onSave: async () => {
    await setHomeLocation(localLocation);
  },
});

const hasAddress = computed(() => {
  return localLocation.address || localLocation.city || localLocation.zip;
});

const fullAddress = computed(() => {
  const parts = [
    localLocation.address,
    localLocation.city,
    localLocation.state,
    localLocation.zip,
  ].filter(Boolean);
  return parts.join(", ");
});

const handleGeocode = async () => {
  if (!fullAddress.value) return;

  const result = await geocodeAddress(fullAddress.value);
  if (result) {
    localLocation.latitude = result.latitude;
    localLocation.longitude = result.longitude;
  }
};

const handleSave = async () => {
  saving.value = true;
  saveSuccess.value = false;

  try {
    await setHomeLocation(localLocation);
    saveSuccess.value = true;
    setTimeout(() => (saveSuccess.value = false), 3000);
  } catch (err) {
    console.error("Failed to save home location:", err);
  } finally {
    saving.value = false;
  }
};

const handleClear = () => {
  Object.assign(localLocation, {
    address: "",
    city: "",
    state: "",
    zip: "",
    latitude: undefined,
    longitude: undefined,
  });
};

onMounted(async () => {
  await loadAllPreferences();
  const location = getHomeLocation();
  if (location) {
    Object.assign(localLocation, location);
  }
});
</script>
