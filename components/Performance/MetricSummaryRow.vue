<template>
  <div
    class="flex items-center justify-between rounded-lg bg-slate-50 p-3 transition hover:bg-slate-100"
  >
    <p class="text-sm font-medium text-slate-900">{{ label }}</p>
    <div class="flex items-baseline gap-1">
      <p class="text-lg font-semibold text-slate-900">{{ value }}</p>
      <p class="text-xs text-slate-600">{{ unit }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  value: string | number;
  unit: string;
}

defineProps<Props>();
</script>
