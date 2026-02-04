<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12"
  >
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-900 mb-2">
          Welcome to The Recruiting Compass
        </h1>
        <p class="text-slate-600 mb-6">
          Let's get you set up in just a few steps
        </p>

        <!-- Progress Indicator -->
        <div class="flex items-center justify-between mb-8">
          <div class="flex-1">
            <div class="w-full bg-slate-200 rounded-full h-2">
              <div
                :style="{ width: `${progressPercentage}%` }"
                class="bg-blue-500 h-2 rounded-full transition-all duration-300"
              ></div>
            </div>
          </div>
          <span class="ml-4 text-sm font-medium text-slate-700"
            >{{ currentStep }}/5</span
          >
        </div>
      </div>

      <!-- Screen Container -->
      <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
        <!-- Screen 1: Welcome -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Welcome!</h2>
            <p class="text-slate-600 mb-6">
              This onboarding will help us understand your recruiting goals and
              preferences. It should take about 5 minutes.
            </p>
          </div>
        </div>

        <!-- Screen 2: Basic Info -->
        <div v-if="currentStep === 2" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-4">
            Basic Information
          </h2>

          <!-- Graduation Year -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Expected Graduation Year *
            </label>
            <select
              v-model="onboardingData.graduation_year"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select graduation year</option>
              <option v-for="year in graduationYears" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
          </div>

          <!-- Primary Sport -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Primary Sport *
            </label>
            <select
              v-model="onboardingData.primary_sport"
              @change="onSportChange"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select your sport</option>
              <option v-for="sport in commonSports" :key="sport" :value="sport">
                {{ sport }}
              </option>
            </select>
          </div>

          <!-- Position -->
          <div v-if="onboardingData.primary_sport">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Primary Position *
            </label>
            <select
              v-model="onboardingData.primary_position"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select position</option>
              <option v-for="pos in positions" :key="pos" :value="pos">
                {{ pos }}
              </option>
            </select>
          </div>
        </div>

        <!-- Screen 3: Location (placeholder) -->
        <div v-if="currentStep === 3" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-4">Your Location</h2>
          <p class="text-slate-600">
            Tell us your zip code so we can find nearby schools.
          </p>
        </div>

        <!-- Screen 4: Academic Info (placeholder) -->
        <div v-if="currentStep === 4" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-4">Academic Info</h2>
          <p class="text-slate-600">
            Share your GPA and test scores (optional) for better
            recommendations.
          </p>
        </div>

        <!-- Screen 5: Complete (placeholder) -->
        <div v-if="currentStep === 5" class="space-y-6">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">
              You're All Set!
            </h2>
            <p class="text-slate-600 mb-6">
              Your profile is ready. Would you like to invite a parent?
            </p>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="text-center py-8">
          <div class="inline-block">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
            ></div>
          </div>
          <p class="text-slate-600 mt-4">Saving your progress...</p>
        </div>

        <!-- Error message -->
        <div
          v-if="error"
          class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
        >
          <p class="text-red-800">{{ error }}</p>
          <button
            @click="clearError"
            class="text-sm text-red-600 hover:text-red-700 mt-2"
          >
            Dismiss
          </button>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex gap-4 justify-between">
        <button
          @click="previousScreen"
          :disabled="currentStep === 1 || loading"
          class="px-6 py-3 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>

        <div class="flex gap-4">
          <button
            v-if="currentStep < 5"
            @click="skipStep"
            class="px-6 py-3 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            Skip
          </button>
          <button
            @click="nextScreen"
            :disabled="loading"
            class="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{
              currentStep === 5
                ? "Complete Onboarding"
                : currentStep === 4
                  ? "Review"
                  : "Next"
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useOnboarding } from "~/composables/useOnboarding";

definePageMeta({ layout: "default" });

const { saveOnboardingStep, completeOnboarding, getOnboardingProgress } =
  useOnboarding();

const currentStep = ref(1);
const onboardingData = ref<Record<string, unknown>>({});
const loading = ref(false);
const error = ref<string | null>(null);

const totalSteps = 5;

// Common high school sports and their positions
const commonSports = [
  "Baseball",
  "Basketball",
  "Football",
  "Soccer",
  "Volleyball",
  "Softball",
  "Track & Field",
  "Swimming",
  "Cross Country",
  "Tennis",
  "Golf",
  "Lacrosse",
  "Field Hockey",
  "Ice Hockey",
  "Wrestling",
  "Rowing",
  "Water Polo",
];

const sportPositions: Record<string, string[]> = {
  Baseball: [
    "Pitcher",
    "Catcher",
    "Infielder",
    "Outfielder",
    "Designated Hitter",
  ],
  Basketball: [
    "Point Guard",
    "Shooting Guard",
    "Small Forward",
    "Power Forward",
    "Center",
  ],
  Football: [
    "Quarterback",
    "Running Back",
    "Wide Receiver",
    "Tight End",
    "Offensive Line",
    "Linebacker",
    "Defensive Back",
    "Defensive Line",
  ],
  Soccer: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  Volleyball: [
    "Outside Hitter",
    "Middle Blocker",
    "Setter",
    "Libero",
    "Opposite Hitter",
  ],
  Softball: [
    "Pitcher",
    "Catcher",
    "Infielder",
    "Outfielder",
    "Designated Hitter",
  ],
  "Track & Field": ["Sprinter", "Distance Runner", "Jumper", "Thrower"],
  Swimming: [
    "Freestyle",
    "Backstroke",
    "Breaststroke",
    "Butterfly",
    "Individual Medley",
  ],
  "Cross Country": ["Runner"],
  Tennis: ["Singles", "Doubles"],
  Golf: ["Golfer"],
  Lacrosse: ["Attackman", "Midfielder", "Defenseman", "Goalie"],
  "Field Hockey": ["Forward", "Midfielder", "Defender", "Goalkeeper"],
  "Ice Hockey": ["Forward", "Defenseman", "Goalie"],
  Wrestling: ["Wrestler"],
  Rowing: ["Rower"],
  "Water Polo": ["Field Player", "Goalkeeper"],
};

const positions = computed(() => {
  const sport = onboardingData.value.primary_sport as string;
  return sport && sportPositions[sport] ? sportPositions[sport] : [];
});

const graduationYears = computed(() => {
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 12; i++) {
    years.push(currentYear + i);
  }
  return years;
});

const progressPercentage = computed(() => {
  return (currentStep.value / totalSteps) * 100;
});

const onSportChange = () => {
  // Reset position when sport changes
  onboardingData.value.primary_position = "";
};

const clearError = () => {
  error.value = null;
};

const nextScreen = async () => {
  if (currentStep.value === totalSteps) {
    // Complete onboarding
    loading.value = true;
    try {
      // completeOnboarding expects assessment object
      const assessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };
      await completeOnboarding(assessment);
      // Redirect to dashboard or family invite screen
      await navigateTo("/dashboard");
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to complete onboarding";
    } finally {
      loading.value = false;
    }
  } else {
    // Save current step and move to next
    loading.value = true;
    try {
      await saveOnboardingStep(currentStep.value, onboardingData.value);
      currentStep.value++;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to save progress";
    } finally {
      loading.value = false;
    }
  }
};

const previousScreen = async () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const skipStep = async () => {
  loading.value = true;
  try {
    await saveOnboardingStep(currentStep.value, onboardingData.value);
    currentStep.value++;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to save progress";
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  // Restore progress if available
  try {
    const progress = await getOnboardingProgress();
    // Progress is a percentage, convert to step
    const step = Math.ceil((progress / 100) * totalSteps) || 1;
    currentStep.value = Math.min(step, totalSteps);
  } catch (err) {
    console.error("Failed to restore progress:", err);
  }
});
</script>
