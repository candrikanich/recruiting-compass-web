<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h1 class="text-2xl font-bold text-slate-900 mb-6">Pending Invitations</h1>
    <p class="text-sm text-slate-600 mb-4">
      Account link invitations awaiting acceptance. Cancel to revoke.
    </p>
    <div v-if="invitationsLoading" class="text-center py-12 text-slate-600">
      Loading...
    </div>
    <div
      v-else-if="invitationsError"
      class="bg-amber-50 border border-amber-200 rounded-lg p-4"
    >
      <p class="text-amber-800">{{ invitationsError }}</p>
    </div>
    <div
      v-else-if="pendingInvitations.length === 0"
      class="py-12 text-slate-500 text-center"
    >
      No pending invitations
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="text-left py-3 px-4 font-semibold text-slate-900">
              Invited email
            </th>
            <th class="text-left py-3 px-4 font-semibold text-slate-900">
              Initiator role
            </th>
            <th class="text-left py-3 px-4 font-semibold text-slate-900">
              Created
            </th>
            <th class="text-left py-3 px-4 font-semibold text-slate-900">
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
            <td class="py-3 px-4">
              <code class="text-sm bg-slate-100 px-2 py-1 rounded-sm">{{
                inv.invited_email
              }}</code>
            </td>
            <td class="py-3 px-4 text-slate-700">
              {{ inv.initiator_role }}
            </td>
            <td class="py-3 px-4 text-slate-700">
              {{ inv.created_at ? formatDate(inv.created_at) : "—" }}
            </td>
            <td class="py-3 px-4">
              <button
                type="button"
                :disabled="deletingInvitationId === inv.id"
                class="text-red-600 hover:text-red-800 disabled:opacity-50 font-medium text-sm"
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
