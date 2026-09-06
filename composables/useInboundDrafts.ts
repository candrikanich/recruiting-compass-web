import { ref } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import type { Database } from "~/types/database";

type InboundDraft = Database["public"]["Tables"]["inbound_email_drafts"]["Row"];

export function useInboundDrafts() {
  const drafts = ref<InboundDraft[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const { $fetchAuth } = useAuthFetch();

  async function fetchDrafts() {
    loading.value = true;
    error.value = null;
    try {
      const result = await $fetchAuth<{ drafts: InboundDraft[] }>("/api/inbound-drafts");
      drafts.value = result.drafts;
    } catch {
      error.value = "Failed to load drafts";
    } finally {
      loading.value = false;
    }
  }

  async function confirmDraft(id: string, schoolId?: string) {
    await $fetchAuth(`/api/inbound-drafts/${id}/confirm`, {
      method: "POST",
      body: schoolId ? { schoolId } : {},
    });
    drafts.value = drafts.value.filter((d) => d.id !== id);
  }

  async function discardDraft(id: string) {
    await $fetchAuth(`/api/inbound-drafts/${id}/discard`, { method: "POST" });
    drafts.value = drafts.value.filter((d) => d.id !== id);
  }

  return { drafts, loading, error, fetchDrafts, confirmDraft, discardDraft };
}
