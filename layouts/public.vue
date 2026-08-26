<!-- layouts/public.vue -->
<!--
  Standalone layout for public share pages (e.g. /p/[slug]). Deliberately does
  NOT render the app <Header> — an external coach must never see app navigation,
  search, or notifications. The Figma coach-header bar (brand + verified badge)
  lives inside the profile card itself (see ProfileHero), so this layout is just
  a bare, chrome-free shell.
-->
<template>
  <div class="min-h-screen bg-gray-50">
    <slot />
  </div>
</template>
