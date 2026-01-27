<template>
  <nav class="flex items-center gap-1 lg:gap-2">
    <NuxtLink
      to="/dashboard"
      data-testid="nav-dashboard"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/dashboard')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      Dashboard
    </NuxtLink>
    <NuxtLink
      to="/schools"
      data-testid="nav-schools"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/schools')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      Schools
    </NuxtLink>
    <NuxtLink
      to="/coaches"
      data-testid="nav-coaches"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/coaches')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      Coaches
    </NuxtLink>
    <NuxtLink
      to="/interactions"
      data-testid="nav-interactions"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/interactions')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      Interactions
    </NuxtLink>
    <NuxtLink
      to="/events"
      data-testid="nav-events"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/events')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      Events
    </NuxtLink>
    <NuxtLink
      to="/timeline"
      data-testid="nav-timeline"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/timeline')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      Timeline
    </NuxtLink>
    <HeaderNavMore />
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import HeaderNavMore from "./HeaderNavMore.vue";

const route = useRoute();

const isActive = (path: string): boolean => {
  return route.path.startsWith(path);
};
</script>
