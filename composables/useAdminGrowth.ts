import { useAdminResource } from "~/composables/useAdminResource";
import type { AdminGrowth } from "~/types/adminGrowth";

export type { AdminGrowth };

export function useAdminGrowth() {
  const { data, loading, error, load } = useAdminResource<AdminGrowth, [number]>(
    (days) => `/api/admin/growth?days=${days}`,
    {
      failLabel: "Failed to load growth analytics",
      fallbackMessage: "Could not load growth analytics.",
    },
  );

  const fetchGrowth = (days = 30) => load(days);

  return { data, loading, error, fetchGrowth };
}
