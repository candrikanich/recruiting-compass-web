<script setup lang="ts">
import { ref } from "vue";
import type { HelpDefinition } from "./helpDefinitions";

interface Props {
  helpDefinition: HelpDefinition;
  position?: "top" | "bottom" | "left" | "right";
  maxWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  position: "top",
  maxWidth: "max-w-xs",
});

const showTooltip = ref(false);

const positionClasses = {
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  left: "right-full mr-2 top-1/2 -translate-y-1/2",
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
};

const arrowClasses = {
  top: "top-full border-t-slate-700 border-l-transparent border-r-transparent border-b-transparent",
  bottom:
    "bottom-full border-b-slate-700 border-l-transparent border-r-transparent border-t-transparent",
  left: "left-full border-l-slate-700 border-t-transparent border-b-transparent border-r-transparent",
  right:
    "right-full border-r-slate-700 border-t-transparent border-b-transparent border-l-transparent",
};
</script>

<template>
  <div class="relative inline-block">
    <div
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      @focus="showTooltip = true"
      @blur="showTooltip = false"
    >
      <slot />
    </div>

    <div
      v-show="showTooltip"
      :class="[positionClasses[position], props.maxWidth]"
      class="absolute z-50 bg-slate-700 text-white text-sm px-3 py-2 rounded shadow-lg pointer-events-none"
    >
      <div class="font-semibold mb-1">{{ helpDefinition.title }}</div>
      <div>{{ helpDefinition.shortDescription }}</div>

      <div :class="arrowClasses[position]" class="absolute w-2 h-2 border-2" />
    </div>
  </div>
</template>

<style scoped>
/* Smooth fade in/out */
div:has(+ div[class*="absolute"]) {
  transition: opacity 0.2s ease-in-out;
}
</style>
