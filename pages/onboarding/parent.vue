<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12"
  >
    <div class="max-w-xl mx-auto">
      <!-- Step indicator -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-900 mb-2">
          Welcome to The Recruiting Compass
        </h1>
        <div class="flex items-center justify-center gap-2 mt-4">
          <div
            v-for="n in totalSteps"
            :key="n"
            :class="[
              'w-3 h-3 rounded-full transition-colors',
              n <= step ? 'bg-blue-500' : 'bg-slate-200',
            ]"
          />
          <span class="ml-3 text-sm font-medium text-slate-600">
            {{ step }} of {{ totalSteps }}
          </span>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-8">
        <!-- Step 1: Player Details -->
        <div v-if="step === 1" data-testid="step-1" class="space-y-6">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 mb-1">
              Tell us about your player
            </h2>
            <p class="text-slate-500 text-sm">
              We'll pre-fill their profile so they can hit the ground running.
              All fields are optional.
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label
                for="playerName"
                class="block text-sm font-medium text-slate-700 mb-1"
              >
                Player's name
              </label>
              <input
                id="playerName"
                v-model="playerName"
                data-testid="player-name"
                type="text"
                placeholder="First Last"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                for="graduationYear"
                class="block text-sm font-medium text-slate-700 mb-1"
              >
                Graduation year
              </label>
              <select
                id="graduationYear"
                v-model="graduationYear"
                data-testid="graduation-year"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                class="block text-sm font-medium text-slate-700 mb-1"
              >
                Primary sport
              </label>
              <select
                id="sport"
                v-model="sport"
                data-testid="sport"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                class="block text-sm font-medium text-slate-700 mb-1"
              >
                Position
              </label>
              <select
                id="position"
                v-model="position"
                data-testid="position"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <div class="flex gap-3 pt-2">
            <button
              data-testid="skip-step-1"
              type="button"
              class="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              @click="step = 2"
            >
              Skip for now
            </button>
            <button
              data-testid="next-button"
              type="button"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              @click="savePlayerDetails"
            >
              Next
            </button>
          </div>
        </div>

        <!-- Step 2: Invite Player -->
        <div v-if="step === 2" data-testid="step-2" class="space-y-6">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 mb-1">
              Invite your player
            </h2>
            <p class="text-slate-500 text-sm">
              Send them an email invite or share your family code.
            </p>
          </div>

          <div>
            <label
              for="inviteEmail"
              class="block text-sm font-medium text-slate-700 mb-1"
            >
              Player's email address
            </label>
            <input
              id="inviteEmail"
              v-model="inviteEmail"
              data-testid="invite-email"
              type="email"
              placeholder="player@example.com"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            data-testid="send-invite-button"
            type="button"
            :disabled="!inviteEmail || inviteLoading"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            @click="sendPlayerInvite"
          >
            {{ inviteLoading ? "Sending\u2026" : "Send invite" }}
          </button>

          <div v-if="inviteError" class="text-red-600 text-sm">
            {{ inviteError }}
          </div>

          <!-- Family code display -->
          <div class="border-t border-slate-200 pt-4">
            <p class="text-sm text-slate-500 mb-2">
              Or share your family code
            </p>
            <div
              class="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3"
            >
              <span
                data-testid="family-code-display"
                class="font-mono font-bold text-lg text-slate-900 tracking-wider flex-1"
              >
                {{ familyCodeLoading ? "Loading\u2026" : (myFamilyCode ?? "\u2014") }}
              </span>
              <button
                v-if="myFamilyCode && !familyCodeLoading"
                type="button"
                class="text-slate-400 hover:text-slate-700 transition-colors"
                :title="codeCopied ? 'Copied!' : 'Copy code'"
                @click="copyCode"
              >
                <svg
                  v-if="!codeCopied"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5"
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
                  class="w-5 h-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              Your player enters this code during their signup.
            </p>
          </div>

          <button
            data-testid="skip-invite"
            type="button"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
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
import { ref, computed, onMounted } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useFamilyCode } from "~/composables/useFamilyCode";
import { useFamilyInvite } from "~/composables/useFamilyInvite";

definePageMeta({ layout: "default", middleware: "auth" });

const step = ref(1);
const totalSteps = 2;

// Step 1 — Player details
const playerName = ref("");
const graduationYear = ref("");
const sport = ref("");
const position = ref("");

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
  Baseball: ["Pitcher", "Catcher", "Infielder", "Outfielder", "Designated Hitter"],
  Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  Football: ["Quarterback", "Running Back", "Wide Receiver", "Tight End", "Offensive Line", "Linebacker", "Defensive Back", "Defensive Line"],
  Soccer: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  Volleyball: ["Outside Hitter", "Middle Blocker", "Setter", "Libero", "Opposite Hitter"],
  Softball: ["Pitcher", "Catcher", "Infielder", "Outfielder", "Designated Hitter"],
  "Track & Field": ["Sprinter", "Distance Runner", "Jumper", "Thrower"],
  Swimming: ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"],
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

const availablePositions = computed(() =>
  sport.value ? (sportPositions[sport.value] ?? []) : [],
);

const graduationYears = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear + i);
});

// Step 2 — Invite
const inviteEmail = ref("");
const { $fetchAuth } = useAuthFetch();
const {
  myFamilyCode,
  fetchMyCode,
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

onMounted(fetchMyCode);

async function savePlayerDetails() {
  if (playerName.value || graduationYear.value || sport.value || position.value) {
    await $fetchAuth("/api/family/player-details", {
      method: "POST",
      body: {
        playerName: playerName.value,
        graduationYear: graduationYear.value,
        sport: sport.value,
        position: position.value,
      },
    });
  }
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
