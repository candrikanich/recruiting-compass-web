<!-- components/profile/public/SectionHeader.vue -->
<script setup lang="ts">
defineProps<{ icon: string; title: string }>();
</script>

<template>
  <div class="mb-3 flex items-center gap-2">
    <UIcon
      :name="icon"
      class="h-[18px] w-[18px] shrink-0 text-brand-slate-500"
      aria-hidden="true"
    />
    <h2 class="text-sm font-semibold text-brand-slate-900">{{ title }}</h2>
  </div>
</template>
