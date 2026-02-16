<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header
    class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200"
    role="banner"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">{{ title }}</h1>
          <p v-if="description" class="text-slate-600 mt-1">
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
