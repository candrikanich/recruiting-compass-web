<template>
  <div class="flex flex-col items-center justify-center py-12">
    <!-- Icon -->
    <div
      class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"
    >
      <svg
        v-if="!hasCustomIcon"
        class="w-8 h-8 text-slate-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <component v-else :is="icon" class="w-8 h-8 text-slate-400" />
    </div>

    <!-- Title -->
    <h3 class="text-lg font-semibold text-slate-900 mb-2 text-center">
      {{ title }}
    </h3>

    <!-- Description -->
    <p v-if="description" class="text-slate-600 text-center max-w-md mb-6">
      {{ description }}
    </p>

    <!-- Action Button -->
    <NuxtLink
      v-if="actionText && actionHref"
      :to="actionHref"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      {{ actionText }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  title: string;
  description?: string;
  icon?: any;
  actionText?: string;
  actionHref?: string;
}

const props = defineProps<Props>();

const hasCustomIcon = computed(() => !!props.icon);
</script>
