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

        <!-- Screen 3: Location -->
        <div v-if="currentStep === 3" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-4">Your Location</h2>
          <p class="text-slate-600 mb-4">
            Tell us your zip code so we can find nearby schools.
          </p>

          <!-- Zip Code -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Zip Code *
            </label>
            <input
              v-model="onboardingData.zip_code"
              type="text"
              placeholder="Enter your 5-digit zip code"
              maxlength="5"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keypress="restrictToNumbers"
              required
            />
            <p v-if="zipCodeError" class="text-red-600 text-sm mt-1">
              {{ zipCodeError }}
            </p>
          </div>
        </div>

        <!-- Screen 4: Academic Info -->
        <div v-if="currentStep === 4" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-4">Academic Info</h2>
          <p class="text-slate-600 mb-4">
            Share your GPA and test scores (optional) for better
            recommendations.
          </p>

          <!-- GPA -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              GPA (Optional)
            </label>
            <input
              v-model.number="onboardingData.gpa"
              type="number"
              step="0.01"
              min="0"
              max="4.0"
              placeholder="e.g., 3.8"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="text-slate-500 text-xs mt-1">Scale of 0.0 - 4.0</p>
          </div>

          <!-- SAT Score -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              SAT Score (Optional)
            </label>
            <input
              v-model.number="onboardingData.sat_score"
              type="number"
              min="400"
              max="1600"
              placeholder="e.g., 1500"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="text-slate-500 text-xs mt-1">Score between 400-1600</p>
          </div>

          <!-- ACT Score -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              ACT Score (Optional)
            </label>
            <input
              v-model.number="onboardingData.act_score"
              type="number"
              min="1"
              max="36"
              placeholder="e.g., 35"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="text-slate-500 text-xs mt-1">Score between 1-36</p>
          </div>
        </div>

        <!-- Screen 5: Invite Parent -->
        <div v-if="currentStep === 5" class="space-y-6" data-testid="step-5-invite">
          <div class="text-center mb-4">
            <h2 class="text-2xl font-bold text-slate-900 mb-2">Invite a parent</h2>
            <p class="text-slate-600">
              Add a parent so they can follow your recruiting journey with you.
            </p>
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-700">
              Parent's email address
            </label>
            <input
              v-model="parentInviteEmail"
              data-testid="parent-invite-email"
              type="email"
              placeholder="parent@example.com"
              class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            data-testid="send-parent-invite-button"
            :disabled="!parentInviteEmail || inviteLoading"
            class="w-full px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="sendParentInvite"
          >
            {{ inviteLoading ? 'Sending...' : 'Send invite' }}
          </button>

          <div class="mt-6 pt-4 border-t border-slate-200">
            <p class="text-sm text-slate-500 mb-3">Or share your family code</p>
            <div class="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
              <span class="font-mono font-semibold text-slate-900 tracking-widest">
                {{ myFamilyCode ?? '...' }}
              </span>
            </div>
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
                ? "I'll invite them later"
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
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useFamilyCode } from "~/composables/useFamilyCode";
import { useFamilyInvite } from "~/composables/useFamilyInvite";

definePageMeta({ layout: "default" });

const { saveOnboardingStep, completeOnboarding, getOnboardingProgress } =
  useOnboarding();
const { setHomeLocation, setPlayerDetails, loadAllPreferences } =
  usePreferenceManager();
const { myFamilyCode, fetchMyCode } = useFamilyCode();
const { sendInvite, loading: inviteLoading } = useFamilyInvite();

const currentStep = ref(1);
const onboardingData = ref<Record<string, unknown>>({});
const loading = ref(false);
const error = ref<string | null>(null);
const zipCodeError = ref<string | null>(null);
const parentInviteEmail = ref('');

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
  for (let i = 0; i < 5; i++) {
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

const restrictToNumbers = (event: KeyboardEvent) => {
  if (!/[0-9]/.test(event.key)) {
    event.preventDefault();
  }
};

const validateStep = (): boolean => {
  zipCodeError.value = null;

  // Validate step 3 (location)
  if (currentStep.value === 3) {
    const zipCode = onboardingData.value.zip_code as string;
    if (!zipCode) {
      zipCodeError.value = "Zip code is required";
      return false;
    }
    if (!/^\d{5}$/.test(zipCode)) {
      zipCodeError.value = "Please enter a valid 5-digit zip code";
      return false;
    }
  }

  return true;
};

const clearError = () => {
  error.value = null;
};

const nextScreen = async () => {
  // Validate current step before proceeding
  if (!validateStep()) {
    return;
  }

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
      // Step 2: Save graduation year, sport, and position to player details
      if (currentStep.value === 2) {
        await setPlayerDetails({
          graduation_year: onboardingData.value.graduation_year as number,
          primary_sport: onboardingData.value.primary_sport as string,
          primary_position: onboardingData.value.primary_position as string,
        });
      }

      // Step 3: Save zip code as home location
      if (currentStep.value === 3 && onboardingData.value.zip_code) {
        await setHomeLocation({
          zip: onboardingData.value.zip_code as string,
        });
      }

      // Step 4: Save academics to player details (merges with step 2 data)
      if (currentStep.value === 4) {
        await setPlayerDetails({
          gpa: onboardingData.value.gpa as number,
          sat_score: onboardingData.value.sat_score as number,
          act_score: onboardingData.value.act_score as number,
        });
      }

      await saveOnboardingStep(currentStep.value, onboardingData.value);
      currentStep.value++;
      if (currentStep.value === totalSteps) {
        fetchMyCode().catch(() => {});
      }
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

const sendParentInvite = async () => {
  if (!parentInviteEmail.value) return;
  await sendInvite({ email: parentInviteEmail.value, role: 'parent' });
  await navigateTo('/dashboard');
};

onMounted(async () => {
  try {
    // Load preferences so partial saves (e.g. step 2 then step 4) merge correctly
    await loadAllPreferences();
    const progress = await getOnboardingProgress();
    const step = Math.ceil((progress / 100) * totalSteps) || 1;
    currentStep.value = Math.min(step, totalSteps);
    if (currentStep.value === totalSteps) {
      await fetchMyCode();
    }
  } catch (err) {
    console.error("Failed to restore progress:", err);
  }
});
</script>
