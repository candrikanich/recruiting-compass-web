<template>
  <div
    class="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-emerald-100 p-6 shadow-xs"
  >
    <button
      type="button"
      data-testid="guidance-header"
      :aria-expanded="!collapsed"
      class="mb-4 flex w-full items-center gap-2 text-left"
      @click="$emit('toggle')"
    >
      <span class="text-2xl">🛡️</span>
      <h3 class="flex-1 text-lg font-bold text-slate-900">
        What NOT to Stress About
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
        Things that don't matter as much as you might think
      </p>

      <div class="space-y-2">
        <div
          v-if="messages.length === 0"
          class="py-4 text-center text-sm text-slate-500"
        >
          No reassurance needed—you're doing great!
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="rounded-lg border border-emerald-100 bg-white p-3 transition hover:border-emerald-200"
        >
          <div class="flex items-start gap-3">
            <div class="shrink-0 text-lg">{{ msg.icon }}</div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-slate-900">{{ msg.title }}</div>
              <div class="mt-1 text-sm leading-relaxed text-slate-600">
                {{ msg.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReassuranceMessage } from "~/utils/parentReassurance";

interface Props {
  messages: ReassuranceMessage[];
  collapsed?: boolean;
}

withDefaults(defineProps<Props>(), {
  collapsed: false,
});

defineEmits<{
  toggle: [];
}>();
</script>
