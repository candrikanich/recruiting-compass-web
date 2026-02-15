<template>
  <div
    class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200 shadow-sm p-6"
  >
    <div
      data-testid="guidance-header"
      role="button"
      tabindex="0"
      class="w-full flex items-center gap-2 mb-4 text-left cursor-pointer"
      @click="$emit('toggle')"
      @keydown.enter="$emit('toggle')"
      @keydown.space.prevent="$emit('toggle')"
    >
      <span class="text-2xl">❓</span>
      <h3 class="text-lg font-bold text-slate-900 flex-1">Common Worries</h3>
      <svg
        class="w-5 h-5 text-slate-400 transition-transform duration-200"
        :class="{ 'rotate-180': !collapsed }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>

    <div v-if="!collapsed">
      <p class="text-sm text-slate-600 mb-4">
        Questions other parents ask at this stage
      </p>

      <div class="space-y-2">
      <div
        v-if="worries.length === 0"
        class="text-sm text-slate-500 py-4 text-center"
      >
        No common worries at this stage.
      </div>

      <details
        v-for="worry in worries"
        :key="worry.id"
        class="group bg-white rounded-lg border border-amber-100 p-3 cursor-pointer hover:border-amber-200 transition"
      >
        <summary class="font-medium text-slate-900 flex items-center gap-2">
          <span
            class="text-amber-600 transition group-open:rotate-90"
            style="display: inline-block"
          >
            ▶
          </span>
          {{ worry.question }}
        </summary>
        <div class="mt-3 ml-6 text-sm text-slate-600 leading-relaxed">
          {{ worry.answer }}
        </div>
      </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ParentWorry } from "~/utils/parentWorries";

interface Props {
  worries: ParentWorry[];
  collapsed?: boolean;
}

withDefaults(defineProps<Props>(), {
  collapsed: false,
});

defineEmits<{
  toggle: [];
}>();
</script>
