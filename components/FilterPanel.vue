<template>
  <div class="filter-panel">
    <!-- Mobile toggle button -->
    <div class="lg:hidden mb-4">
      <button
        @click="isOpen = !isOpen"
        class="w-full px-4 py-2 transition-colors flex items-center justify-between text-sm font-medium bg-white border border-slate-200 rounded text-slate-900 hover:bg-slate-50"
      >
        <span class="flex items-center gap-2">
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          Filters
        </span>
        <svg
          class="w-5 h-5 transition-transform"
          :class="{ 'rotate-180': isOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>
    </div>

    <!-- Filter chips (visible on all screens) -->
    <slot name="chips" />

    <!-- Filter panel (collapsible on mobile, always open on desktop) -->
    <transition name="filter-slide" @enter="onEnter" @leave="onLeave">
      <div v-show="isOpen || isDesktop" class="filter-panel-content">
        <!-- Close button (mobile only) -->
        <div v-if="!isDesktop && isOpen" class="mb-4 flex justify-end">
          <button
            @click="isOpen = false"
            class="p-1 rounded transition-colors text-slate-900 hover:bg-slate-100"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Filter UI -->
        <slot name="filter" />
      </div>
    </transition>

    <!-- Overlay for mobile (when filter panel is open) -->
    <transition name="fade">
      <div
        v-if="!isDesktop && isOpen"
        class="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
        @click="isOpen = false"
      />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { debounce } from "~/utils/debounce";

// Mobile/desktop state
const isOpen = ref(false);
const isDesktop = ref(false); // SSR-safe default

// Handle window resize with debounce
const handleResize = debounce(() => {
  const newIsDesktop = window.innerWidth >= 1024;
  if (newIsDesktop !== isDesktop.value) {
    isDesktop.value = newIsDesktop;
    if (newIsDesktop) {
      isOpen.value = false; // Close mobile drawer on desktop resize
    }
  }
}, 150);

onMounted(() => {
  isDesktop.value = window.innerWidth >= 1024;
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

// Animation helpers
const onEnter = (el: Element) => {
  if (!(el instanceof HTMLElement)) return;
  el.style.height = "0";
  setTimeout(() => {
    el.style.height = el.scrollHeight + "px";
  }, 0);
};

const onLeave = (el: Element) => {
  if (!(el instanceof HTMLElement)) return;
  el.style.height = "0";
};
</script>

<style scoped>
.filter-panel-content {
  overflow: hidden;
  transition: height 0.3s ease-out;
}

.filter-slide-enter-active,
.filter-slide-leave-active {
  overflow: hidden;
  transition: height 0.3s ease-out;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
