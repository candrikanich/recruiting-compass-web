<script setup lang="ts">
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
    class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
  >
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"
        >
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            aria-hidden="true"
            class="h-5 w-5 text-blue-600"
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
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"
        >
          <UIcon
            name="i-heroicons-arrow-up"
            aria-hidden="true"
            class="h-5 w-5 text-emerald-600"
          />
        </div>
        <div>
          <p role="status" class="text-2xl font-bold text-slate-900">
            {{ outboundCount }}
          </p>
          <p class="text-sm text-slate-500">Outbound</p>
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100"
        >
          <UIcon
            name="i-heroicons-arrow-down"
            aria-hidden="true"
            class="h-5 w-5 text-purple-600"
          />
        </div>
        <div>
          <p role="status" class="text-2xl font-bold text-slate-900">
            {{ inboundCount }}
          </p>
          <p class="text-sm text-slate-500">Inbound</p>
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100"
        >
          <UIcon
            name="i-heroicons-calendar"
            aria-hidden="true"
            class="h-5 w-5 text-amber-600"
          />
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
