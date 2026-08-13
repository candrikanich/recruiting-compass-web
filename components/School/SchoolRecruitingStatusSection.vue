<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-slate-900">Recruiting Status</h3>
      <span
        v-if="statusUpdating"
        class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
        role="status"
        aria-label="Updating status"
      />
    </div>

    <span
      class="inline-block px-2.5 py-1 text-xs font-medium rounded-full mb-3"
      :class="getSchoolStatusBadgeClass(status)"
    >
      {{ getSchoolStatusLabel(status) }}
    </span>

    <label for="recruiting-status-select" class="sr-only">
      Change recruiting status
    </label>
    <div class="relative">
      <select
        id="recruiting-status-select"
        data-testid="recruiting-status-select"
        :value="status"
        :disabled="statusUpdating"
        :aria-busy="statusUpdating"
        class="w-full appearance-none px-3 py-2.5 pr-9 text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-900 cursor-pointer focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        @change="handleChange"
      >
        <option
          v-for="option in SCHOOL_STATUS_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <UIcon
        name="i-heroicons-chevron-up-down"
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  SCHOOL_STATUS_OPTIONS,
  getSchoolStatusLabel,
  getSchoolStatusBadgeClass,
  type SchoolStatusValue,
} from "~/utils/schoolStatusOptions";

defineProps<{
  status: string;
  statusUpdating: boolean;
}>();

const emit = defineEmits<{
  "update:status": [status: SchoolStatusValue];
}>();

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:status", target.value as SchoolStatusValue);
};
</script>
