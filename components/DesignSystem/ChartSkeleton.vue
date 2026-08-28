<template>
  <div
    class="rounded-lg bg-white p-6 shadow-sm"
    role="status"
    aria-busy="true"
    aria-label="Loading chart"
  >
    <div class="space-y-4">
      <div class="space-y-2">
        <LoadingSkeleton className="h-6 w-1/3" />
        <LoadingSkeleton className="h-4 w-1/4" />
      </div>
      <div
        class="flex h-64 items-center justify-center rounded-sm bg-brand-slate-100"
      >
        <div class="space-y-3 text-center">
          <LoadingSkeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingSkeleton from "./LoadingSkeleton.vue";
</script>
