<template>
  <nav class="flex items-center gap-1 lg:gap-2">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      :data-testid="`nav-${item.to.replace('/', '')}`"
      :class="[
        'flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        'focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-600',
        isActive(item.to)
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      <UIcon :name="item.icon" class="w-5 h-5 shrink-0" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </NuxtLink>
    <HeaderNavMore />
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import HeaderNavMore from "./HeaderNavMore.vue";

const route = useRoute();

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "i-heroicons-home" },
  { to: "/schools", label: "Schools", icon: "i-heroicons-building-library" },
  { to: "/coaches", label: "Coaches", icon: "i-heroicons-user-group" },
  {
    to: "/interactions",
    label: "Interactions",
    icon: "i-heroicons-chat-bubble-left-right",
  },
  { to: "/timeline", label: "Timeline", icon: "i-heroicons-clock" },
];

const isActive = (path: string): boolean => {
  return route.path.startsWith(path);
};
</script>
