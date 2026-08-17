/**
 * Pure host check for admin-subdomain noindex.
 *
 * Normalizes a trailing FQDN dot (NUXT_PUBLIC_ADMIN_HOST is easy to copy from a
 * DNS record with one), any `:port` suffix, and case before comparing — the
 * same trailing-dot mismatch that once disabled admin host routing.
 */
export function shouldNoindexHost(rawHost: string, adminHost: string): boolean {
  const normalize = (host: string): string =>
    host.replace(/\.$/, "").split(":")[0].toLowerCase();
  const host = normalize(rawHost);
  return host !== "" && host === normalize(adminHost);
}
