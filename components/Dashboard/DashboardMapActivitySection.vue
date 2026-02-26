<template>
  <!-- Row 3: School Map (2 cols) + Recent Activity (1 col) -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <SchoolMapWidget :schools="schools" class="lg:col-span-2" />
    <div class="lg:col-span-1">
      <RecentActivityFeed />
    </div>
  </div>
</template>

<script setup lang="ts">
import SchoolMapWidget from "./SchoolMapWidget.vue";
import RecentActivityFeed from "./RecentActivityFeed.vue";
import type { School } from "~/types/models";

defineProps<{
  schools: School[];
}>();
</script>
