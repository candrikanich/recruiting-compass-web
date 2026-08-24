<template>
  <div
    class="rounded-2xl border border-indigo-200 bg-linear-to-br from-indigo-50 to-purple-50 p-6"
  >
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div
        class="h-8 w-8 animate-spin rounded-full border border-indigo-300 border-t-indigo-600"
      />
    </div>

    <div v-else-if="error" class="py-6 text-center">
      <p class="text-sm text-red-600">Unable to load guidance message</p>
    </div>

    <div v-else class="flex items-start gap-4">
      <div class="mt-1 shrink-0">
        <UIcon name="i-heroicons-light-bulb" class="h-6 w-6 text-indigo-600" />
      </div>
      <div class="flex-1">
        <h3 class="mb-2 text-lg font-semibold text-slate-800">
          Parent Guidance
        </h3>
        <p class="mb-4 text-sm leading-relaxed text-slate-700">{{ message }}</p>

        <button
          @click="showLearnMore = true"
          class="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Learn more about this phase
          <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Learn More Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showLearnMore"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div class="w-full max-w-lg rounded-xl bg-white shadow-lg">
            <div
              class="flex items-center justify-between border-b border-slate-200 p-6"
            >
              <h2 class="text-xl font-bold text-slate-900">{{ phaseTitle }}</h2>
              <button
                @click="showLearnMore = false"
                :aria-label="`Close ${phaseTitle} details`"
                class="rounded-lg p-1 transition hover:bg-slate-100"
              >
                <UIcon
                  name="i-heroicons-x-mark"
                  class="h-5 w-5 text-slate-500"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div class="p-6">
              <div class="space-y-4">
                <div>
                  <h3 class="mb-2 font-semibold text-slate-900">
                    What to expect:
                  </h3>
                  <p class="text-sm text-slate-700">
                    {{ expectationsMessage }}
                  </p>
                </div>

                <div>
                  <h3 class="mb-2 font-semibold text-slate-900">
                    Current status:
                  </h3>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-3 w-3 rounded-full"
                      :class="{
                        'bg-brand-emerald-500':
                          athleteData?.status_label === 'on_track',
                        'bg-brand-orange-500':
                          athleteData?.status_label === 'slightly_behind',
                        'bg-red-500': athleteData?.status_label === 'at_risk',
                      }"
                    />
                    <span class="text-sm text-slate-700 capitalize">
                      {{
                        athleteData?.status_label?.replace("_", " ") ||
                        "Unknown"
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-b-xl bg-slate-50 p-6">
              <button
                @click="showLearnMore = false"
                class="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAthleteProfile } from "~/composables/useAthleteProfile";
import {
  getParentMessage,
  getRecruitingExpectations,
} from "~/utils/parentMessaging";
import type { Phase, Division, StatusLabel } from "~/types/timeline";

interface Props {
  athleteId: string;
}

const props = defineProps<Props>();

const {
  athlete: athleteData,
  loading,
  error,
  fetchAthleteProfile,
} = useAthleteProfile(props.athleteId);
const showLearnMore = ref(false);

const message = computed(() => {
  if (!athleteData.value) return "";
  return (
    getParentMessage({
      phase: athleteData.value.current_phase as Phase,
      division: athleteData.value.target_division as Division,
      status: athleteData.value.status_label as StatusLabel,
    }) ||
    "Support your athlete in their recruiting journey. Stay engaged and encourage consistent effort."
  );
});

const phaseTitle = computed(() => {
  const phases: Record<Phase, string> = {
    freshman: "Freshman Year",
    sophomore: "Sophomore Year",
    junior: "Junior Year",
    senior: "Senior Year",
    committed: "Committed",
  };
  return athleteData.value?.current_phase
    ? phases[athleteData.value.current_phase as Phase]
    : "Recruiting Journey";
});

const expectationsMessage = computed(() => {
  if (!athleteData.value?.current_phase) return "";
  return getRecruitingExpectations(
    athleteData.value.current_phase as Phase,
    athleteData.value.target_division as Division | undefined,
  );
});

onMounted(async () => {
  await fetchAthleteProfile();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
