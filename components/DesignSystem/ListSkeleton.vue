<template>
  <div class="bg-white rounded-lg shadow divide-y divide-gray-200">
    <div v-for="i in lines" :key="i" class="p-4 space-y-2">
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
