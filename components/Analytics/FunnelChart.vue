<template>
  <div class="rounded-lg p-6 bg-white shadow-md">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4"
    >
      <div>
        <h3 class="text-lg font-bold text-slate-900">{{ title }}</h3>
        <p class="text-sm mt-1 text-slate-600">{{ totalItems }} total items</p>
      </div>
    </div>

    <!-- Funnel Chart -->
    <div v-if="hasData" class="flex flex-col items-center">
      <svg
        :viewBox="`0 0 400 ${stages.length * 100 + 50}`"
        class="w-full max-w-2xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- Title -->
        <text
          x="200"
          y="30"
          text-anchor="middle"
          class="text-sm font-semibold"
          fill="#374151"
        >
          {{ title }}
        </text>

        <!-- Funnel Stages -->
        <g v-for="(stage, index) in stages" :key="index">
          <!-- Stage polygon -->
          <polygon
            :points="getStagePolygonPoints(index)"
            :fill="stage.color || defaultColors[index % defaultColors.length]"
            class="hover:opacity-80 transition-opacity cursor-pointer"
            :class="{ 'opacity-50': hoveredStage === index }"
            @click="handleStageClick(index)"
            @mouseenter="hoveredStage = index"
            @mouseleave="hoveredStage = null"
          />

          <!-- Stage label -->
          <text
            :x="200"
            :y="getStageYCenter(index) - 10"
            text-anchor="middle"
            class="text-sm font-semibold"
            fill="#fff"
            pointer-events="none"
          >
            {{ stage.label }}
          </text>

          <!-- Stage value -->
          <text
            :x="200"
            :y="getStageYCenter(index) + 10"
            text-anchor="middle"
            class="text-lg font-bold"
            fill="#fff"
            pointer-events="none"
          >
            {{ stage.value }}
          </text>

          <!-- Conversion rate (except last stage) -->
          <text
            v-if="index < stages.length - 1"
            :x="200"
            :y="getStageYCenter(index) + 50"
            text-anchor="middle"
            class="text-xs font-medium"
            fill="#6b7280"
            pointer-events="none"
          >
            {{ getConversionRate(index) }}% → next
          </text>
        </g>
      </svg>

      <!-- Stage Details -->
      <div
        class="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
      >
        <div
          v-for="(stage, index) in stages"
          :key="`detail-${index}`"
          data-testid="stage-card"
          class="p-4 rounded-lg border-l-4 bg-slate-50"
          :style="{
            borderColor:
              stage.color || defaultColors[index % defaultColors.length],
          }"
          @click="handleStageClick(index)"
          @mouseenter="hoveredStage = index"
          @mouseleave="hoveredStage = null"
          :class="{ 'ring-2 ring-offset-2': hoveredStage === index }"
        >
          <p class="text-sm font-medium text-slate-600">{{ stage.label }}</p>
          <p class="text-2xl font-bold mt-1 text-slate-900">
            {{ stage.value }}
          </p>
          <p class="text-xs mt-2 text-slate-600">
            {{ getStagePercentage(index) }}% of total
          </p>
          <p v-if="index > 0" class="text-xs text-slate-600">
            {{ getConversionRate(index - 1) }}% from previous
          </p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 text-slate-600">
      <p>{{ emptyStateMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Stage {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  title: string;
  stages: Stage[];
  emptyStateMessage?: string;
  colors?: string[];
  onStageClick?: (label: string, value: number, index: number) => void;
}

const props = withDefaults(defineProps<Props>(), {
  emptyStateMessage: "No pipeline data available",
  colors: () => [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
  ],
});

const emit = defineEmits<{
  "stage-click": [label: string, value: number, index: number];
}>();

const hoveredStage = ref<number | null>(null);

const defaultColors = computed(() => props.colors);
const hasData = computed(
  () => props.stages.length > 0 && props.stages.some((s) => s.value > 0),
);

// Chart configuration
const chartWidth = 400;
const chartHeight = 500;
const _minWidth = 50;
const _maxWidth = 320;
const metrics = computed(() => {
  const allEqual =
    props.stages.length > 1 &&
    props.stages.every((stage) => stage.value === props.stages[0].value);
  const total = totalItems.value;
  const firstStageValue = props.stages[0]?.value || 1;

  return props.stages.map((stage, index) => {
    let conversionRate: number;

    if (props.stages.length === 1) {
      conversionRate = 100;
    } else if (allEqual) {
      conversionRate = 100;
    } else if (index === 0) {
      conversionRate = 100;
    } else if (index >= props.stages.length - 1) {
      conversionRate = 0;
    } else if (index === 1) {
      // Second stage: percentage of first stage
      conversionRate = Math.round((stage.value / firstStageValue) * 100);
    } else {
      // Other stages: percentage of previous stage
      const previousValue = props.stages[index - 1].value;
      conversionRate =
        previousValue === 0
          ? 0
          : Math.round((stage.value / previousValue) * 100);
    }

    return {
      ...stage,
      conversionRate,
      percentage:
        firstStageValue === 0
          ? 0
          : Math.round((stage.value / firstStageValue) * 100),
    };
  });
});
const colors = computed(() => props.colors);

const totalItems = computed(() => {
  return props.stages.reduce((sum, stage) => sum + stage.value, 0);
});

// Get SVG polygon points for a stage
const getStagePolygonPoints = (index: number): string => {
  const maxWidth = _maxWidth;
  const stageHeight = 80;
  const yStart = 50 + index * 100;
  const yEnd = yStart + stageHeight;

  // Calculate widths based on values
  const maxValue = Math.max(...props.stages.map((s) => s.value));
  const currentWidth = (props.stages[index].value / maxValue) * maxWidth;
  const nextValue = props.stages[index + 1]?.value || props.stages[index].value;
  const nextWidth = (nextValue / maxValue) * maxWidth;

  const leftX1 = 200 - currentWidth / 2;
  const rightX1 = 200 + currentWidth / 2;
  const leftX2 = 200 - nextWidth / 2;
  const rightX2 = 200 + nextWidth / 2;

  return `${leftX1},${yStart} ${rightX1},${yStart} ${rightX2},${yEnd} ${leftX2},${yEnd}`;
};

// Get Y center position for a stage
const getStageYCenter = (index: number): number => {
  return 50 + index * 100 + 40;
};

// Calculate conversion rate to next stage
const getConversionRate = (index: number): number => {
  if (index >= props.stages.length - 1) return 0;

  const currentValue = props.stages[index].value;
  const nextValue = props.stages[index + 1].value;

  if (currentValue === 0) return 0;
  return Math.round((nextValue / currentValue) * 100);
};

// Calculate percentage of total
const getStagePercentage = (index: number): number => {
  const total = totalItems.value;
  if (total === 0) return 0;
  return Math.round((props.stages[index].value / total) * 100);
};

// Handle stage click
const handleStageClick = (index: number) => {
  const stage = props.stages[index];
  emit("stage-click", stage.label, stage.value, index);
  props.onStageClick?.(stage.label, stage.value, index);
};

// Expose computed properties for testing
defineExpose({
  metrics,
  colors,
  chartWidth,
  chartHeight,
  _minWidth,
  _maxWidth,
  getStagePolygonPoints,
});
</script>

<style scoped>
svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05));
}

polygon {
  transition: opacity 0.2s ease;
}
</style>
