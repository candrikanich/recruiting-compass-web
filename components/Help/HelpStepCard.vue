<template>
  <div class="relative flex gap-4">
    <!-- Connector line to next step -->
    <div class="flex flex-col items-center">
      <div
        class="bg-primary-100 text-primary-700 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
      >
        {{ step }}
      </div>
      <div
        v-if="!last"
        class="bg-primary-100 mt-1 w-px flex-1"
        style="min-height: 1.5rem"
      />
    </div>

    <div class="pb-6">
      <p class="font-semibold text-gray-900">{{ title }}</p>
      <div class="mt-1 text-sm leading-relaxed text-gray-600">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  step: number;
  title: string;
  last?: boolean;
}>();
</script>
