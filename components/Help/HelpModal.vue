<script setup lang="ts">
import { watch, ref, nextTick, onUnmounted } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import type { HelpDefinition } from "./helpDefinitions";

interface Props {
  isOpen: boolean;
  helpDefinition: HelpDefinition;
}

interface Emits {
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);
let originalBodyOverflow = "";

const handleClose = () => {
  deactivate();
  emit("close");
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    handleClose();
  }
};
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      originalBodyOverflow = document.body.style.overflow;
      document.addEventListener("keydown", handleKeydown);
      document.body.style.overflow = "hidden";
      await nextTick();
      activate();
    } else {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = originalBodyOverflow;
      deactivate();
    }
  },
);

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = originalBodyOverflow;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="handleClose"
        @keydown.escape="handleClose"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          class="mx-4 max-h-96 w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl"
        >
          <!-- Header -->
          <div
            class="sticky top-0 flex items-start justify-between border-b border-blue-200 bg-blue-50 px-6 py-4"
          >
            <h2 id="help-modal-title" class="text-xl font-bold text-slate-900">
              {{ helpDefinition.title }}
            </h2>
            <button
              type="button"
              aria-label="Close help dialog"
              class="text-2xl leading-none text-slate-500 hover:text-slate-700"
              @click="handleClose"
            >
              ×
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-4">
            <p class="mb-3 text-slate-700">
              {{ helpDefinition.shortDescription }}
            </p>
            <p class="mb-4 text-sm leading-relaxed text-slate-600">
              {{ helpDefinition.fullDescription }}
            </p>

            <!-- Related links -->
            <div
              v-if="helpDefinition.relatedLinks?.length"
              class="mt-4 border-t border-slate-200 pt-4"
            >
              <p class="mb-2 text-sm font-semibold text-slate-700">
                Learn More:
              </p>
              <ul class="space-y-1">
                <li v-for="link in helpDefinition.relatedLinks" :key="link.url">
                  <a
                    :href="link.url"
                    class="text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    {{ link.label }}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="sticky bottom-0 flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3"
          >
            <button
              type="button"
              class="rounded-sm bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              @click="handleClose"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-to,
.modal-leave-from {
  opacity: 1;
}
</style>
