import { ref } from "vue";
import { useAuthFetch } from "./useAuthFetch";

export interface PendingInvitation {
  id: string;
  invited_email: string;
  role: "player" | "parent";
  expires_at: string;
  created_at: string;
}

export function useFamilyInvitations() {
  const { $fetchAuth } = useAuthFetch();
  const invitations = ref<PendingInvitation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchInvitations() {
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetchAuth<{ invitations: PendingInvitation[] }>(
        "/api/family/invitations",
      );
      invitations.value = data.invitations;
    } catch {
      error.value = "Failed to load invitations";
    } finally {
      loading.value = false;
    }
  }

  async function revokeInvitation(id: string) {
    loading.value = true;
    error.value = null;
    try {
      await $fetchAuth(`/api/family/invitations/${id}`, { method: "DELETE" });
      await fetchInvitations();
    } catch {
      error.value = "Failed to revoke invitation";
    } finally {
      loading.value = false;
    }
  }

  async function resendInvitation(
    id: string,
    email: string,
    role: "player" | "parent",
  ) {
    loading.value = true;
    error.value = null;
    try {
      await $fetchAuth(`/api/family/invitations/${id}`, { method: "DELETE" });
      await $fetchAuth("/api/family/invite", {
        method: "POST",
        body: { email, role },
      });
      await fetchInvitations();
    } catch {
      error.value = "Failed to resend invitation";
    } finally {
      loading.value = false;
    }
  }

  return {
    invitations,
    loading,
    error,
    fetchInvitations,
    revokeInvitation,
    resendInvitation,
  };
}
