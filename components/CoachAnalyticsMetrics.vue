<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Total Interactions -->
    <div class="rounded-lg shadow p-6 bg-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-slate-600">Total Interactions</p>
          <p class="text-3xl font-bold mt-2 text-slate-900">
            {{ metrics.totalInteractions }}
          </p>
        </div>
        <div class="text-4xl text-blue-100">📊</div>
      </div>
      <p class="text-xs mt-3 text-slate-600">
        {{ metrics.outboundCount }} sent • {{ metrics.inboundCount }} received
      </p>
    </div>

    <!-- Response Rate -->
    <div class="rounded-lg shadow p-6 bg-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-slate-600">Response Rate</p>
          <p class="text-3xl font-bold mt-2 text-slate-900">
            {{ metrics.responseRate }}%
          </p>
        </div>
        <div :class="getResponseRateColorClass()">
          {{ getResponseRateIcon() }}
        </div>
      </div>
      <p class="text-xs mt-3 text-slate-600">{{ getResponseRateLabel() }}</p>
    </div>

    <!-- Avg Response Time -->
    <div class="rounded-lg shadow p-6 bg-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-slate-600">Avg Response Time</p>
          <p class="text-3xl font-bold mt-2 text-slate-900">
            {{ metrics.averageResponseTime }}h
          </p>
        </div>
        <div :class="getResponseTimeColorClass()">⏱️</div>
      </div>
      <p class="text-xs mt-3 text-slate-600">{{ getResponseTimeLabel() }}</p>
    </div>

    <!-- Days Since Contact -->
    <div class="rounded-lg shadow p-6 bg-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-slate-600">Days Since Contact</p>
          <p class="text-3xl font-bold mt-2 text-slate-900">
            {{
              metrics.daysSinceContact >= 0 ? metrics.daysSinceContact : "N/A"
            }}
          </p>
        </div>
        <div :class="getContactColorClass()">{{ getContactIcon() }}</div>
      </div>
      <p class="text-xs mt-3 text-slate-600">{{ getContactLabel() }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CoachMetrics } from "~/composables/useCoachAnalytics";

defineProps<{
  metrics: CoachMetrics;
}>();

const getResponseRateIcon = () => "✓";
const getResponseRateColorClass = (): string => {
  return "text-2xl text-emerald-200";
};
const getResponseRateLabel = () => {
  return "Percentage of outbound that got response";
};

const getResponseTimeColorClass = (): string => {
  return "text-2xl text-purple-200";
};
const getResponseTimeLabel = () => {
  return "Average time to respond";
};

const getContactColorClass = (): string => {
  return "text-2xl text-orange-200";
};
const getContactIcon = () => "📅";
const getContactLabel = () => {
  return "Time since last contact";
};
</script>
