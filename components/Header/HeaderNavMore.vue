<template>
  <div class="relative">
    <!-- More Button -->
    <button
      @click="isOpen = !isOpen"
      :class="[
        'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:px-4',
        isAnyChildActive
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      ]"
      data-testid="nav-more-button"
    >
      <span>More</span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="h-4 w-4 transition-transform"
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
        class="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg"
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
                ? 'bg-brand-blue-50 font-medium text-brand-blue-700'
                : 'text-slate-700 hover:bg-slate-50',
            ]"
            @click="isOpen = false"
          >
            <UIcon :name="item.icon" class="h-4 w-4" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </Transition>

    <!-- Backdrop (dismiss on outside click). NOT teleported to body: the app
         root (#__nuxt) has `isolation: isolate`, creating a stacking context.
         Teleporting the backdrop to <body> put it OUTSIDE that context at z-40,
         above the whole app — including this menu (trapped inside #__nuxt via
         the sticky z-50 header) — so it swallowed every link click (dropdown
         closed, navigation never fired). Kept in-context, menu z-50 > backdrop
         z-40 as intended. -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
const route = useRoute();
const isOpen = ref(false);

const moreItems = [
  { to: "/events", label: "Events", icon: "i-heroicons-calendar-days" },
  { to: "/deadlines", label: "Deadlines", icon: "i-heroicons-clock" },
  { to: "/performance", label: "Performance", icon: "i-heroicons-chart-bar" },
  { to: "/offers", label: "Offers", icon: "i-heroicons-gift" },
  { to: "/documents", label: "Documents", icon: "i-heroicons-document-text" },
  { to: "/analytics", label: "Analytics", icon: "i-heroicons-chart-pie" },
];

const isActive = (path: string): boolean => {
  return route.path.startsWith(path);
};

const isAnyChildActive = computed(() => {
  return moreItems.some((item) => isActive(item.to));
});
</script>
