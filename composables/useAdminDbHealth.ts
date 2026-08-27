import { useAdminResource } from "~/composables/useAdminResource";
import type { AdminDbHealthResponse } from "~/server/api/admin/ops/db-health.get";

export type { AdminDbHealthResponse };

export function useAdminDbHealth() {
  const { data, loading, error, load } =
    useAdminResource<AdminDbHealthResponse>(
      () => "/api/admin/ops/db-health",
      {
        failLabel: "Failed to load DB health",
        fallbackMessage: "Could not load DB health.",
      },
    );

  return { data, loading, error, fetchDbHealth: load };
}
