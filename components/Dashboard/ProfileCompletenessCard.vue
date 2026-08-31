<template>
  <div
    v-if="!loading"
    class="rounded-lg border border-brand-slate-200 bg-white p-6 shadow-sm transition-all duration-300"
  >
    <!-- Expanded layout: < 80% completeness -->
    <div v-if="completeness < 80" data-test="expanded-layout">
      <div class="flex items-start gap-6">
        <!-- Circular SVG progress ring -->
        <div class="shrink-0">
          <svg
            viewBox="0 0 120 120"
            class="h-32 w-32"
            aria-hidden="true"
          >
            <!-- Background circle -->
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              class="text-brand-slate-200"
            />
            <!-- Progress ring (animated) -->
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              stroke-dasharray="314.159"
              :stroke-dashoffset="strokeOffset"
              stroke-linecap="round"
              class="text-brand-blue-600 transition-all duration-500"
              style="transform: rotate(-90deg); transform-origin: 60px 60px"
            />
            <!-- Center percentage text -->
            <text
              x="60"
              y="60"
              text-anchor="middle"
              dominant-baseline="central"
              class="fill-brand-slate-900 text-xl font-bold"
            >
              {{ completeness }}%
            </text>
          </svg>
        </div>

        <!-- Content: title + missing fields -->
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-brand-slate-900">
            Complete Your Profile
          </h3>
          <p class="mb-4 text-sm text-brand-slate-600">
            Add missing info to improve your visibility to coaches
          </p>

          <!-- Top 3 missing fields -->
          <div class="space-y-2">
            <div
              v-for="prompt in topThreePrompts"
              :key="prompt.id"
              class="flex items-center justify-between rounded-md bg-brand-slate-50 p-3 hover:bg-brand-slate-100 transition-colors"
            >
              <span class="text-sm text-brand-slate-700">
                {{ prompt.message }}
              </span>
              <NuxtLink
                :to="prompt.link"
                class="ml-2 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-blue-600 hover:text-brand-blue-700"
                :aria-label="`Add ${prompt.id}`"
              >
                Add
                <Icon name="heroicons:arrow-right-16-solid" class="h-3 w-3" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Compact layout: >= 80% completeness -->
    <div v-else data-test="compact-layout">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-sm font-semibold text-brand-slate-900">
            Profile {{ completeness }}% Complete
          </h3>
          <p class="text-xs text-brand-slate-600">
            Great progress! Keep it up.
          </p>
        </div>
        <!-- Compact horizontal bar -->
        <div class="h-2 w-32 shrink-0 overflow-hidden rounded-full bg-brand-slate-200">
          <div
            :style="{ width: `${completeness}%` }"
            class="h-full bg-brand-blue-600 transition-all duration-500"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div
    v-else
    data-test="loading"
    class="rounded-lg border border-brand-slate-200 bg-white p-6 shadow-sm"
  >
    <div class="h-32 animate-pulse rounded-lg bg-brand-slate-100" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useProfileCompleteness } from '~/composables/useProfileCompleteness';

const { completeness, loading, updateCompleteness } = useProfileCompleteness();

// Mock prompts list for demo purposes
// In production, these would come from a more complete data source
const allPrompts = [
  {
    id: 'gpa',
    message: 'Add your GPA for better fit scores from colleges',
    link: '/settings/player-details?tab=academics',
    priority: 'medium',
  },
  {
    id: 'test_scores',
    message: 'Add your SAT or ACT scores to improve visibility',
    link: '/settings/player-details?tab=academics',
    priority: 'medium',
  },
  {
    id: 'highlight_video',
    message: 'Upload a highlight video to showcase your athletic abilities',
    link: '/settings/player-details?tab=public-profile',
    priority: 'high',
  },
];

const topThreePrompts = computed(() => {
  const priorityMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...allPrompts]
    .sort((a, b) => (priorityMap[a.priority] ?? 2) - (priorityMap[b.priority] ?? 2))
    .slice(0, 3);
});

// SVG progress ring calculation
const strokeOffset = computed(() => {
  // Circle circumference = 2 * π * r = 2 * π * 50 = 314.159
  // Offset = circumference * (1 - progress)
  const progress = completeness.value / 100;
  return 314.159 * (1 - progress);
});

// Initialize on mount
onMounted(async () => {
  await updateCompleteness();
});
</script>
