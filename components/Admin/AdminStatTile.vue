<script setup lang="ts">
const props = defineProps<{
  label: string;
  value: string | number;
  delta?: number;
}>();
</script>

<template>
  <div class="rounded-lg border border-brand-slate-200 bg-white p-4">
    <div class="text-sm text-brand-slate-500">{{ label }}</div>
    <div class="mt-1 flex items-baseline gap-2">
      <span class="text-2xl font-semibold text-brand-slate-900">{{ value }}</span>
      <span
        v-if="typeof props.delta === 'number'"
        :class="props.delta >= 0 ? 'text-brand-emerald-600' : 'text-brand-red-600'"
        class="text-sm font-medium"
      >{{ props.delta >= 0 ? "▲" : "▼" }} {{ Math.abs(props.delta) }}</span>
    </div>
  </div>
</template>
