<template>
  <nav class="flex items-center gap-1 lg:gap-2">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      :data-testid="`nav-${item.to.replace('/', '')}`"
      :class="[
        'flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive(item.to)
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
      <span>{{ item.label }}</span>
    </NuxtLink>
    <HeaderNavMore />
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import {
  HomeIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
} from "@heroicons/vue/24/outline";
import HeaderNavMore from "./HeaderNavMore.vue";

const route = useRoute();

interface NavItem {
  to: string;
  label: string;
  icon: any;
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/schools", label: "Schools", icon: BuildingLibraryIcon },
  { to: "/coaches", label: "Coaches", icon: UserGroupIcon },
  { to: "/interactions", label: "Interactions", icon: ChatBubbleLeftRightIcon },
  { to: "/timeline", label: "Timeline", icon: ClockIcon },
];

const isActive = (path: string): boolean => {
  return route.path.startsWith(path);
};
</script>
