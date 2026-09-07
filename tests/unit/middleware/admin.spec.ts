import { describe, it, expect, beforeEach, vi } from "vitest";

// middleware/admin.ts relies on Nuxt's auto-imported globals (unimport),
// which aren't wired up under Vitest — stub them directly.
const mockUserStore = {
  loading: false,
  isAuthenticated: false,
  user: null as { is_admin: boolean } | null,
};
const mockNavigateTo = vi.fn((to: string) => ({ __navigateTo: to }));

vi.stubGlobal("defineNuxtRouteMiddleware", (fn: unknown) => fn);
vi.stubGlobal("useUserStore", () => mockUserStore);
vi.stubGlobal("navigateTo", mockNavigateTo);

describe("middleware/admin.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserStore.loading = false;
    mockUserStore.isAuthenticated = false;
    mockUserStore.user = null;
  });

  const runMiddleware = async (path = "/admin") => {
    const mod = await import("~/middleware/admin");
    const middleware = mod.default as (
      to: { path: string },
      from: unknown,
    ) => unknown;
    return middleware({ path }, {});
  };

  it("ignores non-admin routes", async () => {
    const result = await runMiddleware("/dashboard");
    expect(result).toBeUndefined();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it("sends unauthenticated users to /login", async () => {
    mockUserStore.isAuthenticated = false;
    await runMiddleware("/admin");
    expect(mockNavigateTo).toHaveBeenCalledWith("/login");
  });

  it("sends an authenticated non-admin to /login?reason=not_admin, not '/'", async () => {
    // Regression guard: middleware/host.global.ts forces any non-public,
    // non-"/admin" path back to "/admin" while on the admin subdomain. This
    // middleware used to redirect a non-admin to "/", which host.global.ts
    // then bounced straight back to "/admin" — an unrecoverable client-side
    // redirect loop for any non-admin account on the admin host (confirmed
    // live: pegged a browser tab at 100%+ CPU indefinitely). "/login" is on
    // host.global.ts's admin-host public-path allowlist, so it terminates.
    mockUserStore.isAuthenticated = true;
    mockUserStore.user = { is_admin: false };

    await runMiddleware("/admin");

    expect(mockNavigateTo).toHaveBeenCalledWith("/login?reason=not_admin");
    expect(mockNavigateTo).not.toHaveBeenCalledWith("/");
  });

  it("allows an admin through", async () => {
    mockUserStore.isAuthenticated = true;
    mockUserStore.user = { is_admin: true };

    const result = await runMiddleware("/admin");

    expect(result).toBeUndefined();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
