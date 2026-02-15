<template>
  <div
    class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200 shadow-sm p-6"
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
      <span class="text-2xl">🛡️</span>
      <h3 class="text-lg font-bold text-slate-900 flex-1">What NOT to Stress About</h3>
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
        Things that don't matter as much as you might think
      </p>

      <div class="space-y-2">
      <div
        v-if="messages.length === 0"
        class="text-sm text-slate-500 py-4 text-center"
      >
        No reassurance needed—you're doing great!
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="bg-white rounded-lg border border-emerald-100 p-3 hover:border-emerald-200 transition"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 text-lg">{{ msg.icon }}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-slate-900">{{ msg.title }}</div>
            <div class="text-sm text-slate-600 mt-1 leading-relaxed">
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
