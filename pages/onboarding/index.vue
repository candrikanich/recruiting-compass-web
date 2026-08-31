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
          Let's get you set up in just two steps
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
            >{{ currentStep }}/{{ totalSteps }}</span
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
        <!-- Screen 1: Tell us about you -->
        <div v-if="currentStep === 1" class="space-y-6">
          <h2 class="mb-4 text-2xl font-bold text-slate-900">
            Tell us about you
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
            <p v-if="graduationYearError" class="mt-1 text-sm text-red-600">
              {{ graduationYearError }}
            </p>
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

          <!-- Gender — only asked when it can't be derived from sport -->
          <div v-if="!genderIsAutoDerived">
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

          <!-- Zip Code -->
          <div>
            <label
              for="onboarding-zip-code"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Zip Code (Optional)
            </label>
            <input
              id="onboarding-zip-code"
              v-model="onboardingData.zip_code"
              type="text"
              autocomplete="postal-code"
              placeholder="Enter your 5-digit zip code"
              maxlength="5"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              @keypress="restrictToNumbers"
            />
            <p class="mt-1 text-xs text-slate-500">
              Helps us recommend schools near you.
            </p>
            <p v-if="zipCodeError" class="mt-1 text-sm text-red-600">
              {{ zipCodeError }}
            </p>
          </div>
        </div>

        <!-- Screen 2: Schools to explore -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="mb-2 text-center">
            <h2 class="mb-2 text-2xl font-bold text-slate-900">
              Schools to explore
            </h2>
            <p class="text-slate-600">
              Based on what you told us, here are a few schools to start with.
            </p>
          </div>

          <RecommendedSchools
            :items="recommendations"
            :loading="recommendationsLoading"
            :error="recommendationsError || recommendationActionError"
            :adding-key="addingRecommendationKey"
            @add="handleAddRecommendation"
            @dismiss="handleDismissRecommendation"
          />
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

        <button
          @click="nextScreen"
          :disabled="loading"
          class="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ currentStep === totalSteps ? "Go to your dashboard →" : "Next" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useOnboarding } from "~/composables/useOnboarding";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useSchools } from "~/composables/useSchools";
import { useSchoolRecommendations } from "~/composables/useSchoolRecommendations";
import { useNuxProgress } from "~/composables/useNuxProgress";
import { createClientLogger } from "~/utils/logger";
import { getGraduationYearOptions } from "~/utils/graduationYears";
import { recommendationToSchoolDraft } from "~/utils/schoolRecommendations";
import type { PlayerDetails } from "~/types/models";
import type { School } from "~/types";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";

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
const { createSchool } = useSchools();
const {
  recommendations,
  loading: recommendationsLoading,
  error: recommendationsError,
  fetchRecommendations,
  dismissRecommendation,
  removeRecommendation,
} = useSchoolRecommendations();
const { completeItem } = useNuxProgress();

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
const graduationYearError = ref<string | null>(null);
const addingRecommendationKey = ref<string | null>(null);
const recommendationActionError = ref<string | null>(null);

const totalSteps = 2;

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

// Sports whose gender isn't ambiguous — skip asking and derive it silently.
const SPORT_GENDER_MAP: Record<string, "male" | "female"> = {
  softball: "female",
  "field hockey": "female",
  baseball: "male",
  football: "male",
  wrestling: "male",
};

const genderIsAutoDerived = computed(() => {
  const sport = (onboardingData.value.primary_sport as string) || "";
  return sport.toLowerCase() in SPORT_GENDER_MAP;
});

const graduationYears = computed(() => getGraduationYearOptions());

const progressPercentage = computed(() => {
  return (currentStep.value / totalSteps) * 100;
});

const onSportChange = () => {
  const sport = ((onboardingData.value.primary_sport as string) || "").toLowerCase();
  const derivedGender = SPORT_GENDER_MAP[sport];
  if (derivedGender) {
    onboardingData.value.gender = derivedGender;
  }
};

const restrictToNumbers = (event: KeyboardEvent) => {
  if (!/[0-9]/.test(event.key)) {
    event.preventDefault();
  }
};

const hasSport = (): boolean => {
  const sport = onboardingData.value.primary_sport;
  return typeof sport === "string" && sport.trim() !== "";
};

const hasGraduationYear = (): boolean => {
  const year = onboardingData.value.graduation_year;
  return year !== undefined && year !== null && year !== "";
};

const validateStep1 = (): boolean => {
  zipCodeError.value = null;
  sportError.value = null;
  graduationYearError.value = null;

  let isValid = true;

  if (!hasSport()) {
    sportError.value = "Primary sport is required";
    isValid = false;
  }

  if (!hasGraduationYear()) {
    graduationYearError.value = "Graduation year is required";
    isValid = false;
  }

  // Zip is optional, but if entered it must be a valid 5-digit code.
  const zipCode = onboardingData.value.zip_code as string;
  if (zipCode && !/^\d{5}$/.test(zipCode)) {
    zipCodeError.value = "Please enter a valid 5-digit zip code";
    isValid = false;
  }

  return isValid;
};

const clearError = () => {
  error.value = null;
};

const saveStep1 = async () => {
  const onboardingGender = onboardingData.value.gender as
    | PlayerDetails["gender"]
    | undefined;
  await setPlayerDetails({
    graduation_year: onboardingData.value.graduation_year as number,
    primary_sport: onboardingData.value.primary_sport as string,
    ...(onboardingGender ? { gender: onboardingGender } : {}),
  });

  if (onboardingData.value.zip_code) {
    await setHomeLocation({ zip: onboardingData.value.zip_code as string });
  }

  await saveOnboardingStep(1, onboardingData.value);
  await completeItem("sport");

  const { $posthog } = useNuxtApp();
  $posthog?.capture("onboarding_v2_step1_complete");
};

const nextScreen = async () => {
  if (currentStep.value === 1) {
    if (!validateStep1()) {
      return;
    }
    loading.value = true;
    try {
      await saveStep1();
      currentStep.value = 2;
      void fetchRecommendations();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to save progress";
    } finally {
      loading.value = false;
    }
    return;
  }

  // Step 2: "Go to your dashboard"
  loading.value = true;
  try {
    const assessment = {
      hasHighlightVideo: false,
      hasContactedCoaches: false,
      hasTargetSchools: false,
      hasRegisteredEligibility: false,
      hasTakenTestScores: false,
    };
    await completeOnboarding(assessment);

    const { $posthog } = useNuxtApp();
    $posthog?.capture("onboarding_v2_complete");

    await navigateTo("/dashboard");
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to complete onboarding";
  } finally {
    loading.value = false;
  }
};

const previousScreen = async () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

async function handleAddRecommendation(school: SchoolRecommendation) {
  addingRecommendationKey.value = school.catalogKey;
  recommendationActionError.value = null;
  try {
    await createSchool(
      recommendationToSchoolDraft(school) as Omit<
        School,
        "id" | "created_at" | "updated_at"
      >,
    );
    removeRecommendation(school.catalogKey);

    const { $posthog } = useNuxtApp();
    $posthog?.capture("onboarding_v2_school_added");
  } catch (err) {
    logger.warn("Failed to add recommended school", err);
    recommendationActionError.value =
      err instanceof Error ? err.message : "Failed to add school";
  } finally {
    addingRecommendationKey.value = null;
  }
}

async function handleDismissRecommendation(school: SchoolRecommendation) {
  try {
    await dismissRecommendation(school.catalogKey);
  } catch {
    // dismissRecommendation already restores state and sets its own error.
  }
}

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
    seedIfEmpty("gender", details.gender);
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

  try {
    // Load preferences so a partial save from a previous session merges correctly
    await loadAllPreferences();
    prefillFromCanonical();
    // getOnboardingProgress reflects the last-*saved* step, not the step the
    // user should land on next — step 1 doesn't record a save until it's
    // done, so resuming after it must move to step 2, not redisplay step 1.
    const progress = await getOnboardingProgress();
    const step = Math.floor((progress / 100) * totalSteps) + 1;
    currentStep.value = Math.min(step, totalSteps);
    if (currentStep.value === totalSteps) {
      void fetchRecommendations();
    }
  } catch (err) {
    logger.error("Failed to restore progress", err);
  }
});
</script>
