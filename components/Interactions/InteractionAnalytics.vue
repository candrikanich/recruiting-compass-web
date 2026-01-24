<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    <!-- Total -->
    <div class="rounded-lg shadow p-6 bg-white">
      <h3 class="text-sm font-medium mb-2 text-slate-600">
        Total Interactions
      </h3>
      <p class="text-3xl font-bold text-slate-900">{{ interactions.length }}</p>
    </div>

    <!-- By Direction -->
    <div class="rounded-lg shadow p-6 bg-white">
      <h3 class="text-sm font-medium mb-2 text-slate-600">Direction</h3>
      <div class="space-y-2">
        <p class="text-sm">
          <span class="font-medium text-slate-900">Outbound:</span>
          <span class="font-bold text-blue-600">{{ outboundCount }}</span>
        </p>
        <p class="text-sm">
          <span class="font-medium text-slate-900">Inbound:</span>
          <span class="font-bold text-emerald-600">{{ inboundCount }}</span>
        </p>
      </div>
    </div>

    <!-- Most Common Type -->
    <div class="rounded-lg shadow p-6 bg-white">
      <h3 class="text-sm font-medium mb-2 text-slate-600">Most Used Type</h3>
      <p class="text-2xl font-bold text-slate-900">{{ getMostCommonType() }}</p>
      <p class="text-xs mt-1 text-slate-600">
        {{ getMostCommonTypeCount() }} interactions
      </p>
    </div>

    <!-- Sentiment Distribution -->
    <div class="rounded-lg shadow p-6 bg-white">
      <h3 class="text-sm font-medium mb-2 text-slate-600">Sentiment</h3>
      <div class="space-y-1 text-xs">
        <p>
          <span class="font-medium text-emerald-600">Very Positive:</span>
          {{ veryPositiveCount }}
        </p>
        <p>
          <span class="font-medium text-blue-600">Positive:</span>
          {{ positiveCount }}
        </p>
        <p>
          <span class="font-medium text-slate-600">Neutral:</span>
          {{ neutralCount }}
        </p>
      </div>
    </div>
  </div>

  <!-- Type Distribution Chart -->
  <div class="rounded-lg shadow p-6 mb-8 bg-white">
    <h3 class="font-bold text-lg mb-4 text-slate-900">Interactions by Type</h3>
    <div class="space-y-2">
      <div
        v-for="(count, type) in typeDistribution"
        :key="type"
        class="flex items-center gap-4"
      >
        <span class="w-32 text-sm font-medium truncate text-slate-900">{{
          formatType(type)
        }}</span>
        <div class="flex-1 h-6 rounded-full overflow-hidden bg-slate-50">
          <div
            :style="{
              width: (count / interactions.length) * 100 + '%',
              backgroundColor: getTypeColorVar(type),
            }"
            class="h-full flex items-center justify-end pr-2"
          >
            <span
              v-if="(count / interactions.length) * 100 > 10"
              class="text-xs font-bold text-white"
            >
              {{ Math.round((count / interactions.length) * 100) }}%
            </span>
          </div>
        </div>
        <span class="w-12 text-sm text-right text-slate-600">{{ count }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Interaction } from "~/types/models";

const props = defineProps<{
  interactions: Interaction[];
}>();

const outboundCount = computed(
  () => props.interactions.filter((i) => i.direction === "outbound").length,
);

const inboundCount = computed(
  () => props.interactions.filter((i) => i.direction === "inbound").length,
);

const veryPositiveCount = computed(
  () =>
    props.interactions.filter((i) => i.sentiment === "very_positive").length,
);

const positiveCount = computed(
  () => props.interactions.filter((i) => i.sentiment === "positive").length,
);

const neutralCount = computed(
  () => props.interactions.filter((i) => i.sentiment === "neutral").length,
);

const typeDistribution = computed(() => {
  const dist: Record<string, number> = {};
  props.interactions.forEach((i) => {
    dist[i.type] = (dist[i.type] || 0) + 1;
  });
  return Object.fromEntries(Object.entries(dist).sort((a, b) => b[1] - a[1]));
});

const getMostCommonType = () => {
  const entries = Object.entries(typeDistribution.value);
  if (entries.length === 0) return "None";
  return formatType(entries[0][0]);
};

const getMostCommonTypeCount = () => {
  const entries = Object.entries(typeDistribution.value);
  return entries.length > 0 ? entries[0][1] : 0;
};

const formatType = (type: string): string => {
  const typeMap: Record<string, string> = {
    email: "Email",
    text: "Text",
    phone_call: "Phone Call",
    in_person_visit: "In-Person Visit",
    virtual_meeting: "Virtual Meeting",
    camp: "Camp",
    showcase: "Showcase",
    tweet: "Tweet",
    dm: "Direct Message",
  };
  return typeMap[type] || type;
};

const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    email: "bg-blue-500",
    text: "bg-purple-500",
    phone_call: "bg-orange-500",
    in_person_visit: "bg-green-500",
    virtual_meeting: "bg-cyan-500",
    camp: "bg-red-500",
    showcase: "bg-yellow-500",
    tweet: "bg-gray-600",
    dm: "bg-pink-500",
  };
  return colors[type] || "bg-gray-500";
};

const getTypeColorVar = (type: string): string => {
  const colors: Record<string, string> = {
    email: "#3b82f6", // blue-500
    text: "#a855f7", // purple-500
    phone_call: "#f97316", // orange-500
    in_person_visit: "#10b981", // emerald-500
    virtual_meeting: "#3b82f6", // blue-500
    camp: "#ef4444", // red-500
    showcase: "#f97316", // orange-500
    tweet: "#64748b", // slate-500
    dm: "#a855f7", // purple-500
  };
  return colors[type] || "#64748b";
};
</script>
