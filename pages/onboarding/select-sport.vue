<template>
  <div
    class="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 px-4 py-12"
  >
    <div class="max-w-md mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-900 mb-2">
          One quick thing
        </h1>
        <p class="text-slate-600">
          Pick your primary sport so we can tailor Recruiting Compass to you.
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-8 space-y-6">
        <div>
          <label
            for="select-sport"
            class="block text-sm font-medium text-slate-700 mb-2"
          >
            Primary Sport <span class="text-red-600">*</span>
          </label>
          <select
            id="select-sport"
            v-model="selectedSport"
            data-testid="select-sport"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select your sport</option>
            <option v-for="sport in sports" :key="sport" :value="sport">
              {{ sport }}
            </option>
          </select>
        </div>

        <div
          v-if="error"
          role="alert"
          class="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p class="text-red-800 text-sm">{{ error }}</p>
        </div>

        <button
          data-testid="save-sport"
          type="button"
          :disabled="!selectedSport || saving"
          class="w-full px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="saveSport"
        >
          {{ saving ? "Saving..." : "Continue" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { createClientLogger } from "~/utils/logger";
import { SPORT_POSITIONS } from "~/utils/positions/canonical";

const logger = createClientLogger("SelectSport");

definePageMeta({ layout: "default", middleware: "auth" });

// Source the sport list from the canonical position registry — the single
// source of truth shared by onboarding, the edit form, and iOS — rather than a
// hardcoded duplicate list.
const sports = Object.keys(SPORT_POSITIONS);

const { setPlayerDetails, loadAllPreferences } = usePreferenceManager();

const selectedSport = ref("");
const saving = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  // Load existing player details first so saving the sport MERGES with (rather
  // than clobbers) any graduation year / position / academics already stored.
  try {
    await loadAllPreferences();
  } catch (err) {
    logger.error("Failed to load preferences", err);
  }
});

const saveSport = async () => {
  if (!selectedSport.value) return;
  saving.value = true;
  error.value = null;
  try {
    await setPlayerDetails({ primary_sport: selectedSport.value });
    await navigateTo("/dashboard");
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to save your sport";
  } finally {
    saving.value = false;
  }
};
</script>
