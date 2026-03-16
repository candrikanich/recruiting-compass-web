<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Help Center</h1>
      <p class="mt-1 text-gray-500">Everything you need to use The Recruiting Compass.</p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <HelpOverviewCard
        v-for="section in helpSections"
        :key="section.slug"
        :slug="section.slug"
        :icon="section.icon"
        :title="section.title"
        :description="section.description"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'help',
})

const helpSections = [
  {
    slug: 'getting-started',
    icon: 'i-heroicons-rocket-launch',
    title: 'Getting Started',
    description: 'Set up your profile and learn the basics of the recruiting dashboard.',
  },
  {
    slug: 'schools',
    icon: 'i-heroicons-building-library',
    title: 'Schools & Coaches',
    description: 'Add schools, understand fit scores, and track coach interactions.',
  },
  {
    slug: 'phases',
    icon: 'i-heroicons-chart-bar',
    title: 'Phases & Letters',
    description: 'Navigate recruiting phases and manage recommendation letter requests.',
  },
  {
    slug: 'account',
    icon: 'i-heroicons-cog-6-tooth',
    title: 'Account & Settings',
    description: 'Manage your family, notifications, profile, and account preferences.',
  },
] as const
</script>
