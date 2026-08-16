import { useRuntimeConfig } from "#app";

export interface AppHost {
  currentHost: string;
  adminHost: string;
  isAdminHost: boolean;
  adminOrigin: string;
  toAdminUrl: (path: string) => string;
}

export function computeAppHost(currentHost: string, adminHost: string): AppHost {
  const adminOrigin = `https://${adminHost}`;
  return {
    currentHost,
    adminHost,
    isAdminHost: currentHost !== "" && currentHost === adminHost,
    adminOrigin,
    toAdminUrl: (path: string) => `${adminOrigin}${path}`,
  };
}

export function useAppHost(): AppHost {
  const adminHost = useRuntimeConfig().public.adminHost as string;
  const currentHost = import.meta.client ? window.location.host : "";
  return computeAppHost(currentHost, adminHost);
}
