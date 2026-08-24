<template>
  <div
    v-if="isParent"
    class="flex items-center gap-3 rounded-lg border-b border-blue-200 bg-blue-50 px-4 py-3"
  >
    <label class="text-sm font-medium text-gray-700">Viewing:</label>
    <select
      v-model="selectedAthleteId"
      @change="handleSwitch"
      class="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
    >
      <option
        v-for="athlete in accessibleAthletes"
        :key="athlete.athleteId"
        :value="athlete.athleteId"
      >
        {{ athlete.athleteName }} ({{ athlete.familyName }})
      </option>
    </select>
    <span v-if="loading" class="text-xs text-gray-500">Switching...</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, inject } from "vue";
import { useFamilyContext } from "~/composables/useFamilyContext";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("AthleteSelector");

const activeFamily =
  inject<UseActiveFamilyReturn>("activeFamily") || useFamilyContext();
const userStore = useUserStore();
const loading = ref(false);
const selectedAthleteId = ref<string>("");

const isParent = computed(() => userStore.user?.role === "parent");

const accessibleAthletes = computed(() => {
  return activeFamily.getAccessibleAthletes().map((athlete) => ({
    athleteId: athlete.athleteId,
    athleteName: athlete.athleteName,
    familyName: athlete.familyName,
  }));
});

const handleSwitch = async () => {
  if (!selectedAthleteId.value) return;

  loading.value = true;
  try {
    await activeFamily.switchAthlete(selectedAthleteId.value);
  } catch (err) {
    logger.error("Failed to switch athlete", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  selectedAthleteId.value = activeFamily.activeAthleteId.value || "";
});

// Watch for external changes to active athlete
watch(
  () => activeFamily.activeAthleteId.value,
  (newValue) => {
    if (newValue) {
      selectedAthleteId.value = newValue;
    }
  },
);
</script>
