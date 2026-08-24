<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Page Header -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <NuxtLink
          to="/settings"
          class="mb-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">Home Location</h1>
        <p class="text-slate-600">
          Set your home address to calculate distances to schools
        </p>
      </div>
    </div>

    <main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div
        v-if="isLoading"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
      >
        <div
          class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
        ></div>
        <p class="text-slate-600">Loading preferences...</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Address Section -->
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 class="mb-4 text-lg font-semibold text-slate-900">Address</h2>
          <SharedAddressAutocompleteInput
            :model-value="localLocation"
            @update:model-value="
              (v: HomeLocation) => {
                Object.assign(localLocation, v);
                triggerSave();
              }
            "
          />
          <!-- Geocode status -->
          <p v-if="localLocation.latitude" class="mt-3 text-xs text-green-600">
            ✓ Coordinates set ({{ localLocation.latitude.toFixed(4) }},
            {{ localLocation.longitude?.toFixed(4) }}) — distance calculations
            enabled
          </p>
          <p
            v-else-if="localLocation.address"
            class="mt-3 text-xs text-amber-600"
          >
            Coordinates not set — click Save Location to auto-geocode and enable
            distance calculations
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3">
          <button
            @click="handleClear"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            @click="handleSave"
            :disabled="saving"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? "Saving..." : "Save Location" }}
          </button>
        </div>

        <!-- Success/Error Messages -->
        <div
          v-if="saveSuccess"
          role="status"
          aria-live="polite"
          class="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
        >
          <p class="flex items-center gap-2 text-emerald-700">
            <UIcon
              name="i-heroicons-check-circle"
              class="h-5 w-5"
              aria-hidden="true"
            />
            Home location saved successfully
          </p>
        </div>
        <div
          v-if="error"
          role="alert"
          class="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p class="text-red-700">Error: {{ error }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useAutoSave } from "~/composables/useAutoSave";
import { useAppToast } from "~/composables/useAppToast";
import type { HomeLocation } from "~/types/models";
import type { AddressSuggestion } from "~/composables/useAddressAutocomplete";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("settings/location");

definePageMeta({ middleware: "auth" });

const {
  isLoading,
  error,
  getHomeLocation,
  setHomeLocation,
  loadAllPreferences,
} = usePreferenceManager();
const { showToast } = useAppToast();
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

const { triggerSave } = useAutoSave({
  debounceMs: 500,
  onSave: async () => {
    await setHomeLocation(localLocation);
  },
});

const handleSave = async () => {
  saving.value = true;
  saveSuccess.value = false;

  try {
    // Auto-geocode if address fields are set but lat/lng is missing
    if (localLocation.address && !localLocation.latitude) {
      const query = [
        localLocation.address,
        localLocation.city,
        localLocation.state,
        localLocation.zip,
      ]
        .filter(Boolean)
        .join(", ");
      try {
        const results = await $fetch<AddressSuggestion[]>(
          `/api/address/autocomplete?q=${encodeURIComponent(query)}`,
        );
        if (results.length > 0) {
          localLocation.latitude = results[0].latitude;
          localLocation.longitude = results[0].longitude;
          logger.info("Auto-geocoded home location", {
            lat: results[0].latitude,
            lng: results[0].longitude,
          });
        }
      } catch (geocodeErr) {
        logger.warn(
          "Auto-geocoding failed, saving without coordinates",
          geocodeErr,
        );
      }
    }

    await setHomeLocation(localLocation);
    saveSuccess.value = true;
    setTimeout(() => (saveSuccess.value = false), 3000);
  } catch (err) {
    logger.error("Failed to save home location", err);
    showToast(
      "Something went wrong saving your location. Please try again.",
      "error",
    );
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
  const location = getHomeLocation.value;
  if (location) {
    Object.assign(localLocation, location);
  }
});
</script>
