<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timeout-title"
      >
        <div
          class="mx-4 w-full max-w-md rounded-lg border-l-4 border-yellow-500 bg-white p-6 shadow-2xl"
        >
          <!-- Header -->
          <div class="mb-4">
            <h2
              id="timeout-title"
              class="flex items-center gap-2 text-lg font-semibold text-slate-900"
            >
              <svg
                class="h-5 w-5 text-yellow-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              Session Timeout Warning
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              Your session is about to expire due to inactivity.
            </p>
          </div>

          <!-- Timer Display -->
          <div class="mb-6 rounded-lg bg-yellow-50 p-4 text-center">
            <p class="mb-2 text-sm text-slate-600">Time remaining:</p>
            <p class="text-3xl font-bold text-yellow-700">
              {{ formatTime(secondsRemaining) }}
            </p>
          </div>

          <!-- Message -->
          <p class="mb-6 text-sm text-slate-600">
            You will be automatically logged out for security reasons. Click
            "Stay Logged In" to extend your session.
          </p>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              type="button"
              @click="$emit('stay-logged-in')"
              class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Stay Logged In
            </button>
            <button
              type="button"
              @click="$emit('logout-now')"
              class="flex-1 rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-300 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean;
  secondsRemaining: number;
}

defineProps<Props>();

defineEmits<{
  "stay-logged-in": [];
  "logout-now": [];
}>();

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
</style>
