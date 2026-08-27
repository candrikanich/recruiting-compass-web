import { computed } from "vue";
import { useAdminResource } from "~/composables/useAdminResource";
import type { AdminAuditRow } from "~/server/api/admin/audit-log.get";

export type { AdminAuditRow };

export interface FetchAuditLogOptions {
  limit?: number;
  offset?: number;
  action?: string;
  actor?: string;
}

interface AuditLogPayload {
  rows: AdminAuditRow[];
  total: number;
}

export function useAdminAuditLog() {
  const { data, loading, error, load } = useAdminResource<
    AuditLogPayload,
    [FetchAuditLogOptions?]
  >(
    (opts = {}) => {
      const params = new URLSearchParams();
      if (opts.limit !== undefined) params.set("limit", String(opts.limit));
      if (opts.offset !== undefined) params.set("offset", String(opts.offset));
      if (opts.action) params.set("action", opts.action);
      if (opts.actor) params.set("actor", opts.actor);
      const qs = params.toString();
      return `/api/admin/audit-log${qs ? `?${qs}` : ""}`;
    },
    {
      failLabel: "Failed to load audit log",
      fallbackMessage: "Could not load the audit log.",
    },
  );

  const rows = computed<AdminAuditRow[]>(() => data.value?.rows ?? []);
  const total = computed(() => data.value?.total ?? 0);

  const fetchAuditLog = (opts: FetchAuditLogOptions = {}) => load(opts);

  return { rows, total, loading, error, fetchAuditLog };
}
