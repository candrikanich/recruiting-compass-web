<template>
  <button
    @click="$emit('click')"
    class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
    :style="{ paddingLeft: variant === 'icon' ? '0.75rem' : '1rem' }"
  >
    <span v-if="variant === 'full'">📄 Export Report</span>
    <span v-else>📄</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: "icon" | "full";
}>();

defineEmits<{
  click: [];
}>();
</script>
