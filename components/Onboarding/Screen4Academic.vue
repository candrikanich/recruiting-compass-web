<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  "next-screen": [
    data: {
      gpa?: number;
      satScore?: number;
      actScore?: number;
    },
  ];
}>();

const gpa = ref<string>("");
const satScore = ref<string>("");
const actScore = ref<string>("");
const error = ref<string | null>(null);

const validateGPA = (value: number): boolean => {
  return value >= 0.0 && value <= 5.0;
};

const validateTestScore = (value: number): boolean => {
  return value >= 0 && value <= 1600;
};

const handleSubmit = () => {
  error.value = null;

  if (gpa.value && !validateGPA(parseFloat(gpa.value))) {
    error.value = "GPA must be between 0.0 and 5.0";
    return;
  }

  if (satScore.value && !validateTestScore(parseFloat(satScore.value))) {
    error.value = "SAT score must be between 0 and 1600";
    return;
  }

  const actValue = parseInt(actScore.value);
  if (actScore.value && (actValue < 0 || actValue > 36)) {
    error.value = "ACT score must be between 0 and 36";
    return;
  }

  const data = {
    gpa: gpa.value ? parseFloat(gpa.value) : undefined,
    satScore: satScore.value ? parseFloat(satScore.value) : undefined,
    actScore: actScore.value ? parseInt(actScore.value) : undefined,
  };

  emit("next-screen", data);
};

const handleSkip = () => {
  emit("next-screen", {});
};
</script>

<template>
  <div class="flex flex-col min-h-screen bg-white px-4 py-8">
    <div class="max-w-2xl mx-auto w-full space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Academic Information</h2>
        <p class="text-slate-600 mt-2">
          Help coaches understand your academic profile
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- GPA -->
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">
            GPA (0.0 - 5.0)
          </label>
          <input
            v-model="gpa"
            type="number"
            step="0.01"
            min="0"
            max="5"
            placeholder="3.5"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- SAT Score -->
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">
            SAT Score (Optional)
          </label>
          <input
            v-model="satScore"
            type="number"
            min="0"
            max="1600"
            placeholder="1400"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-sm text-slate-500 mt-1">Score out of 1600</p>
        </div>

        <!-- ACT Score -->
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">
            ACT Score (Optional)
          </label>
          <input
            v-model="actScore"
            type="number"
            min="0"
            max="36"
            placeholder="33"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-sm text-slate-500 mt-1">Score out of 36</p>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p class="text-red-700 text-sm">{{ error }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-6">
          <button
            type="button"
            class="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            class="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            @click="handleSkip"
          >
            I'll add this later
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            @click="handleSubmit"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
