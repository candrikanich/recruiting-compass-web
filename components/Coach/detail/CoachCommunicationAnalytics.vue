<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  sent: number;
  received: number;
  responseRate: number;
}>();

const sentReceivedRatio = computed(() => {
  const total = props.sent + props.received;
  return total === 0 ? 0 : (props.sent / total) * 100;
});

const gaugeDasharray = computed(() => `${props.responseRate} 100`);

const progressCaption = computed(() => {
  if (props.responseRate >= 75) return "Great Progress";
  if (props.responseRate >= 40) return "Building Momentum";
  return "Needs Attention";
});
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-bold text-slate-900">
        Communication History &amp; Analytics
      </h3>
      <span
        class="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-500"
      >
        All Time
      </span>
    </div>

    <div class="flex items-center gap-5">
      <div class="flex flex-1 flex-col gap-3">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[13px] text-slate-600">Sent / Received</span>
            <span class="text-[13px] font-bold text-slate-900"
              >{{ sent }} / {{ received }}</span
            >
          </div>
          <div class="mt-1.5 h-1.5 w-full rounded bg-slate-100">
            <div
              class="h-full rounded bg-blue-500"
              :style="{ width: `${sentReceivedRatio}%` }"
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <span class="text-[13px] text-slate-600">Response Rate</span>
            <span class="text-[13px] font-bold text-slate-900"
              >{{ responseRate }}%</span
            >
          </div>
          <div class="mt-1.5 h-1.5 w-full rounded bg-slate-100" />
        </div>

        <div class="flex items-center justify-between">
          <span class="text-[13px] text-slate-600">Avg. Response Time</span>
          <span class="text-[13px] font-bold text-slate-900">--</span>
        </div>
      </div>

      <div class="h-24 w-px bg-slate-200" aria-hidden="true" />

      <div class="flex w-[180px] flex-col items-center gap-1.5">
        <div
          class="relative flex h-[72px] w-[72px] items-center justify-center text-emerald-500"
        >
          <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              class="text-slate-200"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="gaugeDasharray"
            />
          </svg>
          <div
            class="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span
              data-testid="response-gauge-value"
              class="text-lg font-extrabold text-emerald-500"
            >
              {{ responseRate }}%
            </span>
            <span class="text-[8px] font-bold text-slate-400 uppercase"
              >Responded</span
            >
          </div>
        </div>
        <p class="text-[11px] text-emerald-500">{{ progressCaption }}</p>
      </div>
    </div>
  </section>
</template>
