<template>
  <div class="relative">
    <!-- More Button -->
    <button
      @click="isOpen = !isOpen"
      :class="[
        'flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isAnyChildActive
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      ]"
      data-testid="nav-more-button"
    >
      <span>More</span>
      <ChevronDownIcon
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50"
      >
        <div class="py-1">
          <NuxtLink
            v-for="item in moreItems"
            :key="item.to"
            :to="item.to"
            :data-testid="`nav-more-${item.to.replace('/', '')}`"
            :class="[
              'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
              isActive(item.to)
                ? 'bg-brand-blue-50 text-brand-blue-700 font-medium'
                : 'text-slate-700 hover:bg-slate-50'
            ]"
            @click="isOpen = false"
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import {
  ChevronDownIcon,
  ChartBarIcon,
  GiftIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  ChartPieIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
const isOpen = ref(false);

const moreItems = [
  { to: "/performance", label: "Performance", icon: ChartBarIcon },
  { to: "/offers", label: "Offers", icon: GiftIcon },
  { to: "/documents", label: "Documents", icon: DocumentTextIcon },
  { to: "/settings", label: "Settings", icon: AdjustmentsHorizontalIcon },
  { to: "/analytics", label: "Analytics", icon: ChartPieIcon },
];

const isActive = (path: string): boolean => {
  return route.path.startsWith(path);
};

const isAnyChildActive = computed(() => {
  return moreItems.some((item) => isActive(item.to));
});
</script>
