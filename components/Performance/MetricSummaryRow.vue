<template>
  <div
    class="flex items-center justify-between p-3 rounded-lg transition bg-slate-50 hover:bg-slate-100"
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
  label: string
  value: string | number
  unit: string
}

defineProps<Props>()
</script>
