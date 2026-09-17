import { getRequestURL, type H3Event } from "h3";

// Mirrors nuxt.config.ts's own adminHost default — read directly off
// process.env rather than useRuntimeConfig(event) so this stays a plain
// function, importable from a unit test without the Nuxt server runtime.
const getConfiguredAdminHost = (): string =>
  process.env.NUXT_PUBLIC_ADMIN_HOST || "admin.myrecruitingcompass.com";

// Same normalization as adminNoindex.ts's shouldNoindexHost: strip a trailing
// FQDN dot, any :port suffix, and case before comparing hosts.
const normalizeHost = (host: string): string =>
  host.replace(/\.$/, "").split(":")[0].toLowerCase();

// Both prod and QA name their admin subdomain "admin.<public host>" (see
// nuxt.config.ts's adminHost default + useAppHost.ts's client-side twin). A
// request that lands on that host is still a real signup/claim/verify flow —
// requireAuth doesn't care which host served it — but an emailed link built
// from it points the recipient straight at the admin login, and
// middleware/host.global.ts's admin-host gate then bounces any non-admin
// path (e.g. /guardian/claim/<token>) back to /admin, stranding them.
// Canonicalize to the public host those paths actually live on.
export function canonicalizeOrigin(origin: string, adminHost: string): string {
  if (!adminHost) return origin;
  const url = new URL(origin);
  const requestHost = normalizeHost(url.hostname);
  const normalizedAdminHost = normalizeHost(adminHost);
  if (requestHost === "" || requestHost !== normalizedAdminHost) return origin;
  if (!requestHost.startsWith("admin.")) return origin;
  url.hostname = requestHost.slice("admin.".length);
  return url.origin;
}

// Best-effort only — callers use this to pick an emailed link's domain, which
// already has its own fallback chain. A malformed or test-stubbed event must
// never turn an email send into a thrown error.
export function getSafeRequestOrigin(event: H3Event): string | undefined {
  try {
    const origin = getRequestURL(event).origin;
    return canonicalizeOrigin(origin, getConfiguredAdminHost());
  } catch {
    return undefined;
  }
}
