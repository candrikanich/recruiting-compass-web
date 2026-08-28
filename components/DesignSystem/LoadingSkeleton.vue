<template>
  <div :class="[className, 'animate-pulse rounded-sm bg-brand-slate-200']"></div>
</template>

<script setup lang="ts">
interface Props {
  className?: string;
}

withDefaults(defineProps<Props>(), {
  className: "h-4 w-full",
});
</script>
