<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        @keydown.escape="handleClose"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-modal-title"
          class="animate-slide-up w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <!-- Header with gradient -->
          <div
            class="bg-linear-to-r from-brand-orange-500 to-brand-red-500 px-6 py-8 text-white"
          >
            <h2 id="recovery-modal-title" class="mb-2 text-2xl font-bold">
              Let's Get Back on Track 🎯
            </h2>
            <p class="text-sm text-brand-orange-50">
              We noticed you're behind. This is recoverable with a focused plan.
            </p>
          </div>

          <!-- Plan Content -->
          <div class="space-y-6 px-6 py-6">
            <!-- Trigger Info -->
            <div
              class="rounded-sm border-l-4 border-brand-orange-500 bg-brand-orange-50 p-4"
            >
              <p class="text-sm font-medium text-brand-orange-900">
                {{ plan.title }}
              </p>
              <p class="mt-1 text-xs text-brand-orange-700">
                {{ plan.description }}
              </p>
            </div>

            <!-- Duration -->
            <div class="flex items-center gap-3 text-sm">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue-100"
              >
                <span class="text-lg" aria-hidden="true">⏱️</span>
              </div>
              <div>
                <p class="font-semibold text-slate-900">
                  {{ plan.duration_days }}-Day Plan
                </p>
                <p class="text-xs text-slate-600">
                  Realistic timeline to get back on track
                </p>
              </div>
            </div>

            <!-- Steps -->
            <div class="space-y-3">
              <p class="text-sm font-semibold text-slate-900">Action Steps:</p>
              <ol class="space-y-2">
                <li
                  v-for="(step, idx) in plan.steps"
                  :key="idx"
                  class="flex gap-3"
                >
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-emerald-100 text-xs font-bold text-brand-emerald-700"
                  >
                    {{ idx + 1 }}
                  </span>
                  <span class="pt-0.5 text-sm text-slate-700">{{ step }}</span>
                </li>
              </ol>
            </div>

            <!-- Support Message -->
            <div class="rounded-sm bg-brand-emerald-50 p-4 text-center">
              <p class="text-sm text-brand-emerald-900">
                <strong>You've got this!</strong> Many athletes successfully
                recover from setbacks. Focus on the first step.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="space-y-3 border-t border-slate-200 bg-slate-50 px-6 py-4"
          >
            <button
              @click="handleAcknowledge"
              class="w-full rounded-xl bg-linear-to-r from-brand-emerald-600 to-brand-emerald-500 px-4 py-3 font-semibold text-white transition hover:from-brand-emerald-700 hover:to-brand-emerald-600"
            >
              Start Recovery Plan
            </button>
            <button
              @click="handleClose"
              class="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Review Later
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import type { RecoveryPlan } from "~/composables/useRecovery";

interface Props {
  isOpen: boolean;
  plan: RecoveryPlan;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "acknowledged"): void;
}>();

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const handleClose = () => {
  deactivate();
  emit("close");
};

const handleAcknowledge = () => {
  emit("acknowledged");
  handleClose();
};

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-slide-up {
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
