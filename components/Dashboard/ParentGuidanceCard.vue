<template>
  <div
    class="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6"
  >
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div
        class="animate-spin rounded-full h-8 w-8 border border-indigo-300 border-t-indigo-600"
      />
    </div>

    <div v-else-if="error" class="text-center py-6">
      <p class="text-sm text-red-600">Unable to load guidance message</p>
    </div>

    <div v-else class="flex items-start gap-4">
      <div class="flex-shrink-0 mt-1">
        <LightBulbIcon class="w-6 h-6 text-indigo-600" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-lg text-slate-800 mb-2">
          Parent Guidance
        </h3>
        <p class="text-slate-700 text-sm leading-relaxed mb-4">{{ message }}</p>

        <button
          @click="showLearnMore = true"
          class="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          Learn more about this phase
          <ArrowRightIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Learn More Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showLearnMore"
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div class="bg-white rounded-xl shadow-lg max-w-lg w-full">
            <div
              class="p-6 border-b border-slate-200 flex items-center justify-between"
            >
              <h2 class="text-xl font-bold text-slate-900">{{ phaseTitle }}</h2>
              <button
                @click="showLearnMore = false"
                class="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <XMarkIcon class="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div class="p-6">
              <div class="space-y-4">
                <div>
                  <h3 class="font-semibold text-slate-900 mb-2">
                    What to expect:
                  </h3>
                  <p class="text-slate-700 text-sm">
                    {{ expectationsMessage }}
                  </p>
                </div>

                <div>
                  <h3 class="font-semibold text-slate-900 mb-2">
                    Current status:
                  </h3>
                  <div class="flex items-center gap-2">
                    <div
                      class="w-3 h-3 rounded-full"
                      :class="{
                        'bg-green-500':
                          athleteData?.status_label === 'on_track',
                        'bg-yellow-500':
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

            <div class="p-6 bg-slate-50 rounded-b-xl">
              <button
                @click="showLearnMore = false"
                class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
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
import {
  LightBulbIcon,
  ArrowRightIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
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

const { athlete: athleteData, loading, error, fetchAthleteProfile } = useAthleteProfile(props.athleteId);
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
