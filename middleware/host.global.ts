import { getPublicRoutes } from "~/types/routes";

// Auth routes must stay reachable on the admin host too — sessions are
// per-origin, so every first login on that host happens through these paths.
// Without this allowlist, unauthenticated visits to /admin bounce to /login
// (auth middleware) which then bounces back to /admin (this middleware),
// an infinite loop. "/" is excluded: it should still redirect to /admin.
const ADMIN_HOST_PUBLIC_PATHS = getPublicRoutes().filter((p) => p !== "/");

/**
 * A loopback host (local dev / E2E) serves the admin area and the main app from
 * ONE origin — there is no separate admin subdomain to bounce to. Detect it so
 * we can skip all cross-host redirects there.
 */
function isLoopbackHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]")
  );
}

export function resolveHostRedirect(
  host: string,
  path: string,
  adminHost: string,
): { type: "external"; to: string } | { type: "internal"; to: string } | null {
  if (host === "") return null;

  // On a loopback host, admin and main share the origin: never cross-redirect.
  // Without this, /admin bounces off-origin, and if adminHost is configured to
  // the loopback host every non-admin page redirects to /admin and never
  // renders (the E2E-suite-wide blank-page failure). Prod hosts are real
  // domains, so this branch never triggers there.
  if (isLoopbackHost(host)) return null;
  const onAdminHost = host === adminHost;
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");

  if (onAdminHost) {
    const isAllowed = isAdminPath || ADMIN_HOST_PUBLIC_PATHS.includes(path);
    return isAllowed ? null : { type: "internal", to: "/admin" };
  }
  // main (non-admin) host
  return isAdminPath
    ? { type: "external", to: `https://${adminHost}${path}` }
    : null;
}

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return;
  const { currentHost, adminHost } = useAppHost();
  const decision = resolveHostRedirect(currentHost, to.path, adminHost);
  if (!decision) return;
  if (decision.type === "external") {
    return navigateTo(decision.to, { external: true });
  }
  return navigateTo(decision.to);
});
