<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <AuthMultiSportFieldBackground />

    <main
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Navigation -->
        <nav v-if="backLink" aria-label="Page navigation" class="mb-6">
          <NuxtLink
            :to="backLink.to"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
            {{ backLink.text }}
          </NuxtLink>
        </nav>

        <!-- Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";

export interface BackLink {
  to: string;
  text: string;
}

withDefaults(
  defineProps<{
    backLink?: BackLink;
  }>(),
  {
    backLink: undefined,
  },
);
</script>
