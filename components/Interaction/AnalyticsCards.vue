<script setup lang="ts">
import {
  ChatBubbleLeftRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
} from "@heroicons/vue/24/outline";

type AnalyticsCardsProps = {
  totalCount: number;
  outboundCount: number;
  inboundCount: number;
  thisWeekCount: number;
};

withDefaults(defineProps<AnalyticsCardsProps>(), {
  totalCount: 0,
  outboundCount: 0,
  inboundCount: 0,
  thisWeekCount: 0,
});
</script>

<template>
  <section
    aria-label="Interaction statistics"
    class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
  >
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"
        >
          <ChatBubbleLeftRightIcon
            aria-hidden="true"
            class="w-5 h-5 text-blue-600"
          />
        </div>
        <div>
          <p role="status" class="text-2xl font-bold text-slate-900">
            {{ totalCount }}
          </p>
          <p class="text-sm text-slate-500">Total</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"
        >
          <ArrowUpIcon aria-hidden="true" class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p role="status" class="text-2xl font-bold text-slate-900">
            {{ outboundCount }}
          </p>
          <p class="text-sm text-slate-500">Outbound</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"
        >
          <ArrowDownIcon aria-hidden="true" class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <p role="status" class="text-2xl font-bold text-slate-900">
            {{ inboundCount }}
          </p>
          <p class="text-sm text-slate-500">Inbound</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"
        >
          <CalendarIcon aria-hidden="true" class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p role="status" class="text-2xl font-bold text-slate-900">
            {{ thisWeekCount }}
          </p>
          <p class="text-sm text-slate-500">This Week</p>
        </div>
      </div>
    </div>
  </section>
</template>
