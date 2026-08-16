import { safeInternalPath } from "~/utils/safeInternalPath";
import type { LocationQuery } from "vue-router";

export interface BackLink {
  to: string;
  text: string;
}

/** Derive a safe back-link from route query (`back`, `label`). */
export function deriveBackLink(query: Partial<LocationQuery>): BackLink {
  const rawBack = typeof query.back === "string" ? query.back : undefined;
  const rawLabel = typeof query.label === "string" ? query.label : undefined;
  const to = safeInternalPath(rawBack);
  const text = `Back to ${rawLabel ?? "All Coaches"}`;
  return { to, text };
}
