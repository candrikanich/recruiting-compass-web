<script setup lang="ts">
import { ref, computed } from "vue";
import { validatePlayerAge } from "~/utils/ageVerification";
import {
  getSportsList,
  getPositionsBySport,
  sportHasPositionList,
} from "~/utils/sportsPositionLookup";
import type { Sport } from "~/types/onboarding";

const emit = defineEmits<{
  "next-screen": [
    data: {
      graduationYear: number;
      primarySport: string;
      primaryPosition?: string;
      secondarySport?: string;
      secondaryPosition?: string;
    },
  ];
}>();

const currentYear = new Date().getFullYear();
const graduationYears = computed(() => {
  const years = [];
  for (let i = currentYear; i <= currentYear + 4; i++) {
    years.push(i);
  }
  return years;
});

const sports = ref<Sport[]>(getSportsList());

const formData = ref({
  graduationYear: "",
  primarySport: "",
  primaryPosition: "",
  primaryPositionCustom: "",
  secondarySport: "",
  secondaryPosition: "",
  secondaryPositionCustom: "",
});

const ageError = ref<string | null>(null);
const validationError = ref<string | null>(null);

const primarySportPositions = computed(() => {
  if (!formData.value.primarySport) return [];
  return getPositionsBySport(formData.value.primarySport);
});

const secondarySportPositions = computed(() => {
  if (!formData.value.secondarySport) return [];
  return getPositionsBySport(formData.value.secondarySport);
});

const primarySportHasPositions = computed(() => {
  if (!formData.value.primarySport) return false;
  return sportHasPositionList(formData.value.primarySport);
});

const secondarySportHasPositions = computed(() => {
  if (!formData.value.secondarySport) return false;
  return sportHasPositionList(formData.value.secondarySport);
});

const handleGraduationYearChange = () => {
  if (!formData.value.graduationYear) {
    ageError.value = null;
    return;
  }

  const yearNum = parseInt(formData.value.graduationYear);
  const validation = validatePlayerAge(yearNum);
  ageError.value = validation.error || null;
};

const handleSubmit = () => {
  validationError.value = null;

  if (!formData.value.graduationYear) {
    validationError.value = "Graduation year is required";
    return;
  }

  if (!formData.value.primarySport) {
    validationError.value = "Primary sport is required";
    return;
  }

  if (primarySportHasPositions.value && !formData.value.primaryPosition) {
    validationError.value = "Primary position is required";
    return;
  }

  if (
    primarySportHasPositions.value === false &&
    !formData.value.primaryPositionCustom
  ) {
    validationError.value = "Primary position is required";
    return;
  }

  if (ageError.value) {
    validationError.value = ageError.value;
    return;
  }

  const data = {
    graduationYear: parseInt(formData.value.graduationYear),
    primarySport: formData.value.primarySport,
    primaryPosition: primarySportHasPositions.value
      ? formData.value.primaryPosition
      : formData.value.primaryPositionCustom,
    secondarySport: formData.value.secondarySport || undefined,
    secondaryPosition:
      secondarySportHasPositions.value && formData.value.secondaryPosition
        ? formData.value.secondaryPosition
        : formData.value.secondaryPositionCustom || undefined,
  };

  emit("next-screen", data);
};
</script>

<template>
  <div class="flex flex-col min-h-screen bg-white px-4 py-8">
    <div class="max-w-2xl mx-auto w-full space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Basic Information</h2>
        <p class="text-slate-600 mt-2">Tell us about you</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Graduation Year -->
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">
            Graduation Year <span class="text-red-500">*</span>
          </label>
          <select
            v-model="formData.graduationYear"
            @change="handleGraduationYearChange"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select your graduation year</option>
            <option v-for="year in graduationYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <!-- Age Error -->
        <div
          v-if="ageError"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p class="text-red-700 text-sm">{{ ageError }}</p>
        </div>

        <!-- Primary Sport -->
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">
            Primary Sport <span class="text-red-500">*</span>
          </label>
          <select
            v-model="formData.primarySport"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a sport</option>
            <option v-for="sport in sports" :key="sport.id" :value="sport.id">
              {{ sport.name }}
            </option>
          </select>
        </div>

        <!-- Primary Position -->
        <div v-if="formData.primarySport">
          <label class="block text-sm font-medium text-slate-900 mb-2">
            Position <span class="text-red-500">*</span>
          </label>
          <select
            v-if="primarySportHasPositions"
            v-model="formData.primaryPosition"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a position</option>
            <option
              v-for="position in primarySportPositions"
              :key="position.id"
              :value="position.id"
            >
              {{ position.name }}
            </option>
          </select>
          <input
            v-else
            v-model="formData.primaryPositionCustom"
            type="text"
            placeholder="Enter your position"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <!-- Secondary Sport -->
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">
            Secondary Sport (Optional)
          </label>
          <select
            v-model="formData.secondarySport"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a secondary sport</option>
            <option v-for="sport in sports" :key="sport.id" :value="sport.id">
              {{ sport.name }}
            </option>
          </select>
        </div>

        <!-- Secondary Position -->
        <div v-if="formData.secondarySport">
          <label class="block text-sm font-medium text-slate-900 mb-2">
            Secondary Position
          </label>
          <select
            v-if="secondarySportHasPositions"
            v-model="formData.secondaryPosition"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a position</option>
            <option
              v-for="position in secondarySportPositions"
              :key="position.id"
              :value="position.id"
            >
              {{ position.name }}
            </option>
          </select>
          <input
            v-else
            v-model="formData.secondaryPositionCustom"
            type="text"
            placeholder="Enter your position"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Validation Error -->
        <div
          v-if="validationError"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p class="text-red-700 text-sm">{{ validationError }}</p>
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
