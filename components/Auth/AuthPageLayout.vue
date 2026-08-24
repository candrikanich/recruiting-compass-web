<template>
  <div class="relative min-h-screen overflow-hidden bg-emerald-600">
    <AuthMultiSportFieldBackground />

    <main
      class="relative z-10 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Navigation -->
        <nav v-if="backLink" aria-label="Page navigation" class="mb-6">
          <NuxtLink
            :to="backLink.to"
            class="flex items-center gap-2 rounded-sm px-2 py-1 text-white transition-colors hover:text-white/80 focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            <UIcon
              name="i-heroicons-arrow-left"
              class="h-4 w-4"
              aria-hidden="true"
            />
            {{ backLink.text }}
          </NuxtLink>
        </nav>

        <!-- Card -->
        <div
          class="rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xs"
        >
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
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
