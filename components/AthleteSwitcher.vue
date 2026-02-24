<template>
  <div v-if="showSwitcher" class="bg-slate-50 border-b border-slate-200 py-3">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3">
        <UserCircleIcon class="w-5 h-5 text-slate-500" />
        <span class="text-sm font-medium text-slate-700">Viewing:</span>
        <select
          v-model="selectedId"
          class="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          @change="handleSwitch"
        >
          <option
            v-for="athlete in accessibleAthletes"
            :key="athlete.athleteId"
            :value="athlete.athleteId"
          >
            {{ athlete.athleteName }}
            <template v-if="athlete.graduationYear">
              ({{ athlete.graduationYear }})
            </template>
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, inject } from "vue";
import { UserCircleIcon } from "@heroicons/vue/24/outline";
import { useFamilyContext } from "~/composables/useFamilyContext";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";

const injected = inject<UseActiveFamilyReturn>("activeFamily");
const activeFamily = injected || useFamilyContext();

// Show switcher only if parent has multiple children
const showSwitcher = computed(() => {
  const isParent = activeFamily.isParent.value;
  const familiesCount = activeFamily.parentAccessibleFamilies.value.length;
  return isParent && familiesCount > 1;
});

const accessibleAthletes = computed(
  () => activeFamily.parentAccessibleFamilies.value,
);

const selectedId = ref("");

// Sync selectedId with active athlete
watch(
  () => activeFamily.activeAthleteId.value,
  (newId) => {
    if (newId) {
      selectedId.value = newId;
    }
  },
  { immediate: true },
);

const handleSwitch = async () => {
  if (
    selectedId.value &&
    selectedId.value !== activeFamily.activeAthleteId.value
  ) {
    await activeFamily.switchAthlete(selectedId.value);
  }
};
</script>
