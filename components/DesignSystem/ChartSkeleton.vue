<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="space-y-4">
      <div class="space-y-2">
        <LoadingSkeleton className="h-6 w-1/3" />
        <LoadingSkeleton className="h-4 w-1/4" />
      </div>
      <div class="h-64 bg-gray-100 rounded flex items-center justify-center">
        <div class="text-center space-y-3">
          <LoadingSkeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingSkeleton from "./LoadingSkeleton.vue";
</script>
