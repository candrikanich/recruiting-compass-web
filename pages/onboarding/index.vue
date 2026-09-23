<template>
  <div class="relative min-h-screen overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <MultiSportFieldBackground />

    <div
      class="relative z-10 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-2xl">
        <!-- Header -->
        <div class="mb-8 text-center">
          <img
            src="~/assets/logos/recruiting-compass-stacked.svg"
            alt="The Recruiting Compass - Find your path, make your move"
            class="mx-auto w-80"
          />
          <h1 class="mt-6 mb-2 text-2xl font-bold text-white">
            Welcome to The Recruiting Compass
          </h1>
          <p class="mb-6 text-white/90">Let's get you set up</p>
          <p v-if="currentStep === 2" class="text-sm font-medium text-white/80">
            Step 2 of 2
          </p>
        </div>

        <!-- Screen Container -->
        <div
          v-if="currentStep === 1"
          ref="stepContainer"
          role="region"
          tabindex="-1"
          aria-label="Tell us about you"
          :aria-busy="loading"
          class="mb-8 rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xs focus:outline-none"
        >
          <div class="space-y-6">
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
                <option
                  v-for="year in graduationYears"
                  :key="year"
                  :value="year"
                >
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
                <option
                  v-for="sport in commonSports"
                  :key="sport"
                  :value="sport"
                >
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

        <!-- Navigation -->
        <div v-if="currentStep === 1" class="flex justify-end gap-4">
          <button
            @click="nextScreen"
            :disabled="loading"
            class="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go to your dashboard →
          </button>
        </div>

        <!-- Step 2: Schools to Explore -->
        <div
          v-else
          ref="stepTwoContainer"
          role="region"
          tabindex="-1"
          aria-label="Schools to explore"
          class="mb-8 rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xs focus:outline-none"
        >
          <RecommendedSchools
            :items="recommendations"
            :loading="recsLoading"
            :error="recsError"
            :adding-key="addingKey"
            :home-state="homeState"
            @add="handleAddSchool"
            @dismiss="handleDismissSchool"
          />

          <p v-if="actionError" role="alert" class="mt-4 text-sm text-red-600">
            {{ actionError }}
          </p>

          <div
            v-if="error"
            role="alert"
            class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <p class="text-red-800">{{ error }}</p>
            <button
              @click="clearError"
              class="mt-2 text-sm text-red-600 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              @click="finishOnboarding"
              :disabled="finishing"
              class="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useOnboarding } from "~/composables/useOnboarding";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useNuxProgress } from "~/composables/useNuxProgress";
import { useGraduationYearOptions } from "~/composables/useGraduationYearOptions";
import { useSchoolRecommendations } from "~/composables/useSchoolRecommendations";
import { useSchools } from "~/composables/useSchools";
import { recommendationToSchoolDraft } from "~/utils/schoolRecommendations";
import { createClientLogger } from "~/utils/logger";
// The bare <MultiSportFieldBackground /> tag silently resolves to nothing
// without this — Nuxt auto-imports components/Auth/*.vue under the
// Auth-prefixed tag; pages/signup.vue and pages/login.vue only work because
// they import it explicitly.
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";
import RecommendedSchools from "~/components/School/RecommendedSchools.vue";
import type { PlayerDetails } from "~/types/models";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";
import type { School } from "~/types/models";

const logger = createClientLogger("Onboarding");

definePageMeta({ layout: "public" });

const { saveOnboardingStep, completeOnboarding } = useOnboarding();
const {
  setHomeLocation,
  setPlayerDetails,
  loadAllPreferences,
  getPlayerDetails,
  getHomeLocation,
} = usePreferenceManager();
const { completeItem } = useNuxProgress();
const {
  recommendations,
  signals,
  loading: recsLoading,
  error: recsError,
  fetchRecommendations,
  dismissRecommendation,
  removeRecommendation,
} = useSchoolRecommendations();
const { createSchool } = useSchools();

const stepContainer = ref<HTMLElement | null>(null);
const stepTwoContainer = ref<HTMLElement | null>(null);

const currentStep = ref<1 | 2>(1);
const onboardingData = ref<Record<string, unknown>>({});
const loading = ref(false);
const error = ref<string | null>(null);
const zipCodeError = ref<string | null>(null);
const sportError = ref<string | null>(null);
const graduationYearError = ref<string | null>(null);
const addingKey = ref<string | null>(null);
const actionError = ref<string | null>(null);
const finishing = ref(false);

const homeState = computed(() => signals.value?.homeState ?? null);

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

const { graduationYears } = useGraduationYearOptions();

// The July 1 pivot can roll the just-graduated class out from under a form
// that's been open since before midnight — clear a now-invalid selection
// rather than let a stale value reach the (freshly re-validated) server.
watch(graduationYears, (years) => {
  const selected = onboardingData.value.graduation_year;
  if (selected !== undefined && !years.includes(selected as number)) {
    onboardingData.value.graduation_year = undefined;
  }
});

const onSportChange = () => {
  const sport = (
    (onboardingData.value.primary_sport as string) || ""
  ).toLowerCase();
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
  if (year === undefined || year === null || year === "") return false;
  // Membership, not just presence — a prefilled value (query param, or
  // canonical prefs from a parent's earlier onboarding) is never revalidated
  // against the current options list, only cleared reactively when
  // graduationYears itself changes. A stale out-of-range year must not pass
  // here just because it's non-empty.
  return graduationYears.value.includes(year as number);
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
    PlayerDetails["gender"] | undefined;
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

const completionAssessment = {
  hasHighlightVideo: false,
  hasContactedCoaches: false,
  hasTargetSchools: false,
  hasRegisteredEligibility: false,
  hasTakenTestScores: false,
};

const finishOnboarding = async () => {
  finishing.value = true;
  try {
    await completeOnboarding(
      completionAssessment,
      onboardingData.value.graduation_year as number | undefined,
    );

    const { $posthog } = useNuxtApp();
    $posthog?.capture("onboarding_v2_complete");

    await navigateTo("/dashboard");
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to complete onboarding";
  } finally {
    finishing.value = false;
  }
};

const nextScreen = async () => {
  if (!validateStep1()) {
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    await saveStep1();
    await fetchRecommendations();

    if (recsError.value) {
      // A failed fetch, not a genuine no-match — stay on step 1 so the
      // player can see the error and retry rather than silently skipping
      // school discovery.
      error.value = recsError.value;
      return;
    }

    if (recommendations.value.length > 0) {
      currentStep.value = 2;
      await nextTick();
      stepTwoContainer.value?.focus();
      return;
    }

    await finishOnboarding();
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to complete onboarding";
  } finally {
    loading.value = false;
  }
};

const handleAddSchool = async (school: SchoolRecommendation) => {
  addingKey.value = school.catalogKey;
  actionError.value = null;
  try {
    await createSchool(
      recommendationToSchoolDraft(school) as Omit<
        School,
        "id" | "created_at" | "updated_at"
      >,
    );
    removeRecommendation(school.catalogKey);
    await completeItem("first_school");
  } catch (err) {
    logger.warn("Failed to add recommended school", err);
    actionError.value = "Could not add that school.";
  } finally {
    addingKey.value = null;
  }
};

const handleDismissSchool = async (school: SchoolRecommendation) => {
  actionError.value = null;
  try {
    await dismissRecommendation(school.catalogKey);
  } catch (err) {
    logger.warn("Failed to dismiss school recommendation", err);
    actionError.value = "Could not dismiss that school.";
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
    seedIfEmpty("gender", details.gender);
  }

  const location = getHomeLocation.value;
  if (location?.zip) {
    seedIfEmpty("zip_code", location.zip);
  }
};

onMounted(async () => {
  const { $posthog } = useNuxtApp();
  $posthog?.capture("onboarding_v2_started");

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
  } catch (err) {
    logger.error("Failed to restore progress", err);
  }

  await nextTick();
  stepContainer.value?.focus();
});
</script>
