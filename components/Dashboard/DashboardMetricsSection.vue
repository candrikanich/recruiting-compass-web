<template>
  <!-- Row 2: Performance Metrics (2 cols) + Upcoming Events (1 col) -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <PerformanceMetricsWidget
      :metrics="metrics"
      :top-metrics="topMetrics"
      :show-performance="true"
      class="lg:col-span-2"
    />
    <UpcomingEventsWidget
      :events="upcomingEvents"
      :show-events="true"
      class="lg:col-span-1"
    />
  </div>
</template>

<script setup lang="ts">
import PerformanceMetricsWidget from "./PerformanceMetricsWidget.vue";
import UpcomingEventsWidget from "./UpcomingEventsWidget.vue";
import type { PerformanceMetric, Event } from "~/types/models";

defineProps<{
  metrics: PerformanceMetric[];
  topMetrics: PerformanceMetric[];
  upcomingEvents: Event[];
}>();
</script>
