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
    <h3 class="font-semibold text-gray-900 mb-2">{{ label }}</h3>
    <p v-if="value" class="text-gray-700">
      <NuxtLink
        v-if="linkTo"
        :to="linkTo"
        class="text-blue-600 hover:underline"
      >
        {{ value }}
      </NuxtLink>
      <span v-else>{{ value }}</span>
    </p>
    <p v-else class="text-gray-500">—</p>
  </div>
</template>
