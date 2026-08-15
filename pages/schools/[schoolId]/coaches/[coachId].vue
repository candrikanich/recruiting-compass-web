<template>
  <div />
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const schoolId = route.params.schoolId as string;
const coachId = route.params.coachId as string;
const params = new URLSearchParams({
  back: `/schools/${schoolId}/coaches`,
  label: "Coaches",
});
await navigateTo(`/coaches/${coachId}?${params.toString()}`, {
  redirectCode: 301,
  replace: true,
});
</script>
