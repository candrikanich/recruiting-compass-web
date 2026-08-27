import { useAdminResource } from "~/composables/useAdminResource";
import type { AdminUserDetail } from "~/types/adminUserDetail";

export function useAdminUserDetail() {
  const { data, loading, error, load } = useAdminResource<
    AdminUserDetail,
    [string]
  >((id) => `/api/admin/users/${id}`, {
    failLabel: "Failed to load user detail",
    fallbackMessage: "Could not load this user's details.",
  });

  return { data, loading, error, fetchDetail: (id: string) => load(id) };
}
