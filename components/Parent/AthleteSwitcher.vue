<script setup lang="ts">
import { computed } from "vue";

interface LinkedAthlete {
  id: string;
  name: string;
}

interface Props {
  linkedAthletes: LinkedAthlete[];
  currentAthleteId: string;
}

interface Emits {
  (event: "athlete-changed", athleteId: string): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

const shouldShow = computed<boolean>(() => {
  return props.linkedAthletes.length > 1;
});

const currentAthleteName = computed<string>(() => {
  const current = props.linkedAthletes.find((a) => a.id === props.currentAthleteId);
  return current?.name || "Select Athlete";
});

const handleAthleteChange = (athleteId: string) => {
  if (athleteId !== props.currentAthleteId) {
    // Update URL param
    const url = new URL(window.location.href);
    url.searchParams.set("athlete_id", athleteId);
    window.history.replaceState({}, "", url.toString());

    // Emit event
    const emit = defineEmits<Emits>();
    emit("athlete-changed", athleteId);
  }
};
</script>

<template>
  <div v-if="shouldShow" class="mb-4">
    <label for="athlete-select" class="block text-sm font-medium text-gray-700 mb-2">
      Viewing:
    </label>
    <select
      id="athlete-select"
      :value="currentAthleteId"
      @change="handleAthleteChange(($event.target as HTMLSelectElement).value)"
      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      data-testid="athlete-select"
    >
      <option v-for="athlete in linkedAthletes" :key="athlete.id" :value="athlete.id">
        {{ athlete.name }}
      </option>
    </select>
  </div>
</template>
