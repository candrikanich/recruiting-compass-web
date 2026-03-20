<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition mb-3 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading preferences...</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Address Section -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h2 class="text-lg font-semibold text-slate-900 mb-4">Address</h2>
          <SharedAddressAutocompleteInput
            :model-value="localLocation"
            @update:model-value="(v: HomeLocation) => { Object.assign(localLocation, v); triggerSave(); }"
          />
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
import { ref, reactive, onMounted } from "vue";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useAutoSave } from "~/composables/useAutoSave";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/outline";
import type { HomeLocation } from "~/types/models";
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
    await setHomeLocation(localLocation);
    saveSuccess.value = true;
    setTimeout(() => (saveSuccess.value = false), 3000);
  } catch (err) {
    logger.error("Failed to save home location", err);
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
