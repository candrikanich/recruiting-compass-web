<template>
  <div class="relative min-h-screen overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <MultiSportFieldBackground />

    <div
      class="relative z-10 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-xl">
        <!-- Header -->
        <div class="mb-8 text-center">
          <img
            src="~/assets/logos/recruiting-compass-stacked.svg"
            alt="The Recruiting Compass - Find your path, make your move"
            class="mx-auto w-80"
          />
        </div>

        <div
          class="rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xs"
        >
          <div class="mb-8 text-center">
            <h1 class="mb-2 text-2xl font-bold text-slate-900">
              Welcome to The Recruiting Compass
            </h1>
          </div>

          <div data-testid="step-1" class="space-y-6">
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
                  :class="
                    playerTooYoung ? 'border-red-400' : 'border-slate-300'
                  "
                />
                <p class="mt-1 text-xs text-slate-500">
                  Recruiting Compass is for ages 13 and up. By entering a date
                  of birth, you confirm the player is 13 or older.
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
              <p
                v-if="savePlayerDetailsError"
                data-testid="save-player-details-error"
                class="mb-2 text-sm text-red-600"
              >
                {{ savePlayerDetailsError }}
              </p>
              <button
                data-testid="next-button"
                type="button"
                :disabled="
                  !playerDob ||
                  playerTooYoung ||
                  !sport ||
                  !graduationYear ||
                  !familyReady
                "
                class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="savePlayerDetails"
              >
                Go to your dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useFamilyCode } from "~/composables/useFamilyCode";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import { getGraduationYearOptions } from "~/utils/graduationYears";
import { useOnboarding } from "~/composables/useOnboarding";
import { useNuxProgress } from "~/composables/useNuxProgress";
import { createClientLogger } from "~/utils/logger";
// The bare <MultiSportFieldBackground /> tag silently resolves to nothing
// without this — Nuxt auto-imports components/Auth/*.vue under the
// Auth-prefixed tag; pages/signup.vue and pages/login.vue only work because
// they import it explicitly.
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";

const logger = createClientLogger("ParentOnboarding");

definePageMeta({ layout: "public", middleware: "auth" });

// Player details
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

const { $fetchAuth } = useAuthFetch();
const activeFamilyCtx = inject<UseActiveFamilyReturn>("activeFamily");
const { fetchMyCode, myFamilyCode, createFamily } = useFamilyCode();
const { completeOnboarding } = useOnboarding();
const { completeItem } = useNuxProgress();
const savePlayerDetailsError = ref<string | null>(null);

// Family creation (below) runs async in the background — Next must stay
// disabled until it settles, or a fast-filling user can submit
// player-details before their family_members row exists server-side,
// which 403s (see issue #782).
const familyReady = ref(false);

onMounted(async () => {
  try {
    await fetchMyCode();
    if (!myFamilyCode.value) {
      await createFamily();
      // Refresh the app-level family context so pages loaded after onboarding
      // (e.g. /schools/new) have a valid activeFamilyId immediately.
      await activeFamilyCtx?.refetchFamilies();
    }
  } catch (err) {
    logger.warn("Failed to provision family during parent onboarding", err);
  } finally {
    // Even on failure, unblock Next — savePlayerDetails' own error handling
    // covers a family that still isn't ready, rather than wedging the user
    // on a permanently-disabled button.
    familyReady.value = true;
  }
});

async function savePlayerDetails() {
  savePlayerDetailsError.value = null;
  try {
    await $fetchAuth("/api/family/player-details", {
      method: "POST",
      body: {
        playerName: playerName.value,
        playerDob: playerDob.value,
        graduationYear: graduationYear.value,
        sport: sport.value,
      },
    });
    await completeItem("sport");
  } catch (err) {
    logger.warn("Failed to save player details during onboarding", err);
    savePlayerDetailsError.value =
      err instanceof Error
        ? err.message
        : "Something went wrong saving your athlete's details. Please try again.";
    return;
  }

  try {
    const assessment = {
      hasHighlightVideo: false,
      hasContactedCoaches: false,
      hasTargetSchools: false,
      hasRegisteredEligibility: false,
      hasTakenTestScores: false,
    };
    await completeOnboarding(assessment);
  } catch (err) {
    logger.warn("Failed to complete onboarding assessment", err);
  }

  const { $posthog } = useNuxtApp();
  $posthog?.capture("onboarding_v2_complete");
  await navigateTo("/dashboard");
}
</script>
