<!-- layouts/public.vue -->
<!--
  Standalone layout for public share pages (e.g. /p/[slug]). Deliberately does
  NOT render the app <Header> — an external coach must never see app navigation,
  search, or notifications. Only a slim coach-header bar (logo + verified badge),
  mirroring the Figma design (node 5:7).
-->
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-brand-slate-900 text-white">
      <div
        class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <a
          href="/"
          class="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <UIcon
            name="i-heroicons-viewfinder-circle"
            class="h-6 w-6 text-white"
            aria-hidden="true"
          />
          <span class="text-sm font-semibold tracking-tight">
            The Recruiting Compass
          </span>
        </a>
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-brand-emerald-900/40 px-3 py-1 text-xs font-medium text-brand-emerald-300 ring-1 ring-brand-emerald-700/50"
        >
          <span
            class="h-1.5 w-1.5 rounded-full bg-brand-emerald-400"
            aria-hidden="true"
          />
          Verified Coach Access
        </span>
      </div>
    </header>

    <slot />
  </div>
</template>
