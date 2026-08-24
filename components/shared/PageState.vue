<template>
  <!-- Loading State -->
  <div
    v-if="loading"
    role="status"
    aria-live="polite"
    class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
  >
    <div
      class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
      aria-hidden="true"
    ></div>
    <p class="text-slate-600">{{ loadingMessage }}</p>
  </div>

  <!-- Error State -->
  <div
    v-else-if="error"
    role="alert"
    class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
  >
    <p class="text-red-700">{{ error }}</p>
  </div>

  <!-- Empty State -->
  <div
    v-else-if="isEmpty"
    role="status"
    class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
  >
    <component
      v-if="emptyIcon"
      :is="emptyIcon"
      class="mx-auto mb-4 h-12 w-12 text-slate-300"
      aria-hidden="true"
    />
    <p class="mb-2 font-medium text-slate-900">{{ emptyTitle }}</p>
    <p class="mb-6 text-sm text-slate-500">{{ emptyMessage }}</p>
    <slot name="empty-action" />
  </div>

  <!-- Content -->
  <div v-else>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

interface Props {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  loadingMessage?: string;
  emptyIcon?: Component;
  emptyTitle?: string;
  emptyMessage?: string;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  isEmpty: false,
  loadingMessage: "Loading...",
  emptyTitle: "No data available",
  emptyMessage: "",
});
</script>
