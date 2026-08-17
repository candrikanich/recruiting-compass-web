import { ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";
import type { AdminDbHealthResponse } from "~/server/api/admin/ops/db-health.get";

export type { AdminDbHealthResponse };

export function useAdminDbHealth() {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const data = ref<AdminDbHealthResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchDbHealth = async () => {
    loading.value = true;
    error.value = null;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/ops/db-health", { headers });
      if (!res.ok) throw new Error(`Failed to load DB health: ${res.status}`);
      data.value = (await res.json()) as AdminDbHealthResponse;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Could not load DB health.";
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, fetchDbHealth };
}
