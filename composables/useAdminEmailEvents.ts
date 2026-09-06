import { computed } from "vue";
import { useAdminResource } from "~/composables/useAdminResource";
import type { AdminEmailEventRow } from "~/server/api/admin/email-events.get";

export type { AdminEmailEventRow };

export interface FetchEmailEventsOptions {
  limit?: number;
  offset?: number;
  eventType?: string;
  recipientEmail?: string;
}

interface EmailEventsPayload {
  rows: AdminEmailEventRow[];
  total: number;
}

export function useAdminEmailEvents() {
  const { data, loading, error, load } = useAdminResource<
    EmailEventsPayload,
    [FetchEmailEventsOptions?]
  >(
    (opts = {}) => {
      const params = new URLSearchParams();
      if (opts.limit !== undefined) params.set("limit", String(opts.limit));
      if (opts.offset !== undefined) params.set("offset", String(opts.offset));
      if (opts.eventType) params.set("eventType", opts.eventType);
      if (opts.recipientEmail)
        params.set("recipientEmail", opts.recipientEmail);
      const qs = params.toString();
      return `/api/admin/email-events${qs ? `?${qs}` : ""}`;
    },
    {
      failLabel: "Failed to load email events",
      fallbackMessage: "Could not load the email delivery log.",
    },
  );

  const rows = computed<AdminEmailEventRow[]>(() => data.value?.rows ?? []);
  const total = computed(() => data.value?.total ?? 0);

  const fetchEmailEvents = (opts: FetchEmailEventsOptions = {}) => load(opts);

  return { rows, total, loading, error, fetchEmailEvents };
}
