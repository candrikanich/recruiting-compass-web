import { ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";
import type { AdminAuditRow } from "~/server/api/admin/audit-log.get";

export type { AdminAuditRow };

export interface FetchAuditLogOptions {
  limit?: number;
  offset?: number;
  action?: string;
  actor?: string;
}

export function useAdminAuditLog() {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const rows = ref<AdminAuditRow[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAuditLog = async (opts: FetchAuditLogOptions = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (opts.limit !== undefined) params.set("limit", String(opts.limit));
      if (opts.offset !== undefined) params.set("offset", String(opts.offset));
      if (opts.action) params.set("action", opts.action);
      if (opts.actor) params.set("actor", opts.actor);

      const qs = params.toString();
      const res = await fetch(`/api/admin/audit-log${qs ? `?${qs}` : ""}`, {
        headers,
      });
      if (!res.ok) throw new Error(`Failed to load audit log: ${res.status}`);

      const data = (await res.json()) as {
        rows: AdminAuditRow[];
        total: number;
      };
      rows.value = data.rows;
      total.value = data.total;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Could not load the audit log.";
    } finally {
      loading.value = false;
    }
  };

  return { rows, total, loading, error, fetchAuditLog };
}
