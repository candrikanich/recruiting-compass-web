<template>
  <div
    class="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 px-4 py-12"
  >
    <div class="mx-auto max-w-xl">
      <!-- Step indicator -->
      <div class="mb-8 text-center">
        <h1 class="mb-2 text-3xl font-bold text-slate-900">
          Welcome to The Recruiting Compass
        </h1>
        <div class="mt-4 flex items-center justify-center gap-2">
          <div
            v-for="n in totalSteps"
            :key="n"
            :class="[
              'h-3 w-3 rounded-full transition-colors',
              n <= step ? 'bg-blue-500' : 'bg-slate-200',
            ]"
          />
          <span class="ml-3 text-sm font-medium text-slate-600">
            {{ step }} of {{ totalSteps }}
          </span>
        </div>
      </div>

      <div class="rounded-lg bg-white p-8 shadow-lg">
        <!-- Step 1: Player Details -->
        <div v-if="step === 1" data-testid="step-1" class="space-y-6">
          <div>
            <h2 class="mb-1 text-2xl font-bold text-slate-900">
              Tell us about your athlete
            </h2>
            <p class="text-sm text-slate-500">
              We'll pre-fill their profile so they can hit the ground running.
              Name is optional.
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label
                for="playerName"
                class="mb-1 block text-sm font-medium text-slate-700"
              >
                Player's name
              </label>
              <input
                id="playerName"
                v-model="playerName"
                data-testid="player-name"
                type="text"
                autocomplete="name"
                placeholder="First Last"
                class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>

            <!-- Player DOB — required for COPPA age gate -->
            <div>
              <label
                for="playerDob"
                class="mb-1 block text-sm font-medium text-slate-700"
              >
                Player's date of birth <span class="text-red-600">*</span>
              </label>
              <input
                id="playerDob"
                v-model="playerDob"
                data-testid="player-dob"
                type="date"
                :max="today"
                class="w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                :class="playerTooYoung ? 'border-red-400' : 'border-slate-300'"
              />
              <p class="mt-1 text-xs text-slate-500">
                Recruiting Compass is for ages 13 and up. By entering a date of
                birth, you confirm the player is 13 or older.
              </p>
              <p
                v-if="playerTooYoung"
                data-testid="age-error"
                class="mt-1 text-sm text-red-600"
              >
                Your player must be 13 or older to use Recruiting Compass.
                Players under 13 cannot create an account.
              </p>
            </div>

            <div>
              <label
                for="graduationYear"
                class="mb-1 block text-sm font-medium text-slate-700"
              >
                Graduation year <span class="text-red-600">*</span>
              </label>
              <select
                id="graduationYear"
                v-model="graduationYear"
                data-testid="graduation-year"
                class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select graduation year</option>
                <option
                  v-for="year in graduationYears"
                  :key="year"
                  :value="String(year)"
                >
                  {{ year }}
                </option>
              </select>
            </div>

            <div>
              <label
                for="sport"
                class="mb-1 block text-sm font-medium text-slate-700"
              >
                Primary sport <span class="text-red-600">*</span>
              </label>
              <select
                id="sport"
                v-model="sport"
                data-testid="sport"
                class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select sport</option>
                <option v-for="s in commonSports" :key="s" :value="s">
                  {{ s }}
                </option>
              </select>
            </div>
          </div>

          <div class="pt-2">
            <button
              data-testid="next-button"
              type="button"
              :disabled="!playerDob || playerTooYoung || !sport || !graduationYear"
              class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="savePlayerDetails"
            >
              Next
            </button>
          </div>
        </div>

        <!-- Step 2: Schools to explore -->
        <div v-if="step === 2" data-testid="step-2" class="space-y-6">
          <div>
            <h2 class="mb-1 text-2xl font-bold text-slate-900">
              Schools to explore
            </h2>
            <p class="text-sm text-slate-500">
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

          <button
            data-testid="go-to-dashboard"
            type="button"
            class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            @click="goToDashboard"
          >
            Go to your dashboard →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useFamilyCode } from "~/composables/useFamilyCode";
import { useSchools } from "~/composables/useSchools";
import { useSchoolRecommendations } from "~/composables/useSchoolRecommendations";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import { getGraduationYearOptions } from "~/utils/graduationYears";
import { createClientLogger } from "~/utils/logger";
import { recommendationToSchoolDraft } from "~/utils/schoolRecommendations";
import type { School } from "~/types";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";

const logger = createClientLogger("ParentOnboarding");

definePageMeta({ layout: "default", middleware: "auth" });

const step = ref(1);
const totalSteps = 2;

// Step 1 — Player details
const playerName = ref("");
const playerDob = ref("");
const graduationYear = ref("");
const sport = ref("");

const today = new Date().toISOString().split("T")[0];

const playerTooYoung = computed(() => {
  if (!playerDob.value) return false;
  const dob = new Date(playerDob.value);
  const age =
    new Date().getFullYear() -
    dob.getFullYear() -
    (new Date() <
    new Date(new Date().getFullYear(), dob.getMonth(), dob.getDate())
      ? 1
      : 0);
  return age < 13;
});

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

const graduationYears = computed(() => getGraduationYearOptions());

// Step 2 — Schools to explore
const { $fetchAuth } = useAuthFetch();
const activeFamilyCtx = inject<UseActiveFamilyReturn>("activeFamily");
const { fetchMyCode, myFamilyCode, createFamily } = useFamilyCode();
const { createSchool } = useSchools();
const {
  recommendations,
  loading: recommendationsLoading,
  error: recommendationsError,
  fetchRecommendations,
  dismissRecommendation,
  removeRecommendation,
} = useSchoolRecommendations();
const addingRecommendationKey = ref<string | null>(null);
const recommendationActionError = ref<string | null>(null);

onMounted(async () => {
  await fetchMyCode();
  if (!myFamilyCode.value) {
    await createFamily();
    // Refresh the app-level family context so pages loaded after onboarding
    // (e.g. /schools/new) have a valid activeFamilyId immediately.
    await activeFamilyCtx?.refetchFamilies();
  }
});

async function savePlayerDetails() {
  await $fetchAuth("/api/family/player-details", {
    method: "POST",
    body: {
      playerName: playerName.value,
      playerDob: playerDob.value,
      graduationYear: graduationYear.value,
      sport: sport.value,
    },
  });
  step.value = 2;
  void fetchRecommendations();
}

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

function goToDashboard() {
  const { $posthog } = useNuxtApp();
  $posthog?.capture("onboarding_v2_complete");
  navigateTo("/dashboard");
}
</script>
