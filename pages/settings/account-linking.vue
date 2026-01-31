<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">
          Family Account Linking
        </h1>
        <p class="text-slate-600">
          Share recruiting data with family members
        </p>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Error Alert -->
      <div
        v-if="error"
        class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <!-- Success Messages -->
      <div v-if="familyCodeSuccess" class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <p class="text-sm text-green-700">{{ familyCodeSuccess }}</p>
      </div>

      <div v-if="familyCodeError" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-sm text-red-700">{{ familyCodeError }}</p>
      </div>

      <!-- NEW: Family Code Section for Students -->
      <section v-if="isStudent && myFamilyCode" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <FamilyCodeDisplay
          :family-code="myFamilyCode"
          :code-generated-at="codeGeneratedAt"
          @copy="handleCopyCode"
          @regenerate="handleRegenerateCode"
        />
      </section>

      <!-- NEW: Create Family Section for Students -->
      <section v-if="isStudent && !myFamilyCode" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Create Your Family</h2>
        <p class="text-sm text-gray-700 mb-4">
          Create a family to share your recruiting data with parents and guardians.
          You'll receive a code to share with them.
        </p>
        <button
          @click="handleCreateFamily"
          :disabled="familyCodeLoading"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {{ familyCodeLoading ? "Creating..." : "Create My Family" }}
        </button>
      </section>

      <!-- NEW: Join Family Section for Parents -->
      <section v-if="isParent" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <FamilyCodeInput
          :loading="familyCodeLoading"
          @submit="handleJoinFamily"
        />
      </section>

      <!-- NEW: Joined Families for Parents -->
      <section v-if="isParent && parentFamilies.length > 0" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4">
          My Families <span class="text-sm text-gray-600">({{ parentFamilies.length }})</span>
        </h2>
        <div class="space-y-3">
          <div
            v-for="family in parentFamilies"
            :key="family.familyId"
            class="border border-green-200 bg-green-50 rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-green-900">{{ family.familyName }}</h3>
                <p class="text-sm text-green-700 font-mono">{{ family.familyCode }}</p>
              </div>
              <span class="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
                ✓ Joined
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 1: Linked Accounts (status: accepted) -->
      <section
        v-if="linkedAccounts.length > 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-4">👥 Linked Accounts</h2>
        <p class="text-sm text-gray-600 mb-4">
          These family members have confirmed account links and can see your shared data.
        </p>

        <div class="space-y-4">
          <LinkedAccountCard
            v-for="account in linkedAccounts"
            :key="account.user_id"
            :account="account"
            :loading="loading"
            @unlink="handleUnlink"
          />
        </div>
      </section>

      <!-- Section 2: Pending Confirmations (I need to confirm) -->
      <section
        v-if="pendingConfirmations.length > 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <ExclamationCircleIcon class="w-6 h-6 text-amber-600" />
          <span>Pending Confirmations</span>
          <span class="inline-flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
            {{ pendingConfirmations.length }}
          </span>
        </h2>
        <p class="text-sm text-gray-600 mb-4">
          Action required! Please confirm these people before data sharing is activated.
        </p>

        <div class="space-y-4">
          <ConfirmationCard
            v-for="link in pendingConfirmations"
            :key="link.id"
            :link="link"
            :initiator-name="null"
            :loading="loading"
            @confirm="handleConfirm"
            @reject="handleRejectConfirmation"
          />
        </div>
      </section>

      <!-- Section 3: Received Invitations (I need to accept) -->
      <section
        v-if="receivedInvitations.length > 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <EnvelopeIcon class="w-6 h-6 text-blue-600" />
          <span>Received Invitations</span>
          <span class="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
            {{ receivedInvitations.length }}
          </span>
        </h2>
        <p class="text-sm text-gray-600 mb-4">
          Accept these invitations to link your accounts and share data.
        </p>

        <div class="space-y-4">
          <PendingInvitationCard
            v-for="invitation in receivedInvitations"
            :key="invitation.id"
            :invitation="invitation"
            :initiator-name="null"
            :loading="loading"
            @accept="handleAccept"
            @reject="handleRejectInvitation"
          />
        </div>
      </section>

      <!-- Section 4: Sent Invitations (awaiting their response) -->
      <section
        v-if="sentInvitations.length > 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <PaperAirplaneIcon class="w-6 h-6 text-slate-600" />
          <span>Sent Invitations</span>
          <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
            {{ sentInvitations.length }}
          </span>
        </h2>
        <p class="text-sm text-gray-600 mb-4">
          Waiting for these people to accept your invitations.
        </p>

        <div class="space-y-4">
          <SentInvitationCard
            v-for="invitation in sentInvitations"
            :key="invitation.id"
            :invitation="invitation"
            :loading="loading"
            @cancel="handleCancelInvitation"
          />
        </div>
      </section>

      <!-- Section 5: Send New Invitation Form -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4">📨 Send Invitation</h2>

        <form @submit.prevent="handleSendInvitation" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
              <span class="text-red-600">*</span>
            </label>
            <input
              v-model="inviteEmail"
              type="email"
              required
              placeholder="example@email.com"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :disabled="loading"
            />
            <p class="text-xs text-gray-500 mt-2">
              Invite a parent, another parent, or a player to link accounts
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Their Role
              <span class="text-red-600">*</span>
            </label>
            <select
              v-model="inviteeRole"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :disabled="loading"
            >
              <option value="">Select a role...</option>
              <option value="parent">Parent / Guardian</option>
              <option value="student">Student / Athlete</option>
            </select>
            <p class="text-xs text-gray-500 mt-2">
              What role will this person have in the account link?
            </p>
          </div>

          <div
            v-if="sendError"
            class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
          >
            {{ sendError }}
          </div>

          <button
            type="submit"
            :disabled="loading || !inviteEmail"
            class="w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {{ loading ? "Sending..." : "Send Invitation" }}
          </button>
        </form>

        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-sm text-gray-600 font-medium mb-3">
            How the 3-step linking process works:
          </p>
          <ul class="text-sm text-gray-600 space-y-2">
            <li class="flex items-start gap-3">
              <span class="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span><strong>You send:</strong> Enter email and send invitation</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span><strong>They accept:</strong> Recipient clicks link in email and accepts</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span><strong>You confirm:</strong> You verify and confirm the link</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
              <span><strong>Data shared:</strong> Both see schools, coaches, events, and interactions</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Empty state if nothing pending -->
      <div
        v-if="
          linkedAccounts.length === 0 &&
          sentInvitations.length === 0 &&
          receivedInvitations.length === 0 &&
          pendingConfirmations.length === 0
        "
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <p class="text-gray-500 mb-2">No linked accounts or pending invitations</p>
        <p class="text-sm text-gray-400">
          Send an invitation above to link with a family member
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ArrowLeftIcon, ExclamationCircleIcon, EnvelopeIcon, PaperAirplaneIcon } from "@heroicons/vue/24/outline";
import { useAccountLinks } from "~/composables/useAccountLinks";
import { useFamilyCode } from "~/composables/useFamilyCode";
import { useUserStore } from "~/stores/user";
import LinkedAccountCard from "~/components/AccountLinking/LinkedAccountCard.vue";
import PendingInvitationCard from "~/components/AccountLinking/PendingInvitationCard.vue";
import ConfirmationCard from "~/components/AccountLinking/ConfirmationCard.vue";
import SentInvitationCard from "~/components/AccountLinking/SentInvitationCard.vue";
import FamilyCodeDisplay from "~/components/Family/FamilyCodeDisplay.vue";
import FamilyCodeInput from "~/components/Family/FamilyCodeInput.vue";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const isStudent = computed(() => userStore.user?.role === "student");
const isParent = computed(() => userStore.user?.role === "parent");

const {
  linkedAccounts,
  sentInvitations,
  receivedInvitations,
  pendingConfirmations,
  loading,
  error,
  fetchAccountLinks,
  sendInvitation,
  acceptInvitation,
  confirmLinkAsInitiator,
  rejectConfirmation,
  cancelInvitation,
  rejectInvitation,
  unlinkAccount,
} = useAccountLinks();

const {
  myFamilyCode,
  myFamilyId,
  myFamilyName,
  parentFamilies,
  loading: familyCodeLoading,
  error: familyCodeError,
  successMessage: familyCodeSuccess,
  fetchMyCode,
  createFamily,
  joinByCode,
  regenerateCode,
  copyCodeToClipboard,
} = useFamilyCode();

const codeGeneratedAt = ref<string | null>(null);
const inviteEmail = ref("");
const inviteeRole = ref("");
const sendError = ref<string | null>(null);

onMounted(async () => {
  await fetchAccountLinks();
  await fetchMyCode();
});

const handleSendInvitation = async () => {
  sendError.value = null;
  const success = await sendInvitation(inviteEmail.value, inviteeRole.value);
  if (success) {
    inviteEmail.value = "";
    inviteeRole.value = "";
  } else {
    sendError.value = error.value || "Failed to send invitation";
  }
};

const handleAccept = async (linkId: string) => {
  const success = await acceptInvitation(linkId);
  if (!success) {
    sendError.value = error.value || "Failed to accept invitation";
  }
};

const handleConfirm = async (linkId: string) => {
  const success = await confirmLinkAsInitiator(linkId);
  if (!success) {
    sendError.value = error.value || "Failed to confirm link";
  }
};

const handleRejectConfirmation = async (linkId: string) => {
  const success = await rejectConfirmation(linkId);
  if (!success) {
    sendError.value = error.value || "Failed to reject confirmation";
  }
};

const handleRejectInvitation = async (linkId: string) => {
  const success = await rejectInvitation(linkId);
  if (!success) {
    sendError.value = error.value || "Failed to reject invitation";
  }
};

const handleCancelInvitation = async (linkId: string) => {
  const success = await cancelInvitation(linkId);
  if (!success) {
    sendError.value = error.value || "Failed to cancel invitation";
  }
};

const handleUnlink = async (linkId: string) => {
  if (confirm("Are you sure? Both accounts will keep copies of shared data.")) {
    const success = await unlinkAccount(linkId);
    if (!success) {
      sendError.value = error.value || "Failed to unlink account";
    }
  }
};

const handleCreateFamily = async () => {
  const success = await createFamily();
  if (success) {
    await fetchMyCode();
  }
};

const handleJoinFamily = async (code: string) => {
  await joinByCode(code);
};

const handleCopyCode = async (code: string) => {
  await copyCodeToClipboard(code);
};

const handleRegenerateCode = async () => {
  const confirmed = confirm(
    "Are you sure you want to regenerate your family code? The old code will no longer work."
  );
  if (confirmed) {
    await regenerateCode();
  }
};
</script>
