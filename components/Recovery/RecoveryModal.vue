<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up"
        >
          <!-- Header with gradient -->
          <div
            class="bg-gradient-to-r from-amber-500 to-red-500 text-white px-6 py-8"
          >
            <h2 class="text-2xl font-bold mb-2">Let's Get Back on Track 🎯</h2>
            <p class="text-amber-50 text-sm">
              We noticed you're behind. This is recoverable with a focused plan.
            </p>
          </div>

          <!-- Plan Content -->
          <div class="px-6 py-6 space-y-6">
            <!-- Trigger Info -->
            <div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p class="text-sm text-amber-900 font-medium">{{ plan.title }}</p>
              <p class="text-xs text-amber-700 mt-1">{{ plan.description }}</p>
            </div>

            <!-- Duration -->
            <div class="flex items-center gap-3 text-sm">
              <div
                class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
              >
                <span class="text-lg">⏱️</span>
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
              <p class="font-semibold text-slate-900 text-sm">Action Steps:</p>
              <ol class="space-y-2">
                <li
                  v-for="(step, idx) in plan.steps"
                  :key="idx"
                  class="flex gap-3"
                >
                  <span
                    class="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold"
                  >
                    {{ idx + 1 }}
                  </span>
                  <span class="text-sm text-slate-700 pt-0.5">{{ step }}</span>
                </li>
              </ol>
            </div>

            <!-- Support Message -->
            <div class="bg-green-50 rounded p-4 text-center">
              <p class="text-sm text-green-900">
                <strong>You've got this!</strong> Many athletes successfully
                recover from setbacks. Focus on the first step.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="border-t border-slate-200 px-6 py-4 bg-slate-50 space-y-3"
          >
            <button
              @click="handleAcknowledge"
              class="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition"
            >
              Start Recovery Plan
            </button>
            <button
              @click="emit('close')"
              class="w-full px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition"
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

const handleAcknowledge = () => {
  emit("acknowledged");
  emit("close");
};
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
