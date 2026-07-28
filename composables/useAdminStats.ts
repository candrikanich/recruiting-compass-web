import { ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";

interface AdminStats {
  users: number;
  schools: number;
  coaches: number;
  interactions: number;
  family_units: number;
}

export function useAdminStats() {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const stats = ref<AdminStats | null>(null);
  const statsLoading = ref(false);
  const statsError = ref<string | null>(null);

  const loadStats = async () => {
    statsLoading.value = true;
    statsError.value = null;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/stats", { headers });
      if (!res.ok) throw new Error(`Failed to load stats: ${res.status}`);
      stats.value = await res.json();
    } catch (err) {
      statsError.value =
        err instanceof Error ? err.message : "Failed to load stats";
    } finally {
      statsLoading.value = false;
    }
  };

  return { stats, statsLoading, statsError, loadStats };
}
