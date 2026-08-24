<template>
  <div
    class="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-amber-100 p-6 shadow-xs"
  >
    <button
      type="button"
      data-testid="guidance-header"
      :aria-expanded="!collapsed"
      class="mb-4 flex w-full items-center gap-2 text-left"
      @click="$emit('toggle')"
    >
      <span class="text-2xl">❓</span>
      <h3 class="flex-1 text-lg font-bold text-slate-900">Common Worries</h3>
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
        Questions other parents ask at this stage
      </p>

      <div class="space-y-2">
        <div
          v-if="worries.length === 0"
          class="py-4 text-center text-sm text-slate-500"
        >
          No common worries at this stage.
        </div>

        <details
          v-for="worry in worries"
          :key="worry.id"
          class="group cursor-pointer rounded-lg border border-amber-100 bg-white p-3 transition hover:border-amber-200"
        >
          <summary class="flex items-center gap-2 font-medium text-slate-900">
            <span
              class="text-amber-600 transition group-open:rotate-90"
              style="display: inline-block"
            >
              ▶
            </span>
            {{ worry.question }}
          </summary>
          <div class="mt-3 ml-6 text-sm leading-relaxed text-slate-600">
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
