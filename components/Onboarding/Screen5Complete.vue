<script setup lang="ts">
import { computed } from "vue";
import { useProfileCompleteness } from "~/composables/useProfileCompleteness";

defineEmits<{
  "invite-parent": [];
  complete: [];
}>();

const { completeness } = useProfileCompleteness();

const progressBarColor = computed(() => {
  const pct = completeness.value;
  if (pct < 33) return "bg-red-500";
  if (pct < 66) return "bg-yellow-500";
  return "bg-green-500";
});

const progressBarWidth = computed(() => {
  return `${Math.min(completeness.value, 100)}%`;
});
</script>

<template>
  <div
    class="flex flex-col min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-8"
  >
    <div class="max-w-2xl mx-auto w-full space-y-8 text-center">
      <!-- Icon -->
      <div class="flex justify-center">
        <div
          class="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <!-- Headline -->
      <h1 class="text-3xl font-bold text-slate-900">You're all set!</h1>

      <!-- Profile Completeness Card -->
      <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-slate-600 mb-2">
              Profile Completeness
            </p>
            <div
              role="progressbar"
              :aria-valuenow="completeness"
              aria-valuemin="0"
              aria-valuemax="100"
              class="w-full h-3 bg-slate-200 rounded-full overflow-hidden"
            >
              <div
                :class="progressBarColor"
                class="h-full transition-all duration-500"
                :style="{ width: progressBarWidth }"
              />
            </div>
          </div>
          <p class="text-2xl font-bold text-slate-900">{{ completeness }}%</p>
          <p class="text-sm text-slate-600">
            Complete your profile to unlock better recommendations and
            visibility with coaches
          </p>
        </div>
      </div>

      <!-- CTAs -->
      <div class="flex flex-col gap-3 pt-4">
        <button
          type="button"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          @click="$emit('invite-parent')"
        >
          Invite a Parent
        </button>
        <button
          type="button"
          class="w-full px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          @click="$emit('complete')"
        >
          Skip for now
        </button>
      </div>

      <!-- Additional info -->
      <p class="text-sm text-slate-500">
        You can add more information to your profile anytime in your settings
      </p>
    </div>
  </div>
</template>
