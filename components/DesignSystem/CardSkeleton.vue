<template>
  <div class="space-y-4 rounded-lg bg-white p-6 shadow-sm">
    <div class="space-y-2">
      <LoadingSkeleton className="h-6 w-2/3" />
      <LoadingSkeleton className="h-4 w-1/2" />
    </div>
    <div class="space-y-2">
      <LoadingSkeleton className="h-8 w-1/4" />
      <LoadingSkeleton className="h-4 w-3/4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingSkeleton from "./LoadingSkeleton.vue";
</script>
