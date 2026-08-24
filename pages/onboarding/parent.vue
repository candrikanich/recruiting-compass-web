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
              Tell us about your player
            </h2>
            <p class="text-sm text-slate-500">
              We'll pre-fill their profile so they can hit the ground running.
              Name and position are optional.
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
                Graduation year
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
                @change="position = ''"
              >
                <option value="">Select sport</option>
                <option v-for="s in commonSports" :key="s" :value="s">
                  {{ s }}
                </option>
              </select>
            </div>

            <div v-if="sport">
              <label
                for="position"
                class="mb-1 block text-sm font-medium text-slate-700"
              >
                Position
              </label>
              <select
                id="position"
                v-model="position"
                data-testid="position"
                class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select position</option>
                <option
                  v-for="pos in availablePositions"
                  :key="pos"
                  :value="pos"
                >
                  {{ pos }}
                </option>
              </select>
            </div>
          </div>

          <div class="pt-2">
            <button
              data-testid="next-button"
              type="button"
              :disabled="!playerDob || playerTooYoung || !sport"
              class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="savePlayerDetails"
            >
              Next
            </button>
          </div>
        </div>

        <!-- Step 2: Invite Player -->
        <div v-if="step === 2" data-testid="step-2" class="space-y-6">
          <div>
            <h2 class="mb-1 text-2xl font-bold text-slate-900">
              Invite your player
            </h2>
            <p class="text-sm text-slate-500">
              Send them an email invite or share your family code.
            </p>
          </div>

          <div>
            <label
              for="inviteEmail"
              class="mb-1 block text-sm font-medium text-slate-700"
            >
              Player's email address
            </label>
            <input
              id="inviteEmail"
              v-model="inviteEmail"
              data-testid="invite-email"
              type="email"
              autocomplete="email"
              placeholder="player@example.com"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <button
            data-testid="send-invite-button"
            type="button"
            :disabled="!inviteEmail || inviteLoading"
            class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="sendPlayerInvite"
          >
            {{ inviteLoading ? "Sending\u2026" : "Send invite" }}
          </button>

          <div v-if="inviteError" class="text-sm text-red-600">
            {{ inviteError }}
          </div>

          <!-- Family code display -->
          <div class="border-t border-slate-200 pt-4">
            <p class="mb-2 text-sm text-slate-500">Or share your family code</p>
            <div
              class="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3"
            >
              <span
                data-testid="family-code-display"
                class="flex-1 font-mono text-lg font-bold tracking-wider text-slate-900"
              >
                {{
                  familyCodeLoading
                    ? "Loading\u2026"
                    : (myFamilyCode ?? "\u2014")
                }}
              </span>
              <button
                v-if="myFamilyCode && !familyCodeLoading"
                type="button"
                class="text-slate-400 transition-colors hover:text-slate-700"
                :title="codeCopied ? 'Copied!' : 'Copy code'"
                @click="copyCode"
              >
                <svg
                  v-if="!codeCopied"
                  xmlns="http://www.w3.org/2000/svg"
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
            <p class="mt-1 text-xs text-slate-400">
              Your player enters this code during their signup.
            </p>
          </div>

          <button
            data-testid="skip-invite"
            type="button"
            class="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50"
            @click="skipInvite"
          >
            I'll invite them later
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
import { useFamilyInvite } from "~/composables/useFamilyInvite";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import { getCanonicalPositions } from "~/utils/positions/canonical";
import { getGraduationYearOptions } from "~/utils/graduationYears";

definePageMeta({ layout: "default", middleware: "auth" });

const step = ref(1);
const totalSteps = 2;

// Step 1 — Player details
const playerName = ref("");
const playerDob = ref("");
const graduationYear = ref("");
const sport = ref("");
const position = ref("");

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

const availablePositions = computed(() => getCanonicalPositions(sport.value));

const graduationYears = computed(() => getGraduationYearOptions());

// Step 2 — Invite
const inviteEmail = ref("");
const { $fetchAuth } = useAuthFetch();
const activeFamilyCtx = inject<UseActiveFamilyReturn>("activeFamily");
const {
  myFamilyCode,
  fetchMyCode,
  createFamily,
  loading: familyCodeLoading,
  copyCodeToClipboard,
} = useFamilyCode();
const {
  sendInvite,
  loading: inviteLoading,
  error: inviteError,
} = useFamilyInvite();

const codeCopied = ref(false);

async function copyCode() {
  if (!myFamilyCode.value) return;
  await copyCodeToClipboard(myFamilyCode.value);
  codeCopied.value = true;
  setTimeout(() => {
    codeCopied.value = false;
  }, 2000);
}

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
      position: position.value,
    },
  });
  step.value = 2;
}

async function sendPlayerInvite() {
  if (!inviteEmail.value) return;
  await sendInvite({ email: inviteEmail.value, role: "player" });
  await navigateTo("/dashboard");
}

function skipInvite() {
  navigateTo("/dashboard");
}
</script>
