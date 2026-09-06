<template>
  <p class="mb-8 text-sm text-gray-500">
    Last reviewed {{ formattedDate }}
    <span v-if="isStale" class="text-brand-orange-600">
      — this page may be out of date, let us know if something looks wrong
    </span>
  </p>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ reviewedOn: string }>();

const STALE_AFTER_DAYS = 180;

const formattedDate = computed(() =>
  new Date(`${props.reviewedOn}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);

const isStale = computed(() => {
  const reviewed = new Date(`${props.reviewedOn}T00:00:00`);
  const daysSince = (Date.now() - reviewed.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > STALE_AFTER_DAYS;
});
</script>
