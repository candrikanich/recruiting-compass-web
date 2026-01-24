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
          Share recruiting data with a parent or player account
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

      <!-- Linked Accounts Section -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-4">👥 Linked Accounts</h2>

        <div v-if="linkedAccounts.length > 0" class="space-y-4">
          <LinkedAccountCard
            v-for="account in linkedAccounts"
            :key="account.user_id"
            :account="account"
            :loading="loading"
            @unlink="handleUnlink"
          />
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <p class="text-sm">No linked accounts yet</p>
          <p class="text-xs mt-1">
            Send an invitation below to link with a parent or player
          </p>
        </div>
      </div>

      <!-- Pending Invitations Section -->
      <div
        v-if="pendingInvitations.length > 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-4">
          ⏳ Pending Invitations
        </h2>

        <div class="space-y-4">
          <PendingInvitationCard
            v-for="invitation in pendingInvitations"
            :key="invitation.id"
            :invitation="invitation"
            :loading="loading"
            @accept="handleAccept"
            @reject="handleReject"
          />
        </div>
      </div>

      <!-- Send Invitation Section -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4">📨 Send Invitation</h2>

        <form @submit.prevent="handleSendInvitation" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{
                userStore.user?.role === "parent" ? "Player" : "Parent"
              }}
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
              {{
                userStore.user?.role === "parent"
                  ? "Enter your player's email address"
                  : "Enter your parent's email address"
              }}
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
          <p class="text-sm text-gray-600">
            <strong>How it works:</strong>
          </p>
          <ul class="text-sm text-gray-600 mt-3 space-y-2">
            <li class="flex items-start gap-2">
              <span class="text-blue-600 font-bold">1.</span>
              <span
                >Enter the email address of the parent or player you want to
                link with</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-600 font-bold">2.</span>
              <span
                >They'll receive a notification to accept or decline the
                invitation</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-600 font-bold">3.</span>
              <span
                >Once accepted, you'll both see the same schools, coaches,
                events, and interactions</span
              >
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-600 font-bold">4.</span>
              <span>Private notes remain separate for each person</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useAccountLinks } from "~/composables/useAccountLinks";
import { useUserStore } from "~/stores/user";
import Header from "~/components/Header.vue";
import LinkedAccountCard from "~/components/AccountLinking/LinkedAccountCard.vue";
import PendingInvitationCard from "~/components/AccountLinking/PendingInvitationCard.vue";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const {
  linkedAccounts,
  pendingInvitations,
  loading,
  error,
  fetchAccountLinks,
  sendInvitation,
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
  const { acceptInvitation } = useAccountLinks();
  await acceptInvitation(linkId);
  await fetchAccountLinks();
};

const handleReject = async (linkId: string) => {
  const { rejectInvitation } = useAccountLinks();
  await rejectInvitation(linkId);
  await fetchAccountLinks();
};

const handleUnlink = async (linkId: string) => {
  if (confirm("Are you sure? Both accounts will keep copies of shared data.")) {
    const { unlinkAccount } = useAccountLinks();
    await unlinkAccount(linkId);
    await fetchAccountLinks();
  }
};
</script>
