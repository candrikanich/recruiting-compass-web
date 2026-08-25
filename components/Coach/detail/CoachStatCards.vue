<script setup lang="ts">
import { computed } from "vue";
import { formatType, getTypeIcon } from "~/utils/interactionFormatters";

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

const preferredChannelIcon = computed(() =>
  props.preferredChannel
    ? getTypeIcon(props.preferredChannel)
    : "i-heroicons-chat-bubble-left",
);

</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row">
    <!-- Days Since Contact -->
    <div
      class="flex h-[140px] flex-1 items-center justify-between gap-3 rounded-xl p-4"
      :class="isOverdue ? 'border-2 border-red-300 bg-white' : 'border border-slate-200 bg-white'"
    >
      <div class="min-w-0">
        <p
          class="text-[11px] font-medium"
          :class="isOverdue ? 'text-red-500' : 'text-slate-600'"
        >
          Days Since Contact
        </p>
        <p
          class="text-[32px] leading-tight font-extrabold"
          :class="isOverdue ? 'text-red-500' : 'text-slate-900'"
        >
          {{ daysSinceContactLabel }}
        </p>
        <span
          v-if="isOverdue"
          class="mt-1 inline-block rounded px-[6px] py-[2px] text-[11px] font-bold text-red-500 bg-red-50"
        >
          OVERDUE
        </span>
      </div>
      <svg viewBox="0 0 40 40" class="h-12 w-12 shrink-0">
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
    </div>

    <!-- Total Interactions -->
    <div
      class="flex h-[140px] flex-1 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div class="min-w-0">
        <p class="text-[11px] font-medium text-slate-600">Total Interactions</p>
        <p class="text-[32px] leading-tight font-extrabold text-slate-900">
          {{ totalInteractions }}
        </p>
        <p class="text-[11px] text-slate-600">{{ totalInteractions }} interactions logged</p>
      </div>
      <svg viewBox="0 0 40 40" class="h-12 w-12 shrink-0">
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
          class="text-blue-500"
          stroke-linecap="round"
          transform="rotate(-90 20 20)"
        />
      </svg>
    </div>

    <!-- Preferred Channel -->
    <div
      class="flex h-[140px] flex-1 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div class="min-w-0">
        <p class="text-[11px] font-medium text-slate-600">Preferred Channel</p>
        <p class="text-xl font-extrabold text-slate-900">
          {{ preferredChannelLabel }}
        </p>
        <p class="text-[11px] text-slate-600">{{ responseRate }}% response rate</p>
      </div>
      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[20px] bg-orange-500"
        aria-hidden="true"
      >
        <UIcon :name="preferredChannelIcon" class="h-5 w-5 text-white" />
      </span>
    </div>
  </div>
</template>
