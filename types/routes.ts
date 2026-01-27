/**
 * Route protection matrix: defines which routes require authentication
 */

export type RouteProtectionLevel = "public" | "authenticated";

interface ProtectedRoute {
  path: string;
  protection: RouteProtectionLevel;
}

/**
 * Routes that do NOT require authentication
 */
const PUBLIC_ROUTES: ProtectedRoute[] = [
  { path: "/", protection: "public" },
  { path: "/login", protection: "public" },
  { path: "/signup", protection: "public" },
  { path: "/forgot-password", protection: "public" },
  { path: "/reset-password", protection: "public" },
  { path: "/verify-email", protection: "public" },
];

/**
 * Routes that DO require authentication
 * If a route is not in PUBLIC_ROUTES, it's considered protected by default
 */
const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/coaches",
  "/schools",
  "/search",
  "/analytics",
  "/documents",
  "/events",
  "/interactions",
  "/offers",
  "/performance",
  "/recommendations",
  "/reports",
  "/settings",
  "/social",
  "/notifications",
  "/tasks",
  "/timeline",
  "/activity",
  "/admin",
];

/**
 * Determines if a route requires authentication
 * @param path The route path
 * @returns true if the route requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  // Check if it's explicitly a public route
  for (const route of PUBLIC_ROUTES) {
    if (path === route.path) {
      return false;
    }
  }

  // Check if it matches a protected prefix
  for (const prefix of PROTECTED_ROUTE_PREFIXES) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }

  // Default: protect routes by default
  return true;
}

/**
 * Gets list of all public routes for reference
 */
export function getPublicRoutes(): string[] {
  return PUBLIC_ROUTES.map((r) => r.path);
}

/**
 * Gets list of all protected route prefixes for reference
 */
export function getProtectedRoutes(): string[] {
  return PROTECTED_ROUTE_PREFIXES;
}
