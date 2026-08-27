<!-- components/profile/setup/CommitmentStatusControl.vue -->
<script setup lang="ts">
type CommitmentStatus = "uncommitted" | "committed";

defineProps<{
  status: CommitmentStatus;
  committedSchoolId: string | null;
  schools: { id: string; name: string }[];
}>();

const emit = defineEmits<{
  "update:status": [status: CommitmentStatus];
  "update:committedSchoolId": [schoolId: string | null];
}>();

function onStatusChange(event: Event) {
  emit("update:status", (event.target as HTMLSelectElement).value as CommitmentStatus);
}

function onSchoolChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:committedSchoolId", value || null);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <label class="block text-sm font-medium text-brand-slate-700" for="commitment-status">
        Commitment Status
      </label>
      <p class="mt-0.5 mb-2 text-xs text-brand-slate-500">
        Updating this adds a status tag to your live page
      </p>
      <select
        id="commitment-status"
        data-test="status-select"
        :value="status"
        class="w-full rounded-xl border-2 border-brand-slate-300 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
        @change="onStatusChange"
      >
        <option value="uncommitted">Uncommitted</option>
        <option value="committed">Committed</option>
      </select>
    </div>

    <div v-if="status === 'committed'">
      <label class="mb-2 block text-sm font-medium text-brand-slate-700" for="committed-school">
        Committed school
      </label>
      <select
        id="committed-school"
        data-test="committed-school"
        :value="committedSchoolId ?? ''"
        class="w-full rounded-xl border-2 border-brand-slate-300 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
        @change="onSchoolChange"
      >
        <option value="" disabled>Select a school</option>
        <option v-for="school in schools" :key="school.id" :value="school.id">
          {{ school.name }}
        </option>
      </select>
    </div>
  </div>
</template>
