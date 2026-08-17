import { useRuntimeConfig } from "#app";

export interface AppHost {
  currentHost: string;
  adminHost: string;
  isAdminHost: boolean;
  adminOrigin: string;
  toAdminUrl: (path: string) => string;
}

// Hosts may arrive as fully-qualified domain names with a trailing dot
// (e.g. NUXT_PUBLIC_ADMIN_HOST copied from a DNS record). window.location.host
// never carries that dot, so normalize both sides before comparing — otherwise
// "admin.example.com." !== "admin.example.com" silently disables host routing.
const stripTrailingDot = (host: string): string => host.replace(/\.$/, "");

export function computeAppHost(currentHost: string, adminHost: string): AppHost {
  const normalizedHost = stripTrailingDot(currentHost);
  const normalizedAdminHost = stripTrailingDot(adminHost);
  const adminOrigin = `https://${normalizedAdminHost}`;
  return {
    currentHost: normalizedHost,
    adminHost: normalizedAdminHost,
    isAdminHost: normalizedHost !== "" && normalizedHost === normalizedAdminHost,
    adminOrigin,
    toAdminUrl: (path: string) => `${adminOrigin}${path}`,
  };
}

export function useAppHost(): AppHost {
  const adminHost = useRuntimeConfig().public.adminHost as string;
  const currentHost = import.meta.client ? window.location.host : "";
  return computeAppHost(currentHost, adminHost);
}
