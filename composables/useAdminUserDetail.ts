import { ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";
import type { AdminUserDetail } from "~/types/adminUserDetail";

export function useAdminUserDetail() {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const data = ref<AdminUserDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchDetail = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users/${id}`, { headers });
      if (!res.ok) throw new Error(`Failed to load user detail: ${res.status}`);
      data.value = (await res.json()) as AdminUserDetail;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Could not load this user's details.";
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, fetchDetail };
}
