<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import Chart from "chart.js/auto";
import type { ChartData, ChartOptions } from "chart.js";

const props = defineProps<{
  type: "line" | "bar" | "sparkline" | "doughnut";
  data: ChartData;
  options?: ChartOptions;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const sparklineOptions: ChartOptions = {
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 } },
};

function render(): void {
  if (!canvas.value) return;
  chart?.destroy();
  const isSpark = props.type === "sparkline";
  chart = new Chart(canvas.value, {
    type: isSpark ? "line" : props.type,
    data: props.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...(isSpark ? sparklineOptions : {}),
      ...props.options,
    },
  });
}

onMounted(render);
watch(() => [props.data, props.options], render, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div class="admin-chart">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.admin-chart {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 3rem;
}
</style>
