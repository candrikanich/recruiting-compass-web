<template>
  <div
    class="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 px-4 py-12"
  >
    <div class="mx-auto max-w-2xl">
      <!-- Header -->
      <div class="mb-8 text-center">
        <h1 class="mb-2 text-3xl font-bold text-slate-900">
          Welcome to The Recruiting Compass
        </h1>
        <p class="mb-6 text-slate-600">
          Let's get you set up in just a few steps
        </p>

        <!-- Progress Indicator -->
        <div class="mb-8 flex items-center justify-between">
          <div class="flex-1">
            <div class="h-2 w-full rounded-full bg-slate-200">
              <div
                :style="{ width: `${progressPercentage}%` }"
                class="h-2 rounded-full bg-blue-500 transition-all duration-300"
              ></div>
            </div>
          </div>
          <span class="ml-4 text-sm font-medium text-slate-700"
            >{{ currentStep }}/5</span
          >
        </div>
      </div>

      <!-- Screen Container -->
      <div
        ref="stepContainer"
        role="region"
        tabindex="-1"
        :aria-label="`Step ${currentStep} of ${totalSteps}`"
        :aria-busy="loading"
        class="mb-8 rounded-lg bg-white p-8 shadow-lg focus:outline-none"
      >
        <!-- Screen 1: Welcome -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div class="text-center">
            <h2 class="mb-4 text-2xl font-bold text-slate-900">Welcome!</h2>
            <p class="mb-6 text-slate-600">
              This onboarding will help us understand your recruiting goals and
              preferences. It should take about 5 minutes.
            </p>
          </div>
        </div>

        <!-- Screen 2: Basic Info -->
        <div v-if="currentStep === 2" class="space-y-6">
          <h2 class="mb-4 text-2xl font-bold text-slate-900">
            Basic Information
          </h2>

          <!-- Graduation Year -->
          <div>
            <label
              for="onboarding-graduation-year"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Expected Graduation Year *
            </label>
            <select
              id="onboarding-graduation-year"
              v-model="onboardingData.graduation_year"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
            <label
              for="onboarding-primary-sport"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Primary Sport *
            </label>
            <select
              id="onboarding-primary-sport"
              v-model="onboardingData.primary_sport"
              @change="onSportChange"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select your sport</option>
              <option v-for="sport in commonSports" :key="sport" :value="sport">
                {{ sport }}
              </option>
            </select>
            <p v-if="sportError" class="mt-1 text-sm text-red-600">
              {{ sportError }}
            </p>
          </div>

          <!-- Gender -->
          <div>
            <label
              for="onboarding-gender"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Gender (Optional)
            </label>
            <select
              id="onboarding-gender"
              v-model="onboardingData.gender"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option :value="undefined">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <!-- Position -->
          <div v-if="onboardingData.primary_sport">
            <label
              for="onboarding-primary-position"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Primary Position *
            </label>
            <select
              id="onboarding-primary-position"
              v-model="onboardingData.primary_position"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
          <h2 class="mb-4 text-2xl font-bold text-slate-900">Your Location</h2>
          <p class="mb-4 text-slate-600">
            Tell us your zip code so we can find nearby schools.
          </p>

          <!-- Zip Code -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
              Zip Code *
            </label>
            <input
              v-model="onboardingData.zip_code"
              type="text"
              autocomplete="postal-code"
              placeholder="Enter your 5-digit zip code"
              maxlength="5"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              @keypress="restrictToNumbers"
              required
            />
            <p v-if="zipCodeError" class="mt-1 text-sm text-red-600">
              {{ zipCodeError }}
            </p>
          </div>
        </div>

        <!-- Screen 4: Academic Info -->
        <div v-if="currentStep === 4" class="space-y-6">
          <h2 class="mb-4 text-2xl font-bold text-slate-900">Academic Info</h2>
          <p class="mb-4 text-slate-600">
            Share your GPA and test scores (optional) for better
            recommendations.
          </p>

          <!-- GPA -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
              GPA (Optional)
            </label>
            <input
              v-model.number="onboardingData.gpa"
              type="number"
              autocomplete="off"
              step="0.01"
              min="0"
              max="4.0"
              placeholder="e.g., 3.8"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <p class="mt-1 text-xs text-slate-500">Scale of 0.0 - 4.0</p>
          </div>

          <!-- SAT Score -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
              SAT Score (Optional)
            </label>
            <input
              v-model.number="onboardingData.sat_score"
              type="number"
              autocomplete="off"
              min="400"
              max="1600"
              placeholder="e.g., 1500"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <p class="mt-1 text-xs text-slate-500">Score between 400-1600</p>
          </div>

          <!-- ACT Score -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
              ACT Score (Optional)
            </label>
            <input
              v-model.number="onboardingData.act_score"
              type="number"
              autocomplete="off"
              min="1"
              max="36"
              placeholder="e.g., 35"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <p class="mt-1 text-xs text-slate-500">Score between 1-36</p>
          </div>
        </div>

        <!-- Screen 5: Invite Parent -->
        <div
          v-if="currentStep === 5"
          class="space-y-6"
          data-testid="step-5-invite"
        >
          <div class="mb-4 text-center">
            <h2 class="mb-2 text-2xl font-bold text-slate-900">
              Invite a parent
            </h2>
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
              autocomplete="email"
              placeholder="parent@example.com"
              class="w-full rounded-lg border border-slate-200 px-4 py-3 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <button
            data-testid="send-parent-invite-button"
            :disabled="!parentInviteEmail || inviteLoading"
            class="w-full rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            @click="sendParentInvite"
          >
            {{ inviteLoading ? "Sending..." : "Send invite" }}
          </button>

          <div class="mt-6 border-t border-slate-200 pt-4">
            <p class="mb-3 text-sm text-slate-500">Or share your family code</p>
            <div
              class="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3"
            >
              <span
                class="flex-1 font-mono font-semibold tracking-widest text-slate-900"
              >
                {{ myFamilyCode ?? "..." }}
              </span>
              <button
                v-if="myFamilyCode"
                type="button"
                class="text-slate-400 transition-colors hover:text-slate-700"
                :aria-label="codeCopied ? 'Code copied' : 'Copy family code'"
                :title="codeCopied ? 'Copied!' : 'Copy code'"
                @click="copyCode"
              >
                <svg
                  v-if="!codeCopied"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  class="h-5 w-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading state -->
        <div
          v-if="loading"
          role="status"
          aria-live="polite"
          class="py-8 text-center"
        >
          <div class="inline-block">
            <div
              aria-hidden="true"
              class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"
            ></div>
          </div>
          <p class="mt-4 text-slate-600">Saving your progress...</p>
        </div>

        <!-- Error message -->
        <div
          v-if="error"
          role="alert"
          class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p class="text-red-800">{{ error }}</p>
          <button
            @click="clearError"
            class="mt-2 text-sm text-red-600 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex justify-between gap-4">
        <button
          @click="previousScreen"
          :disabled="currentStep === 1 || loading"
          class="rounded-lg bg-slate-200 px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>

        <div class="flex gap-4">
          <button
            v-if="currentStep < 5 && currentStep !== 2"
            @click="skipStep"
            class="rounded-lg bg-slate-100 px-6 py-3 font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            Skip
          </button>
          <button
            @click="nextScreen"
            :disabled="loading"
            class="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useOnboarding } from "~/composables/useOnboarding";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useFamilyCode } from "~/composables/useFamilyCode";
import { useFamilyInvite } from "~/composables/useFamilyInvite";
import { useAppToast } from "~/composables/useAppToast";
import { createClientLogger } from "~/utils/logger";
import { getCanonicalPositions } from "~/utils/positions/canonical";
import { getGraduationYearOptions } from "~/utils/graduationYears";
import type { PlayerDetails } from "~/types/models";

const logger = createClientLogger("Onboarding");

definePageMeta({ layout: "default" });

const { saveOnboardingStep, completeOnboarding, getOnboardingProgress } =
  useOnboarding();
const {
  setHomeLocation,
  setPlayerDetails,
  loadAllPreferences,
  getPlayerDetails,
  getHomeLocation,
} = usePreferenceManager();
const { myFamilyCode, fetchMyCode, copyCodeToClipboard } = useFamilyCode();
const { sendInvite, loading: inviteLoading } = useFamilyInvite();
const { showToast } = useAppToast();

const codeCopied = ref(false);

async function copyCode() {
  if (!myFamilyCode.value) return;
  await copyCodeToClipboard(myFamilyCode.value);
  codeCopied.value = true;
  setTimeout(() => {
    codeCopied.value = false;
  }, 2000);
}

const currentStep = ref(1);
const stepContainer = ref<HTMLElement | null>(null);

// Move focus to the step region on advance so keyboard/screen-reader users
// land on the new step and hear its "Step N of M" label announced.
watch(currentStep, async () => {
  await nextTick();
  stepContainer.value?.focus();
});

const onboardingData = ref<Record<string, unknown>>({});
const loading = ref(false);
const error = ref<string | null>(null);
const zipCodeError = ref<string | null>(null);
const sportError = ref<string | null>(null);
const parentInviteEmail = ref("");

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

const positions = computed(() =>
  getCanonicalPositions(onboardingData.value.primary_sport as string),
);

const graduationYears = computed(() => getGraduationYearOptions());

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

// Primary sport is required as of Phase 2 (empty string counts as unset).
const hasSport = (): boolean => {
  const sport = onboardingData.value.primary_sport;
  return typeof sport === "string" && sport.trim() !== "";
};

const validateStep = (): boolean => {
  zipCodeError.value = null;
  sportError.value = null;

  // Validate step 2 (basic info) — primary sport is required
  if (currentStep.value === 2 && !hasSport()) {
    sportError.value = "Primary sport is required";
    return false;
  }

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
    // Final guard: step-jumping must not let onboarding complete with no sport.
    if (!hasSport()) {
      sportError.value = "Primary sport is required";
      currentStep.value = 2;
      return;
    }
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
        // Seed the ordered positions[] from the onboarding pick so the array
        // (source of truth for coach-facing output) and primary_position agree
        // from account creation — prevents the two stores drifting apart.
        const onboardingPosition = onboardingData.value
          .primary_position as string;
        await setPlayerDetails({
          graduation_year: onboardingData.value.graduation_year as number,
          primary_sport: onboardingData.value.primary_sport as string,
          primary_position: onboardingPosition,
          positions: onboardingPosition ? [onboardingPosition] : [],
          gender: onboardingData.value.gender as PlayerDetails["gender"],
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
  // Skip must never bypass a required step (e.g. primary sport on step 2).
  if (!validateStep()) {
    return;
  }
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
  // Final guard: don't complete onboarding without a primary sport.
  if (!hasSport()) {
    sportError.value = "Primary sport is required";
    currentStep.value = 2;
    return;
  }
  loading.value = true;
  try {
    await sendInvite({ email: parentInviteEmail.value, role: "parent" });
    const assessment = {
      hasHighlightVideo: false,
      hasContactedCoaches: false,
      hasTargetSchools: false,
      hasRegisteredEligibility: false,
      hasTakenTestScores: false,
    };
    await completeOnboarding(assessment);
    showToast("Invite sent! Taking you to your dashboard.", "success");
    await navigateTo("/dashboard");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to send invite";
  } finally {
    loading.value = false;
  }
};

const route = useRoute();

// Seed onboarding fields from the athlete's canonical profile (populated by a
// parent's onboarding via the invite-accept hydration). DB-backed, so it works
// cross-platform (parent on web, player on iOS). Fill-if-empty: anything the
// player has already entered this session (or via query param) is left untouched.
const prefillFromCanonical = () => {
  const seedIfEmpty = (key: string, value: unknown) => {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      (onboardingData.value[key] === undefined ||
        onboardingData.value[key] === null ||
        onboardingData.value[key] === "")
    ) {
      onboardingData.value[key] = value;
    }
  };

  const details = getPlayerDetails();
  if (details) {
    seedIfEmpty("graduation_year", details.graduation_year);
    seedIfEmpty("primary_sport", details.primary_sport);
    seedIfEmpty("primary_position", details.primary_position);
    seedIfEmpty("gender", details.gender);
    seedIfEmpty("gpa", details.gpa);
    seedIfEmpty("sat_score", details.sat_score);
    seedIfEmpty("act_score", details.act_score);
  }

  const location = getHomeLocation.value;
  if (location?.zip) {
    seedIfEmpty("zip_code", location.zip);
  }
};

onMounted(async () => {
  // Pre-populate from parent-entered player details passed as query params
  if (route.query.graduationYear) {
    onboardingData.value.graduation_year = Number(route.query.graduationYear);
  }
  if (route.query.sport) {
    onboardingData.value.primary_sport = route.query.sport as string;
  }
  if (route.query.position) {
    onboardingData.value.primary_position = route.query.position as string;
  }

  try {
    // Load preferences so partial saves (e.g. step 2 then step 4) merge correctly
    await loadAllPreferences();
    prefillFromCanonical();
    const progress = await getOnboardingProgress();
    const step = Math.ceil((progress / 100) * totalSteps) || 1;
    currentStep.value = Math.min(step, totalSteps);
    if (currentStep.value === totalSteps) {
      await fetchMyCode();
    }
  } catch (err) {
    logger.error("Failed to restore progress", err);
  }
});
</script>
