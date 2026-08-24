<template>
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
    <InteractionTrendChart :interactions="interactions" />
    <SchoolInterestChart :schools="schools" />
  </div>
</template>

<script setup lang="ts">
import InteractionTrendChart from "./InteractionTrendChart.vue";
import SchoolInterestChart from "./SchoolInterestChart.vue";
import type { School, Interaction } from "~/types/models";

defineProps<{
  schools: School[];
  interactions: Interaction[];
}>();
</script>
