<template>
  <div :class="[className, 'animate-pulse bg-gray-200 rounded']"></div>
</template>

<script setup lang="ts">
interface Props {
  className?: string;
}

withDefaults(defineProps<Props>(), {
  className: "h-4 w-full",
});
</script>
