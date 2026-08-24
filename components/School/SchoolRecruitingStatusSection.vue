<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="font-semibold text-slate-900">Recruiting Status</h3>
      <span
        v-if="statusUpdating"
        class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
        role="status"
        aria-label="Updating status"
      />
    </div>

    <SchoolStatusStepper
      :status="status as SchoolStatusValue"
      :updating="statusUpdating"
      @select="emit('update:status', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import SchoolStatusStepper from "~/components/School/SchoolStatusStepper.vue";
import type { SchoolStatusValue } from "~/utils/schoolStatusOptions";

defineProps<{
  status: string;
  statusUpdating: boolean;
}>();

const emit = defineEmits<{
  "update:status": [status: SchoolStatusValue];
}>();
</script>
