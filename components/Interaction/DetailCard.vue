<script setup lang="ts">
interface Props {
  label: string;
  value?: string | null;
  linkTo?: string;
}

defineProps<Props>();
</script>

<template>
  <div class="rounded-lg bg-white p-4 shadow-sm">
    <strong class="mb-2 block font-semibold text-gray-900">{{ label }}</strong>
    <p v-if="value" class="text-gray-700">
      <NuxtLink
        v-if="linkTo"
        :to="linkTo"
        :aria-label="`View details for ${label}: ${value}`"
        class="rounded-sm px-1 text-blue-600 hover:underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {{ value }}
      </NuxtLink>
      <span v-else>{{ value }}</span>
    </p>
    <p v-else class="text-gray-500">—</p>
  </div>
</template>
