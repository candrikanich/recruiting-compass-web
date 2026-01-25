<template>
  <div
    class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 shadow-sm p-6"
  >
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">⚡</span>
      <h3 class="text-lg font-bold text-slate-900">What Matters Right Now</h3>
    </div>

    <p class="text-sm text-slate-600 mb-4">
      {{ phaseLabel }} year priorities to focus on
    </p>

    <div class="space-y-3">
      <div
        v-if="priorities.length === 0"
        class="text-sm text-slate-500 py-4 text-center"
      >
        All tasks complete! Keep up the great work.
      </div>

      <button
        v-for="(item, index) in priorities"
        :key="item.taskId"
        @click="$emit('priority-click', item.taskId)"
        class="w-full text-left p-3 bg-white rounded-lg hover:bg-blue-50 transition border border-blue-100 group cursor-pointer"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mt-0.5 group-hover:bg-blue-600 transition"
          >
            {{ index + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-slate-900 group-hover:text-blue-700 transition">
              {{ item.title }}
            </div>
            <div class="text-xs text-slate-600 mt-1 line-clamp-2">
              {{ item.whyItMatters }}
            </div>
          </div>
          <div class="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition">
            →
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WhatMattersItem } from "~/utils/whatMattersNow";

interface Props {
  priorities: WhatMattersItem[];
  phaseLabel: string;
}

defineProps<Props>();

defineEmits<{
  "priority-click": [taskId: string];
}>();
</script>
