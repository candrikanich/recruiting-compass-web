<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h3 class="text-lg font-semibold text-slate-900 mb-2">
        Coach Interest Level
      </h3>
      <p class="text-sm text-slate-600">
        Answer these questions to gauge the coach's level of interest based on
        their response.
      </p>
    </div>

    <!-- Questions -->
    <div class="space-y-4">
      <div
        v-for="(question, idx) in questions"
        :key="idx"
        class="flex items-start gap-3"
      >
        <input
          type="checkbox"
          :id="`calibration-q${idx}`"
          v-model="answers[idx]"
          @change="updateScore"
          class="w-5 h-5 mt-0.5 text-indigo-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
        />
        <label
          :for="`calibration-q${idx}`"
          class="text-sm text-slate-700 cursor-pointer flex-1"
        >
          {{ question }}
        </label>
      </div>
    </div>

    <!-- Result -->
    <div
      class="p-4 rounded-xl border-2"
      :class="[
        interestLevel === 'high' ? 'bg-green-50 border-green-200' : '',
        interestLevel === 'medium' ? 'bg-amber-50 border-amber-200' : '',
        interestLevel === 'low' ? 'bg-slate-50 border-slate-200' : '',
        interestLevel === 'not_set' ? 'bg-slate-50 border-slate-200' : '',
      ]"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          :class="[
            interestLevel === 'high' ? 'bg-green-200 text-green-700' : '',
            interestLevel === 'medium' ? 'bg-amber-200 text-amber-700' : '',
            interestLevel === 'low' ? 'bg-slate-200 text-slate-700' : '',
            interestLevel === 'not_set' ? 'bg-slate-200 text-slate-600' : '',
          ]"
        >
          <span v-if="interestLevel === 'high'" class="text-lg">🔥</span>
          <span v-else-if="interestLevel === 'medium'" class="text-lg">⚡</span>
          <span v-else-if="interestLevel === 'low'" class="text-lg">❄️</span>
          <span v-else class="text-lg">—</span>
        </div>
        <div class="flex-1">
          <p
            class="font-semibold text-sm"
            :class="[
              interestLevel === 'high' ? 'text-green-900' : '',
              interestLevel === 'medium' ? 'text-amber-900' : '',
              interestLevel === 'low' ? 'text-slate-900' : '',
              interestLevel === 'not_set' ? 'text-slate-600' : '',
            ]"
          >
            {{
              interestLevel === "high"
                ? "High Interest"
                : interestLevel === "medium"
                  ? "Medium Interest"
                  : interestLevel === "low"
                    ? "Low Interest"
                    : "Not Set"
            }}
          </p>
          <p
            class="text-xs"
            :class="[
              interestLevel === 'high' ? 'text-green-700' : '',
              interestLevel === 'medium' ? 'text-amber-700' : '',
              interestLevel === 'low' ? 'text-slate-600' : '',
              interestLevel === 'not_set' ? 'text-slate-500' : '',
            ]"
          >
            {{ getResultDescription() }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

export type InterestLevel = "high" | "medium" | "low" | "not_set";

interface Props {
  modelValue?: InterestLevel;
}

interface Emits {
  (e: "update:modelValue", value: InterestLevel): void;
}

defineProps<Props>();
defineEmits<Emits>();

const questions = [
  "Did they ask about your schedule or upcoming events?",
  "Did they mention visiting campus or suggest a visit?",
  "Did they ask about your academic interests or major?",
  "Did they provide their direct contact info (phone/email)?",
  "Did they mention roster needs at your position?",
  "Was this a personalized response (not a form letter)?",
];

const answers = ref<boolean[]>([false, false, false, false, false, false]);

const yesCount = computed(() => answers.value.filter((a) => a).length);

const interestLevel = computed<InterestLevel>(() => {
  if (yesCount.value === 0) return "not_set";
  if (yesCount.value <= 1) return "low";
  if (yesCount.value <= 3) return "medium";
  return "high";
});

const updateScore = () => {
  // Computed property watches answers and updates interestLevel automatically
  // Parent can access interestLevel directly via template
};

const getResultDescription = (): string => {
  if (yesCount.value === 0) {
    return "Answer questions to see coach interest level";
  }

  if (interestLevel.value === "high") {
    return "Coach showing strong signals of genuine interest. Follow up promptly.";
  }

  if (interestLevel.value === "medium") {
    return "Coach seems interested but check for personalization. Stay in touch regularly.";
  }

  return "Limited signals detected. Consider diversifying your target list.";
};

// Expose methods for testing
defineExpose({
  getResultDescription,
  yesCount,
  interestLevel,
  answers,
});
</script>
