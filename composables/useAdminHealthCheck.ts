import { useAdminResource } from "~/composables/useAdminResource";

interface AdminHealth {
  ok: boolean;
  checks: { name: string; status: string; message?: string }[];
}

export function useAdminHealthCheck() {
  const { data, loading, error, load } = useAdminResource<AdminHealth>(
    () => "/api/admin/health",
    {
      failLabel: "Failed to load health",
      fallbackMessage: "Failed to load health",
    },
  );

  return {
    health: data,
    healthLoading: loading,
    healthError: error,
    loadHealth: load,
  };
}
