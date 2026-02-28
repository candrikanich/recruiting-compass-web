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
              <input
                id="graduationYear"
                v-model="graduationYear"
                data-testid="graduation-year"
                type="text"
                placeholder="2027"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                for="sport"
                class="block text-sm font-medium text-slate-700 mb-1"
              >
                Primary sport
              </label>
              <input
                id="sport"
                v-model="sport"
                data-testid="sport"
                type="text"
                placeholder="Baseball"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                for="position"
                class="block text-sm font-medium text-slate-700 mb-1"
              >
                Position
              </label>
              <input
                id="position"
                v-model="position"
                data-testid="position"
                type="text"
                placeholder="Pitcher"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
            {{ inviteLoading ? "Sending…" : "Send invite" }}
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
                class="font-mono font-bold text-lg text-slate-900 tracking-wider"
              >
                {{ myFamilyCode ?? "Loading…" }}
              </span>
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
import { ref, onMounted } from "vue";
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

// Step 2 — Invite
const inviteEmail = ref("");
const { myFamilyCode, fetchMyCode } = useFamilyCode();
const {
  sendInvite,
  loading: inviteLoading,
  error: inviteError,
} = useFamilyInvite();

onMounted(fetchMyCode);

async function savePlayerDetails() {
  if (playerName.value || graduationYear.value || sport.value || position.value) {
    await $fetch("/api/family/player-details", {
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
