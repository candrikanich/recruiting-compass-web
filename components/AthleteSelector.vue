<template>
  <div v-if="isParent" class="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-200 rounded-lg">
    <label class="text-sm font-medium text-gray-700">Viewing:</label>
    <select
      v-model="selectedAthleteId"
      @change="handleSwitch"
      class="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
    >
      <option v-for="athlete in accessibleAthletes" :key="athlete.athleteId" :value="athlete.athleteId">
        {{ athlete.athleteName }} ({{ athlete.familyName }})
      </option>
    </select>
    <span v-if="loading" class="text-xs text-gray-500">Switching...</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, inject } from "vue";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { useUserStore } from "~/stores/user";

const activeFamily = inject("activeFamily") || useFamilyContext();
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
    console.error("Failed to switch athlete:", err);
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
  }
);
</script>
