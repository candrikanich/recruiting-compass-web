<script setup lang="ts">
const props = defineProps<{ modelValue: { days: number } }>();
const emit = defineEmits<{ "update:modelValue": [{ days: number }] }>();
const options = [7, 14, 30, 90];
</script>

<template>
  <div class="inline-flex rounded-md border border-brand-slate-200 bg-white p-0.5">
    <button
      v-for="d in options"
      :key="d"
      :data-days="d"
      type="button"
      class="rounded px-3 py-1 text-sm"
      :class="props.modelValue.days === d ? 'bg-brand-blue-600 text-white' : 'text-brand-slate-600'"
      @click="emit('update:modelValue', { days: d })"
    >{{ d }}d</button>
  </div>
</template>
