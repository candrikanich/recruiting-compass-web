<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md"
        >
          <span class="text-lg">👥</span>
        </div>
        <div>
          <h2 class="text-slate-900 font-semibold">Family Collaboration</h2>
          <p class="text-sm mt-1 text-slate-600">
            Share recruiting data with family members
          </p>
        </div>
      </div>
      <NuxtLink
        to="/settings/account-linking"
        class="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap ml-4"
      >
        Manage →
      </NuxtLink>
    </div>

    <!-- Linked Accounts -->
    <div v-if="linkedAccounts.length > 0" class="space-y-3 mb-4">
      <div
        v-for="account in linkedAccounts"
        :key="account.user_id"
        class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100"
        >
          <span class="text-xs font-bold text-indigo-600">
            {{
              account.full_name?.[0]?.toUpperCase() ||
              account.email[0].toUpperCase()
            }}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate text-slate-900">
            {{ account.full_name || account.email }}
          </p>
          <p class="text-xs capitalize text-slate-600">
            {{ account.role }} • Linked
          </p>
        </div>
      </div>
    </div>

    <!-- Action Required: Pending Confirmations -->
    <div
      v-if="pendingConfirmations.length > 0"
      class="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200"
    >
      <div class="flex items-start gap-2">
        <span class="text-lg flex-shrink-0">⚠️</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-amber-900">
            {{ pendingConfirmations.length }}
            {{ pendingConfirmations.length === 1 ? "confirmation" : "confirmations" }} needed
          </p>
          <p class="text-xs text-amber-700 mt-0.5">
            Action required to activate data sharing
          </p>
        </div>
      </div>
    </div>

    <!-- Received Invitations -->
    <div v-if="receivedInvitations.length > 0" class="space-y-3 mb-4">
      <div
        v-for="invitation in receivedInvitations"
        :key="invitation.id"
        class="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200"
      >
        <span class="text-lg">📨</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900">Invitation to accept</p>
          <p class="text-xs text-slate-600">{{ invitation.invited_email }}</p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="
        linkedAccounts.length === 0 &&
        sentInvitations.length === 0 &&
        receivedInvitations.length === 0 &&
        pendingConfirmations.length === 0
      "
      class="text-center py-6"
    >
      <p class="text-sm text-slate-600 mb-3">No linked accounts or invitations</p>
      <NuxtLink
        to="/settings/account-linking"
        class="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        Send an invitation →
      </NuxtLink>
    </div>

    <!-- Stats -->
    <div
      v-if="
        linkedAccounts.length > 0 ||
        sentInvitations.length > 0 ||
        receivedInvitations.length > 0 ||
        pendingConfirmations.length > 0
      "
      class="mt-6 pt-4 border-t border-slate-200"
    >
      <div class="grid grid-cols-2 gap-3 text-center">
        <div v-if="linkedAccounts.length > 0">
          <p class="text-2xl font-bold text-emerald-600">
            {{ linkedAccounts.length }}
          </p>
          <p class="text-xs text-slate-600">
            {{ linkedAccounts.length === 1 ? "Account" : "Accounts" }} Linked
          </p>
        </div>
        <div v-if="pendingConfirmations.length > 0">
          <p class="text-2xl font-bold text-amber-600">
            {{ pendingConfirmations.length }}
          </p>
          <p class="text-xs text-slate-600">Action Required</p>
        </div>
        <div v-if="sentInvitations.length > 0" class="col-span-2">
          <p class="text-2xl font-bold text-slate-500">
            {{ sentInvitations.length }}
          </p>
          <p class="text-xs text-slate-600">
            {{ sentInvitations.length === 1 ? "Invitation" : "Invitations" }} Pending
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useAccountLinks } from "~/composables/useAccountLinks";

const accountLinksComposable = useAccountLinks();

const linkedAccounts = computed(() => accountLinksComposable.linkedAccounts.value);
const sentInvitations = computed(() => accountLinksComposable.sentInvitations.value);
const receivedInvitations = computed(
  () => accountLinksComposable.receivedInvitations.value,
);
const pendingConfirmations = computed(
  () => accountLinksComposable.pendingConfirmations.value,
);

onMounted(() => {
  accountLinksComposable.fetchAccountLinks();
});
</script>
