import { ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useAppToast } from "~/composables/useAppToast";

interface PendingInvitation {
  id: string;
  invited_email: string;
  status: string;
  initiator_role: string;
  created_at: string | null;
}

export function useAdminInvitations() {
  const { getAuthHeaders } = useAdminAuthHeaders();
  const { $fetchAuth } = useAuthFetch();
  const { showToast } = useAppToast();

  const pendingInvitations = ref<PendingInvitation[]>([]);
  const invitationsLoading = ref(false);
  const invitationsError = ref<string | null>(null);
  const deletingInvitationId = ref<string | null>(null);

  const loadInvitations = async () => {
    invitationsLoading.value = true;
    invitationsError.value = null;
    try {
      const headers = await getAuthHeaders();
      const httpRes = await fetch("/api/admin/pending-invitations", {
        headers,
      });
      if (!httpRes.ok)
        throw new Error(`Failed to load invitations: ${httpRes.status}`);
      const res = (await httpRes.json()) as {
        invitations: PendingInvitation[];
        error?: string;
      };
      pendingInvitations.value = res.invitations ?? [];
      if (res.error) invitationsError.value = res.error;
    } catch (err) {
      invitationsError.value =
        err instanceof Error ? err.message : "Failed to load invitations";
    } finally {
      invitationsLoading.value = false;
    }
  };

  const cancelInvitation = async (id: string) => {
    deletingInvitationId.value = id;
    try {
      await $fetchAuth(`/api/admin/pending-invitations/${id}`, {
        method: "DELETE",
      });
      pendingInvitations.value = pendingInvitations.value.filter(
        (inv) => inv.id !== id,
      );
      showToast("Invitation cancelled", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to cancel invitation",
        "error",
      );
    } finally {
      deletingInvitationId.value = null;
    }
  };

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  return {
    pendingInvitations,
    invitationsLoading,
    invitationsError,
    deletingInvitationId,
    loadInvitations,
    cancelInvitation,
    formatDate,
  };
}
