<template>
  <div />
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const schoolId = route.params.schoolId as string;
const coachId = route.params.coachId as string;
const back = encodeURIComponent(`/schools/${schoolId}/coaches`);
const label = encodeURIComponent("Coaches");
await navigateTo(`/coaches/${coachId}?back=${back}&label=${label}`, {
  redirectCode: 301,
  replace: true,
});
</script>
