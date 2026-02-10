<template>
  <!-- Loading State -->
  <div
    v-if="loading"
    role="status"
    aria-live="polite"
    class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
  >
    <div
      class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
      aria-hidden="true"
    ></div>
    <p class="text-slate-600">{{ loadingMessage }}</p>
  </div>

  <!-- Error State -->
  <div
    v-else-if="error"
    role="alert"
    class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
  >
    <p class="text-red-700">{{ error }}</p>
  </div>

  <!-- Empty State -->
  <div
    v-else-if="isEmpty"
    role="status"
    class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
  >
    <component
      v-if="emptyIcon"
      :is="emptyIcon"
      class="w-12 h-12 text-slate-300 mx-auto mb-4"
      aria-hidden="true"
    />
    <p class="text-slate-900 font-medium mb-2">{{ emptyTitle }}</p>
    <p class="text-sm text-slate-500 mb-6">{{ emptyMessage }}</p>
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
