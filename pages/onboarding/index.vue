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

        <!-- Screen 2: Basic Info (placeholder) -->
        <div v-if="currentStep === 2" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-4">
            Basic Information
          </h2>
          <p class="text-slate-600">
            Graduation year, primary sport, and position selection will be
            configured here.
          </p>
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

const progressPercentage = computed(() => {
  return (currentStep.value / totalSteps) * 100;
});

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
