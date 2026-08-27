import { useAdminResource } from "~/composables/useAdminResource";
import type { BreakdownSlice, WeekBucket } from "~/utils/adminBreakdown";

interface AdminStats {
  users: number;
  schools: number;
  coaches: number;
  interactions: number;
  family_units: number;
  byDivision: BreakdownSlice[];
  byCoachRole: BreakdownSlice[];
  byUserRole: BreakdownSlice[];
  newUsersWeekly: WeekBucket[];
}

export function useAdminStats() {
  const { data, loading, error, load } = useAdminResource<AdminStats>(
    () => "/api/admin/stats",
    {
      failLabel: "Failed to load stats",
      fallbackMessage: "Failed to load stats",
    },
  );

  return {
    stats: data,
    statsLoading: loading,
    statsError: error,
    loadStats: load,
  };
}
