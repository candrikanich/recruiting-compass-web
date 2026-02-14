<script setup lang="ts">
import { ref, defineAsyncComponent } from "vue";
import TooltipGuide from "./TooltipGuide.vue";
const HelpModal = defineAsyncComponent(() => import("./HelpModal.vue"));
import type { HelpDefinition } from "./helpDefinitions";
import { getHelpDefinition } from "./helpDefinitions";

interface Props {
  helpId: string;
  size?: "sm" | "md" | "lg";
  variant?: "inline" | "block";
  showTooltip?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "sm",
  variant: "inline",
  showTooltip: true,
});

const showModal = ref(false);
const helpDef = getHelpDefinition(props.helpId);

const sizeClasses = {
  sm: "w-4 h-4 text-xs",
  md: "w-5 h-5 text-sm",
  lg: "w-6 h-6 text-base",
};

const variantClasses = {
  inline: "inline-flex ml-1",
  block: "flex mt-1",
};
</script>

<template>
  <div :class="variantClasses[variant]">
    <TooltipGuide v-if="showTooltip && helpDef" :help-definition="helpDef">
      <button
        class="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
        :class="sizeClasses[size]"
        type="button"
        @click="showModal = true"
      >
        ?
      </button>
    </TooltipGuide>

    <button
      v-else
      class="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
      :class="sizeClasses[size]"
      type="button"
      @click="showModal = true"
    >
      ?
    </button>

    <HelpModal
      v-if="helpDef"
      :is-open="showModal"
      :help-definition="helpDef"
      @close="showModal = false"
    />
  </div>
</template>

<style scoped>
button {
  cursor: pointer;
  font-weight: 600;
}
</style>
