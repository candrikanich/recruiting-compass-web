<template>
  <div class="space-y-6 lg:col-span-2">
    <!-- Schools by Size -->
    <div
      v-if="showSchoolsMetric && schoolCount > 0"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
    >
      <div class="mb-5 flex items-center gap-3">
        <div class="rounded-lg bg-slate-100 p-2">
          <UIcon
            name="i-heroicons-building-library"
            class="h-5 w-5 text-slate-700"
          />
        </div>
        <h3 class="font-semibold text-slate-900">Schools by Size</h3>
      </div>
      <div class="space-y-3">
        <div
          v-for="size in [
            'Very Small',
            'Small',
            'Medium',
            'Large',
            'Very Large',
          ]"
          :key="size"
        >
          <div v-if="schoolSizeBreakdown[size] > 0">
            <div class="mb-1.5 flex items-center justify-between">
              <span class="text-slate-700">{{ size }}</span>
              <span class="font-medium text-slate-900">{{
                schoolSizeBreakdown[size]
              }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                :class="getSizeBarColor(size)"
                class="h-full transition-all duration-500"
                :style="{
                  width: `${(schoolSizeBreakdown[size] / schoolCount) * 100}%`,
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions (Athlete Only) -->
    <div
      v-if="!isViewingAsParent && showQuickActions"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
    >
      <div class="mb-5 flex items-center gap-3">
        <div class="rounded-lg bg-slate-100 p-2">
          <UIcon name="i-heroicons-bolt" class="h-5 w-5 text-slate-700" />
        </div>
        <h3 class="font-semibold text-slate-900">Quick Actions</h3>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <NuxtLink
          to="/coaches/new"
          class="group flex flex-col rounded-lg bg-brand-blue-500 p-4 text-left text-white transition-all hover:scale-105 hover:bg-brand-blue-600 hover:shadow-lg"
        >
          <UIcon
            name="i-heroicons-user-plus"
            class="mb-2 h-6 w-6 text-white transition-transform group-hover:scale-110"
          />
          <div class="mb-1 font-medium">Add Coach</div>
          <div class="text-sm text-white/80">Connect with a new coach</div>
        </NuxtLink>
        <NuxtLink
          to="/interactions/new"
          class="group flex flex-col rounded-lg bg-brand-emerald-500 p-4 text-left text-white transition-all hover:scale-105 hover:bg-brand-emerald-600 hover:shadow-lg"
        >
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="mb-2 h-6 w-6 text-white transition-transform group-hover:scale-110"
          />
          <div class="mb-1 font-medium">Log Interaction</div>
          <div class="text-sm text-white/80">Record a conversation</div>
        </NuxtLink>
        <NuxtLink
          to="/schools/new"
          class="group flex flex-col rounded-lg bg-brand-purple-500 p-4 text-left text-white transition-all hover:scale-105 hover:bg-brand-purple-600 hover:shadow-lg"
        >
          <UIcon
            name="i-heroicons-building-library"
            class="mb-2 h-6 w-6 text-white transition-transform group-hover:scale-110"
          />
          <div class="mb-1 font-medium">Add School</div>
          <div class="text-sm text-white/80">Research a new school</div>
        </NuxtLink>
        <NuxtLink
          to="/events/new"
          class="group flex flex-col rounded-lg bg-brand-orange-500 p-4 text-left text-white transition-all hover:scale-105 hover:bg-brand-orange-600 hover:shadow-lg"
        >
          <UIcon
            name="i-heroicons-calendar-days"
            class="mb-2 h-6 w-6 text-white transition-transform group-hover:scale-110"
          />
          <div class="mb-1 font-medium">Schedule Event</div>
          <div class="text-sm text-white/80">Register for a camp</div>
        </NuxtLink>
      </div>
    </div>

    <!-- Parent Guidance Card -->
    <ParentGuidanceCard v-if="isViewingAsParent" :athlete-id="athleteId" />

    <!-- Performance Metrics -->
    <div
      v-if="showPerformance"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
    >
      <div class="mb-5 flex items-center gap-3">
        <div class="rounded-lg bg-slate-100 p-2">
          <UIcon name="i-heroicons-chart-bar" class="h-5 w-5 text-slate-700" />
        </div>
        <h3 class="font-semibold text-slate-900">Performance Metrics</h3>
      </div>

      <!-- With Metrics -->
      <div v-if="metrics.length > 0" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="metric in topMetrics"
            :key="metric.id"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center"
          >
            <div class="mb-1 text-sm text-slate-600">
              {{ metric.metric_type }}
            </div>
            <div
              class="text-xl font-bold"
              :class="getMetricColor(metric.metric_type)"
            >
              {{ formatMetricValue(metric.metric_type, metric.value) }}
              <span v-if="metric.unit" class="ml-1 text-sm text-slate-500">{{
                metric.unit
              }}</span>
            </div>
          </div>
        </div>
        <NuxtLink
          to="/performance"
          class="mt-4 block w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-blue-700"
        >
          View All Metrics →
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div v-else class="py-8 text-center">
        <p class="mb-4 text-slate-600">No performance metrics logged yet</p>
        <NuxtLink
          to="/performance"
          class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Log Your First Metric →
        </NuxtLink>
      </div>
    </div>

    <!-- Recruiting Calendar -->
    <RecruitingCalendar v-if="showCalendar" :graduation-year="graduationYear" />

    <!-- Charts -->
    <div v-if="showCharts" class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <InteractionTrendChart :interactions="interactions" />
      <SchoolInterestChart :schools="schools" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ParentGuidanceCard from "~/components/Dashboard/ParentGuidanceCard.vue";
import { formatMetricValue } from "~/utils/metricFormat";
import RecruitingCalendar from "~/components/Dashboard/RecruitingCalendar.vue";
import InteractionTrendChart from "~/components/Dashboard/InteractionTrendChart.vue";
import SchoolInterestChart from "~/components/Dashboard/SchoolInterestChart.vue";

interface Metric {
  id: string;
  metric_type: string;
  value: number;
  unit?: string;
  [key: string]: any;
}

interface Props {
  schoolCount: number;
  schoolSizeBreakdown: Record<string, number>;
  metrics: Metric[];
  topMetrics?: Metric[];
  interactions: any[];
  schools: any[];
  graduationYear: number;
  athleteId: string;
  isViewingAsParent?: boolean;
  showSchoolsMetric?: boolean;
  showQuickActions?: boolean;
  showPerformance?: boolean;
  showCalendar?: boolean;
  showCharts?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  topMetrics: () => [],
  isViewingAsParent: false,
  showSchoolsMetric: true,
  showQuickActions: true,
  showPerformance: true,
  showCalendar: true,
  showCharts: true,
});

const getSizeBarColor = (size: string): string => {
  const colors: Record<string, string> = {
    "Very Small": "bg-blue-500",
    Small: "bg-blue-400",
    Medium: "bg-blue-300",
    Large: "bg-orange-400",
    "Very Large": "bg-orange-500",
  };
  return colors[size] || "bg-slate-300";
};

const getMetricColor = (type: string): string => {
  const colors: Record<string, string> = {
    height: "text-blue-600",
    weight: "text-emerald-600",
    velocity: "text-orange-600",
    exit_velo: "text-purple-600",
  };
  return colors[type.toLowerCase()] || "text-slate-600";
};
</script>
