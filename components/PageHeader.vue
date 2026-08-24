<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <header
    class="border-b border-slate-200 bg-linear-to-r from-slate-50 to-blue-50"
    role="banner"
  >
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">{{ title }}</h1>
          <p v-if="description" class="mt-1 text-slate-600">
            {{ description }}
          </p>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-3">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>
