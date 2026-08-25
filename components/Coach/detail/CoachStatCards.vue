<script setup lang="ts">
import { computed } from "vue";
import { formatType } from "~/utils/interactionFormatters";

const props = defineProps<{
  daysSinceContact: number | null;
  isOverdue: boolean;
  totalInteractions: number;
  preferredChannel: string | null;
  responseRate: number;
}>();

const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const daysSinceContactLabel = computed(() =>
  props.daysSinceContact === null ? "—" : String(props.daysSinceContact),
);

const preferredChannelLabel = computed(() =>
  props.preferredChannel ? formatType(props.preferredChannel) : "—",
);

const responseRateOffset = computed(() => {
  const clamped = Math.min(100, Math.max(0, props.responseRate));
  return RING_CIRCUMFERENCE * (1 - clamped / 100);
});
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div
      class="rounded-xl border p-4 shadow-xs"
      :class="
        isOverdue
          ? 'border-red-200 bg-red-50'
          : 'border-slate-200 bg-white'
      "
    >
      <div class="flex items-center gap-3">
        <svg viewBox="0 0 40 40" class="h-10 w-10 shrink-0">
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke-width="4"
            class="text-slate-200"
            stroke="currentColor"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke-width="4"
            stroke="currentColor"
            :class="isOverdue ? 'text-red-500' : 'text-blue-500'"
            :stroke-dasharray="RING_CIRCUMFERENCE"
            stroke-dashoffset="0"
            stroke-linecap="round"
            transform="rotate(-90 20 20)"
          />
        </svg>
        <div>
          <p
            class="text-xs font-medium"
            :class="isOverdue ? 'text-red-600' : 'text-slate-600'"
          >
            Days Since Contact
          </p>
          <p
            class="text-xl font-bold"
            :class="isOverdue ? 'text-red-700' : 'text-slate-900'"
          >
            {{ daysSinceContactLabel }}
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div class="flex items-center gap-3">
        <svg viewBox="0 0 40 40" class="h-10 w-10 shrink-0">
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke-width="4"
            class="text-slate-200"
            stroke="currentColor"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke-width="4"
            stroke="currentColor"
            class="text-brand-blue-600"
            stroke-linecap="round"
            transform="rotate(-90 20 20)"
          />
        </svg>
        <div>
          <p class="text-xs font-medium text-slate-600">Total Interactions</p>
          <p class="text-xl font-bold text-slate-900">
            {{ totalInteractions }}
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div class="flex items-center gap-3">
        <svg viewBox="0 0 40 40" class="h-10 w-10 shrink-0">
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke-width="4"
            class="text-slate-200"
            stroke="currentColor"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke-width="4"
            stroke="currentColor"
            class="text-green-500"
            :stroke-dasharray="RING_CIRCUMFERENCE"
            :stroke-dashoffset="responseRateOffset"
            stroke-linecap="round"
            transform="rotate(-90 20 20)"
          />
        </svg>
        <div>
          <p class="text-xs font-medium text-slate-600">Preferred Channel</p>
          <p class="text-lg font-bold text-slate-900">
            {{ preferredChannelLabel }}
          </p>
          <p class="text-xs text-slate-500">{{ responseRate }}% response rate</p>
        </div>
      </div>
    </div>
  </div>
</template>
