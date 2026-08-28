<template>
  <div
    class="divide-y divide-brand-slate-200 rounded-lg bg-white shadow-sm"
    role="status"
    aria-busy="true"
    aria-label="Loading list"
  >
    <div v-for="i in lines" :key="i" class="space-y-2 p-4">
      <div class="flex items-center justify-between">
        <LoadingSkeleton className="h-5 w-1/3" />
        <LoadingSkeleton className="h-4 w-16" />
      </div>
      <LoadingSkeleton className="h-4 w-2/3" />
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingSkeleton from "./LoadingSkeleton.vue";

interface Props {
  lines?: number;
}

withDefaults(defineProps<Props>(), {
  lines: 5,
});
</script>
