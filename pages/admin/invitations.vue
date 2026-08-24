<template>
  <div class="rounded-lg bg-white p-6 shadow-md">
    <h1 class="mb-6 text-2xl font-bold text-slate-900">Pending Invitations</h1>
    <p class="mb-4 text-sm text-slate-600">
      Account link invitations awaiting acceptance. Cancel to revoke.
    </p>
    <div v-if="invitationsLoading" class="py-12 text-center text-slate-600">
      Loading...
    </div>
    <div
      v-else-if="invitationsError"
      class="rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <p class="text-amber-800">{{ invitationsError }}</p>
    </div>
    <div
      v-else-if="pendingInvitations.length === 0"
      class="py-12 text-center text-slate-500"
    >
      No pending invitations
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="px-4 py-3 text-left font-semibold text-slate-900">
              Invited email
            </th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">
              Initiator role
            </th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">
              Created
            </th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="inv in pendingInvitations"
            :key="inv.id"
            class="border-b border-slate-100 hover:bg-slate-50"
          >
            <td class="px-4 py-3">
              <code class="rounded-sm bg-slate-100 px-2 py-1 text-sm">{{
                inv.invited_email
              }}</code>
            </td>
            <td class="px-4 py-3 text-slate-700">
              {{ inv.initiator_role }}
            </td>
            <td class="px-4 py-3 text-slate-700">
              {{ inv.created_at ? formatDate(inv.created_at) : "—" }}
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                :disabled="deletingInvitationId === inv.id"
                class="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                @click="cancelInvitation(inv.id)"
              >
                {{
                  deletingInvitationId === inv.id ? "Cancelling..." : "Cancel"
                }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useAdminInvitations } from "~/composables/useAdminInvitations";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const {
  pendingInvitations,
  invitationsLoading,
  invitationsError,
  deletingInvitationId,
  loadInvitations,
  cancelInvitation,
  formatDate,
} = useAdminInvitations();

onMounted(async () => {
  await loadInvitations();
});
</script>
