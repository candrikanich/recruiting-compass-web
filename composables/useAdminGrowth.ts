import { ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";
import type { AdminGrowth } from "~/types/adminGrowth";

export type { AdminGrowth };

export function useAdminGrowth() {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const data = ref<AdminGrowth | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchGrowth = async (days = 30) => {
    loading.value = true;
    error.value = null;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/growth?days=${days}`, { headers });
      if (!res.ok) throw new Error(`Failed to load growth analytics: ${res.status}`);
      data.value = (await res.json()) as AdminGrowth;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Could not load growth analytics.";
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, fetchGrowth };
}
