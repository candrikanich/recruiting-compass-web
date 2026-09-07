<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, toRaw, watch } from "vue";
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
  // Chart.js does not clone the data/options it's given — it mutates the
  // dataset objects directly (attaching internal `_meta` caches per chart
  // instance). Handing it the same reference as props.data/props.options
  // would leak that mutation back into the reactive prop, which the deep
  // watch below observes — retriggering render() forever. Clone so
  // Chart.js only ever mutates its own copy.
  chart = new Chart(canvas.value, {
    type: isSpark ? "line" : props.type,
    data: structuredClone(toRaw(props.data)),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...(isSpark ? sparklineOptions : {}),
      ...(props.options ? structuredClone(toRaw(props.options)) : {}),
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
