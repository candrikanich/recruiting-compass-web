<template>
  <!-- Mobile: sticky section button + drawer -->
  <div class="lg:hidden">
    <div class="sticky top-14 z-30 border-b border-gray-200 bg-white px-4 py-2">
      <button
        type="button"
        class="flex items-center gap-2 text-sm font-medium text-gray-700"
        @click="drawerOpen = !drawerOpen"
      >
        <UIcon name="i-heroicons-bars-3" class="size-4" />
        Sections
        <UIcon
          name="i-heroicons-chevron-down"
          class="size-4 transition-transform"
          :class="drawerOpen ? 'rotate-180' : ''"
        />
      </button>
    </div>
    <div v-if="drawerOpen" class="border-b border-gray-200 bg-white px-4 pb-3 pt-1">
      <nav class="flex flex-col gap-0.5">
        <HelpSidebarLink
          v-for="section in sections"
          :key="section.slug"
          :to="`/help/${section.slug}`"
          :icon="section.icon"
          :label="section.title"
          @click="drawerOpen = false"
        />
      </nav>
    </div>
  </div>

  <!-- Desktop: fixed left sidebar -->
  <aside class="hidden w-56 shrink-0 lg:block">
    <div class="sticky top-14 pt-6">
      <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Help Center
      </p>
      <nav class="flex flex-col gap-0.5">
        <HelpSidebarLink
          v-for="section in sections"
          :key="section.slug"
          :to="`/help/${section.slug}`"
          :icon="section.icon"
          :label="section.title"
        />
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue"

const drawerOpen = ref(false)

const sections = [
  { slug: 'getting-started', icon: 'i-heroicons-rocket-launch', title: 'Getting Started' },
  { slug: 'schools', icon: 'i-heroicons-building-library', title: 'Schools & Coaches' },
  { slug: 'phases', icon: 'i-heroicons-chart-bar', title: 'Phases & Letters' },
  { slug: 'account', icon: 'i-heroicons-cog-6-tooth', title: 'Account & Settings' },
] as const
</script>
