<script setup lang="ts">
interface Props {
  label: string;
  value?: string | null;
  linkTo?: string;
}

defineProps<Props>();
</script>

<template>
  <div class="bg-white rounded-lg shadow p-4">
    <strong class="font-semibold text-gray-900 mb-2 block">{{ label }}</strong>
    <p v-if="value" class="text-gray-700">
      <NuxtLink
        v-if="linkTo"
        :to="linkTo"
        :aria-label="`View details for ${label}: ${value}`"
        class="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
      >
        {{ value }}
      </NuxtLink>
      <span v-else>{{ value }}</span>
    </p>
    <p v-else class="text-gray-500">—</p>
  </div>
</template>
