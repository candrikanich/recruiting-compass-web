/**
 * Favicon lookup shared by GET /api/schools/favicon (single)
 * and POST /api/schools/favicons (batch).
 *
 * SSRF defenses (user-supplied domains are fetched server-side):
 * - isAllowedDomain: rejects IP-literals, ports, single-label hosts (string check)
 * - isPrivateIp + DNS pre-resolution: rejects hostnames resolving to
 *   loopback / RFC1918 / link-local / CGNAT / ULA / v4-mapped-v6 addresses
 * - redirect: "manual": a public host cannot 302 the probe into internal space
 * - Scheme and port are fixed (https, 443) by URL construction
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Returns false for IP addresses and domains that could enable SSRF attacks.
 * Blocks: loopback, private ranges, link-local, domains without dots, domains with ports.
 */
export function isAllowedDomain(domain: string): boolean {
  // Reject if port is present (already stripped by normalization but guard against colons)
  if (domain.includes(":")) return false;

  // Reject if no dot (bare hostnames like "localhost", "metadata", single-label names)
  if (!domain.includes(".")) return false;

  // Reject IP-literals outright — school websites are hostnames
  if (isIP(domain)) return false;

  if (/^localhost$/i.test(domain)) return false;

  return true;
}

/**
 * True for addresses that must never be reached by a server-side probe:
 * loopback, RFC1918, link-local, CGNAT, unspecified, ULA, v4-mapped v6.
 */
export function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224 // multicast + reserved + broadcast
    );
  }

  const lower = address.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
  const v4Mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4Mapped) return isPrivateIp(v4Mapped[1]);
  return false;
}

/**
 * Resolve a hostname and confirm every address is publicly routable.
 * Unresolvable hosts return false — nothing legitimate to fetch there anyway.
 */
async function resolvesToPublicIp(host: string): Promise<boolean> {
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    return (
      addresses.length > 0 &&
      addresses.every(({ address }) => !isPrivateIp(address))
    );
  } catch {
    return false;
  }
}

/**
 * Normalize raw input into a bare, URL-safe domain (strip protocol/www, sanitize chars).
 */
export function normalizeDomain(rawDomain: string): string {
  return String(rawDomain)
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/\/$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Constant favicon-provider hosts — not attacker-controlled, no DNS gate needed */
const TRUSTED_HOSTS = new Set(["www.google.com", "icons.duckduckgo.com"]);

/**
 * Probe favicon sources for a domain, best first. Returns the first URL that
 * responds OK to a HEAD request, or null when none do.
 *
 * `deadlineMs` bounds total probe time across all sources — batch callers must
 * set it low enough that a full batch stays inside the serverless timeout.
 */
export async function findFaviconUrl(
  domain: string,
  rawDomain: string,
  options: { deadlineMs?: number } = {},
): Promise<string | null> {
  const deadline = Date.now() + (options.deadlineMs ?? 40_000);
  // Try multiple favicon sources in order of preference
  // Prioritize high-resolution icons, fall back to standard favicons
  const faviconSources = [
    // High-resolution sources (256x256 and above)
    `https://www.google.com/s2/favicons?sz=256&domain=${encodeURIComponent(rawDomain)}`,
    `https://${domain}/apple-touch-icon.png`, // Usually 180x180
    `https://www.${domain}/apple-touch-icon.png`,
    `https://${domain}/apple-touch-icon-precomposed.png`,

    // Medium resolution (128x128)
    `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(rawDomain)}`,

    // Standard favicons (usually 16x16 or 32x32)
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://${domain}/favicon.ico`,
    `https://www.${domain}/favicon.ico`,
  ];

  // One DNS verdict per host, resolved lazily (domain and www.domain differ)
  const hostVerdicts = new Map<string, Promise<boolean>>();
  const hostIsSafe = (host: string): Promise<boolean> => {
    if (TRUSTED_HOSTS.has(host)) return Promise.resolve(true);
    let verdict = hostVerdicts.get(host);
    if (!verdict) {
      verdict = resolvesToPublicIp(host);
      hostVerdicts.set(host, verdict);
    }
    return verdict;
  };

  for (const source of faviconSources) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;

    try {
      if (!(await hostIsSafe(new URL(source).hostname))) continue;

      // Use AbortController for proper timeout support
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        Math.min(5000, remaining),
      );

      try {
        const response = await fetch(source, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Redirects are not followed — only a direct 2xx counts as found
        if (response.ok) {
          return source;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch {
      // Continue to next source on error
      continue;
    }
  }

  return null;
}
