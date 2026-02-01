<script setup lang="ts">
import { watch, ref } from "vue";
import type { HelpDefinition } from "./helpDefinitions";

interface Props {
  isOpen: boolean;
  helpDefinition: HelpDefinition;
}

interface Emits {
  (e: "close"): void;
}

defineProps<Props>();
defineEmits<Emits>();

const modalRef = ref<HTMLDivElement | null>(null);

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    // Emit close event
  }
};

watch(
  (props) => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeydown);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "auto";
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        @click.self="$emit('close')"
      >
        <div
          ref="modalRef"
          class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto"
        >
          <!-- Header -->
          <div
            class="sticky top-0 bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-start justify-between"
          >
            <h2 class="text-xl font-bold text-slate-900">
              {{ helpDefinition.title }}
            </h2>
            <button
              type="button"
              class="text-slate-500 hover:text-slate-700 text-2xl leading-none"
              @click="$emit('close')"
            >
              ×
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-4">
            <p class="text-slate-700 mb-3">
              {{ helpDefinition.shortDescription }}
            </p>
            <p class="text-slate-600 text-sm leading-relaxed mb-4">
              {{ helpDefinition.fullDescription }}
            </p>

            <!-- Related links -->
            <div
              v-if="helpDefinition.relatedLinks?.length"
              class="mt-4 pt-4 border-t border-slate-200"
            >
              <p class="text-sm font-semibold text-slate-700 mb-2">
                Learn More:
              </p>
              <ul class="space-y-1">
                <li v-for="link in helpDefinition.relatedLinks" :key="link.url">
                  <a
                    :href="link.url"
                    class="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {{ link.label }}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end"
          >
            <button
              type="button"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              @click="$emit('close')"
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
