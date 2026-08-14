<template>
  <div />
</template>

<script setup lang="ts">
import type { Coach } from "~/types/models";

defineProps<{
  coach: Coach;
  contactMode?: "native" | "modal";
}>();

defineEmits<{ "open-communication": [] }>();
</script>
