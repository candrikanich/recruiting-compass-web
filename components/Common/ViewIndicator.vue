<template>
  <div
    v-if="isAthlete && hasParentViewed"
    class="flex items-center gap-1 text-xs text-slate-500"
  >
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
    <span>{{ displayText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useUserStore } from "~/stores/user";
import { useViewLogging } from "~/composables/useViewLogging";

const userStore = useUserStore();
const viewLogging = useViewLogging();

const hasParentViewed = ref(false);
const lastViewTime = ref<string | null>(null);
const isAthlete = computed(() => userStore.user?.role === "student");

/**
 * Format time difference for display
 * e.g., "2h ago", "10m ago", "now"
 */
const displayText = computed(() => {
  if (!lastViewTime.value) return "";

  const now = new Date();
  const viewedAt = new Date(lastViewTime.value);
  const diffMs = now.getTime() - viewedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Parent viewed • now";
  if (diffMins < 60) return `Parent viewed • ${diffMins}m ago`;
  if (diffHours < 24) return `Parent viewed • ${diffHours}h ago`;
  if (diffDays < 7) return `Parent viewed • ${diffDays}d ago`;

  return `Parent viewed • ${viewedAt.toLocaleDateString()}`;
});

/**
 * Load view status on mount
 */
const loadViewStatus = async () => {
  if (!isAthlete.value) return;

  try {
    const lastView = await viewLogging.getLastParentView();
    if (lastView && typeof lastView === "object" && "viewed_at" in lastView) {
      hasParentViewed.value = true;
      lastViewTime.value = lastView.viewed_at as string;
    }
  } catch (err) {
    console.debug("Failed to load view status:", err);
  }
};

onMounted(() => {
  loadViewStatus();
});
</script>
