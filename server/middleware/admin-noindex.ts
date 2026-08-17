/**
 * Admin subdomain noindex middleware
 *
 * Emits `X-Robots-Tag: noindex, nofollow` on the admin host only. The admin
 * panel shares one Vercel project (and one static build) with the main app, so
 * per-host noindex cannot be expressed in vercel.json (its `headers` are
 * path-scoped, not host-scoped). This runs in the same Nitro chain as
 * security-headers, so the header lands on document responses as well as API
 * responses. It is defense-in-depth: the panel is already auth-gated and the
 * in-app <meta name="robots"> covers JS-executing crawlers.
 */

import { getHeader, setHeader } from "h3";
import { shouldNoindexHost } from "~/server/utils/adminNoindex";

export default defineEventHandler((event) => {
  const adminHost = (useRuntimeConfig(event).public.adminHost as string) || "";
  const rawHost =
    getHeader(event, "x-forwarded-host") || getHeader(event, "host") || "";
  if (shouldNoindexHost(rawHost, adminHost)) {
    setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  }
});
