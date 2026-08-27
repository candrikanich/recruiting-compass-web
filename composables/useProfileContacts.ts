// composables/useProfileContacts.ts
import { ref, onMounted } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("profile-contacts");

export type ProfileLeadType = "contact" | "interest";

export interface ProfileLead {
  id: string;
  type: ProfileLeadType;
  coach_name: string;
  coach_email: string | null;
  coach_title: string | null;
  school_name: string | null;
  program: string | null;
  note: string | null;
  matched_coach_id: string | null;
  status: "pending" | "resolved" | "dismissed";
  interaction_id: string | null;
  created_at: string;
}

export interface ProfileContactCounts {
  interestThisMonth: number;
  contactThisMonth: number;
  totalThisMonth: number;
}

interface ProfileContactsResponse {
  leads: ProfileLead[];
  counts: ProfileContactCounts;
}

export function useProfileContacts() {
  const { $fetchAuth } = useAuthFetch();
  const leads = ref<ProfileLead[]>([]);
  const counts = ref<ProfileContactCounts>({
    interestThisMonth: 0,
    contactThisMonth: 0,
    totalThisMonth: 0,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchContacts(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetchAuth<ProfileContactsResponse>(
        "/api/player/profile/contacts",
      );
      leads.value = data.leads;
      counts.value = data.counts;
    } catch (err) {
      logger.error("Failed to load inbound leads", err);
      error.value = "Failed to load your inbox. Please try again.";
    } finally {
      loading.value = false;
    }
  }

  async function resolveLead(id: string, interactionId: string): Promise<void> {
    await $fetchAuth(`/api/player/profile/contacts/${id}/resolve`, {
      method: "POST",
      body: { status: "resolved", interactionId },
    });
    await fetchContacts();
  }

  async function dismissLead(id: string): Promise<void> {
    await $fetchAuth(`/api/player/profile/contacts/${id}/resolve`, {
      method: "POST",
      body: { status: "dismissed" },
    });
    await fetchContacts();
  }

  onMounted(() => fetchContacts());

  return {
    leads,
    counts,
    loading,
    error,
    fetchContacts,
    resolveLead,
    dismissLead,
  };
}
