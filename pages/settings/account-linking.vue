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
import { ref, onMounted } from "vue";
import { ArrowLeftIcon, ExclamationCircleIcon, EnvelopeIcon, PaperAirplaneIcon } from "@heroicons/vue/24/outline";
import { useAccountLinks } from "~/composables/useAccountLinks";
import { useUserStore } from "~/stores/user";
import LinkedAccountCard from "~/components/AccountLinking/LinkedAccountCard.vue";
import PendingInvitationCard from "~/components/AccountLinking/PendingInvitationCard.vue";
import ConfirmationCard from "~/components/AccountLinking/ConfirmationCard.vue";
import SentInvitationCard from "~/components/AccountLinking/SentInvitationCard.vue";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
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

const inviteEmail = ref("");
const sendError = ref<string | null>(null);

onMounted(async () => {
  await fetchAccountLinks();
});

const handleSendInvitation = async () => {
  sendError.value = null;
  const success = await sendInvitation(inviteEmail.value);
  if (success) {
    inviteEmail.value = "";
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
</script>
