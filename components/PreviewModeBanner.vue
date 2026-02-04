<template>
  <div
    v-if="isInPreviewMode()"
    data-testid="preview-mode-banner"
    role="button"
    tabindex="0"
    aria-label="Enter family code to exit preview mode"
    class="fixed top-0 left-0 right-0 w-full bg-red-600 text-white py-3 px-4 cursor-pointer hover:bg-red-700 transition-colors z-50"
    @click="handleBannerClick"
    @keydown.enter="handleBannerClick"
  >
    <div class="flex items-center justify-center gap-2">
      <span class="text-sm font-semibold">
        Preview Mode — Enter a Family Code to start your player's real journey
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useParentPreviewMode } from "~/composables/useParentPreviewMode";

const { isInPreviewMode } = useParentPreviewMode();

const emit = defineEmits<{
  "open-family-code-modal": [];
}>();

const handleBannerClick = (): void => {
  emit("open-family-code-modal");
};
</script>
