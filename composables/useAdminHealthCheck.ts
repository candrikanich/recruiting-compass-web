import { ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";

interface AdminHealth {
  ok: boolean;
  checks: { name: string; status: string; message?: string }[];
}

export function useAdminHealthCheck() {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const health = ref<AdminHealth | null>(null);
  const healthLoading = ref(false);
  const healthError = ref<string | null>(null);

  const loadHealth = async () => {
    healthLoading.value = true;
    healthError.value = null;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/health", { headers });
      if (!res.ok) throw new Error(`Failed to load health: ${res.status}`);
      health.value = await res.json();
    } catch (err) {
      healthError.value =
        err instanceof Error ? err.message : "Failed to load health";
    } finally {
      healthLoading.value = false;
    }
  };

  return { health, healthLoading, healthError, loadHealth };
}
