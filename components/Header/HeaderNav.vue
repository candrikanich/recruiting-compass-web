<template>
  <nav class="flex items-center gap-1 lg:gap-2">
    <NuxtLink
      to="/dashboard"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/dashboard')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      ]"
    >
      Dashboard
    </NuxtLink>
    <NuxtLink
      to="/schools"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/schools')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      ]"
    >
      Schools
    </NuxtLink>
    <NuxtLink
      to="/coaches"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/coaches')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      ]"
    >
      Coaches
    </NuxtLink>
    <NuxtLink
      to="/interactions"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/interactions')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      ]"
    >
      Interactions
    </NuxtLink>
    <NuxtLink
      to="/events"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/events')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      ]"
    >
      Events
    </NuxtLink>
    <NuxtLink
      to="/performance"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/performance')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      ]"
    >
      Performance
    </NuxtLink>
    <NuxtLink
      to="/documents"
      :class="[
        'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive('/documents')
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      ]"
    >
      Documents
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const isActive = (path: string): boolean => {
  return route.path.startsWith(path)
}
</script>
