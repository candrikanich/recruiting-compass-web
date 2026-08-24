<template>
  <div class="flex flex-col items-center justify-center py-12">
    <!-- Icon -->
    <div
      class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
    >
      <svg
        v-if="!hasCustomIcon"
        class="h-8 w-8 text-slate-400"
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
      <component v-else :is="icon" class="h-8 w-8 text-slate-400" />
    </div>

    <!-- Title -->
    <h3 class="mb-2 text-center text-lg font-semibold text-slate-900">
      {{ title }}
    </h3>

    <!-- Description -->
    <p v-if="description" class="mb-6 max-w-md text-center text-slate-600">
      {{ description }}
    </p>

    <!-- Action Button -->
    <NuxtLink
      v-if="actionText && actionHref"
      :to="actionHref"
      class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
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
