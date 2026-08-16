export function resolveHostRedirect(
  host: string,
  path: string,
  adminHost: string,
): { type: "external"; to: string } | { type: "internal"; to: string } | null {
  if (host === "") return null;
  const onAdminHost = host === adminHost;
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");

  if (onAdminHost) {
    return isAdminPath ? null : { type: "internal", to: "/admin" };
  }
  // main (non-admin) host
  return isAdminPath
    ? { type: "external", to: `https://${adminHost}${path}` }
    : null;
}

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return;
  const adminHost = useRuntimeConfig().public.adminHost as string;
  const decision = resolveHostRedirect(window.location.host, to.path, adminHost);
  if (!decision) return;
  if (decision.type === "external") {
    return navigateTo(decision.to, { external: true });
  }
  return navigateTo(decision.to);
});
