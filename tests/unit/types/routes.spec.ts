import { describe, it, expect } from "vitest";
import {
  isProtectedRoute,
  getPublicRoutes,
  getProtectedRoutes,
} from "~/types/routes";

describe("isProtectedRoute", () => {
  it("returns false for paths in PUBLIC_ROUTES", () => {
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/")).toBe(false);
  });

  it("returns true for paths matching a protected prefix", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/coaches")).toBe(true);
  });

  it("matches by prefix, not exact path", () => {
    expect(isProtectedRoute("/coaches/123/analytics")).toBe(true);
    expect(isProtectedRoute("/settings/account-linking")).toBe(true);
  });

  it("defaults to protected for unknown paths", () => {
    expect(isProtectedRoute("/some-future-route")).toBe(true);
  });
});

describe("getPublicRoutes / getProtectedRoutes", () => {
  it("expose non-empty route lists", () => {
    expect(getPublicRoutes().length).toBeGreaterThan(0);
    expect(getProtectedRoutes().length).toBeGreaterThan(0);
  });
});
