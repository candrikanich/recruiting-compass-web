<template>
  <div
    class="rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50 to-blue-100 p-6 shadow-xs"
  >
    <button
      type="button"
      data-testid="guidance-header"
      :aria-expanded="!collapsed"
      class="mb-4 flex w-full items-center gap-2 text-left"
      @click="$emit('toggle')"
    >
      <span class="text-2xl">⚡</span>
      <h3 class="flex-1 text-lg font-bold text-slate-900">
        What Matters Right Now
      </h3>
      <svg
        class="h-5 w-5 text-slate-400 transition-transform duration-200"
        :class="{ 'rotate-180': !collapsed }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <div v-if="!collapsed">
      <p class="mb-4 text-sm text-slate-600">
        {{ phaseLabel }} year priorities to focus on
      </p>

      <div class="space-y-3">
        <div
          v-if="priorities.length === 0"
          class="py-4 text-center text-sm text-slate-500"
        >
          All tasks complete! Keep up the great work.
        </div>

        <button
          v-for="(item, index) in priorities"
          :key="item.taskId"
          @click="$emit('priority-click', item.taskId)"
          class="group w-full cursor-pointer rounded-lg border border-blue-100 bg-white p-3 text-left transition hover:bg-blue-50"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white transition group-hover:bg-blue-600"
            >
              {{ index + 1 }}
            </div>
            <div class="min-w-0 flex-1">
              <div
                class="font-medium text-slate-900 transition group-hover:text-blue-700"
              >
                {{ item.title }}
              </div>
              <div class="mt-1 line-clamp-2 text-xs text-slate-600">
                {{ item.whyItMatters }}
              </div>
            </div>
            <div
              class="shrink-0 text-slate-400 transition group-hover:text-blue-500"
            >
              →
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WhatMattersItem } from "~/utils/whatMattersNow";

interface Props {
  priorities: WhatMattersItem[];
  phaseLabel: string;
  collapsed?: boolean;
}

withDefaults(defineProps<Props>(), {
  collapsed: false,
});

defineEmits<{
  "priority-click": [taskId: string];
  toggle: [];
}>();
</script>
