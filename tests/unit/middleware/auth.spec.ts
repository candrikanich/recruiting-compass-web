import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// middleware/auth.ts relies on Nuxt's auto-imported globals (unimport), which
// aren't wired up under Vitest — stub them directly.
const mockUserStore = {
  isAuthenticated: false,
  logout: vi.fn(),
};
const mockNavigateTo = vi.fn((to: string) => ({ __navigateTo: to }));

vi.stubGlobal("defineNuxtRouteMiddleware", (fn: unknown) => fn);
vi.stubGlobal("useUserStore", () => mockUserStore);
vi.stubGlobal("navigateTo", mockNavigateTo);

const mockLogoutEverywhere = vi.fn().mockResolvedValue(undefined);
vi.mock("~/composables/useAuthLifecycle", () => ({
  useAuthLifecycle: () => ({ logoutEverywhere: mockLogoutEverywhere }),
}));

describe("middleware/auth.ts", () => {
  let originalProcessClient: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUserStore.isAuthenticated = false;
    // Nuxt sets process.client / process.server at build time; simulate client.
    originalProcessClient = (process as unknown as { client?: boolean })
      .client;
    (process as unknown as { client: boolean }).client = true;
    (process as unknown as { server: boolean }).server = false;
  });

  afterEach(() => {
    (process as unknown as { client?: boolean }).client =
      originalProcessClient as boolean | undefined;
  });

  const runMiddleware = async (path = "/dashboard") => {
    const mod = await import("~/middleware/auth");
    const middleware = mod.default as (
      to: { path: string; fullPath: string },
      from: unknown,
    ) => unknown;
    return middleware({ path, fullPath: path }, {});
  };

  it("does not log out when no session_preferences are stored", async () => {
    await runMiddleware();
    expect(mockLogoutEverywhere).not.toHaveBeenCalled();
  });

  it("logs out via the orchestrator when the stored expiresAt is in the past", async () => {
    localStorage.setItem(
      "session_preferences",
      JSON.stringify({
        rememberMe: false,
        lastActivity: Date.now() - 1000,
        expiresAt: Date.now() - 1, // already expired
      }),
    );

    const result = await runMiddleware("/dashboard");

    expect(mockLogoutEverywhere).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("session_preferences")).toBeNull();
    expect(mockNavigateTo).toHaveBeenCalledWith("/login?reason=timeout");
    expect(result).toEqual({ __navigateTo: "/login?reason=timeout" });
  });

  it("does NOT log out a non-remember-me session that is still within its 1-day expiry", async () => {
    // Regression guard for the bug this phase fixes: middleware/auth.ts used
    // to hardcode a 30-day window and never read expiresAt, so a "1 day"
    // (rememberMe: false) session incorrectly lasted 30 days. A session that
    // is ~12 hours old (well under its 1-day expiresAt) must NOT be treated
    // as expired.
    const now = Date.now();
    localStorage.setItem(
      "session_preferences",
      JSON.stringify({
        rememberMe: false,
        lastActivity: now - 12 * 60 * 60 * 1000,
        expiresAt: now + 12 * 60 * 60 * 1000, // 12h remaining on the 1-day window
      }),
    );

    await runMiddleware("/dashboard");

    expect(mockLogoutEverywhere).not.toHaveBeenCalled();
    expect(localStorage.getItem("session_preferences")).not.toBeNull();
  });

  it("logs out a non-remember-me session once its 1-day expiresAt has passed, even though it is under 30 days old", async () => {
    // The old hardcoded-30-day check would have kept this session alive.
    const now = Date.now();
    localStorage.setItem(
      "session_preferences",
      JSON.stringify({
        rememberMe: false,
        lastActivity: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        expiresAt: now - 1 * 24 * 60 * 60 * 1000, // expired 1 day ago
      }),
    );

    await runMiddleware("/dashboard");

    expect(mockLogoutEverywhere).toHaveBeenCalledTimes(1);
  });

  it("honors a remember-me session's 30-day expiresAt", async () => {
    const now = Date.now();
    localStorage.setItem(
      "session_preferences",
      JSON.stringify({
        rememberMe: true,
        lastActivity: now - 20 * 24 * 60 * 60 * 1000,
        expiresAt: now + 10 * 24 * 60 * 60 * 1000, // 10 days remaining
      }),
    );

    await runMiddleware("/dashboard");

    expect(mockLogoutEverywhere).not.toHaveBeenCalled();
  });

  it("treats malformed session_preferences (missing expiresAt) as expired", async () => {
    localStorage.setItem(
      "session_preferences",
      JSON.stringify({ rememberMe: false, lastActivity: Date.now() }),
    );

    await runMiddleware("/dashboard");

    expect(mockLogoutEverywhere).toHaveBeenCalledTimes(1);
  });

  it("does not redirect to /login again if already on /login", async () => {
    localStorage.setItem(
      "session_preferences",
      JSON.stringify({
        rememberMe: false,
        lastActivity: Date.now() - 1000,
        expiresAt: Date.now() - 1,
      }),
    );

    await runMiddleware("/login");

    expect(mockLogoutEverywhere).toHaveBeenCalledTimes(1);
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users away from protected routes", async () => {
    mockUserStore.isAuthenticated = false;
    await runMiddleware("/dashboard");
    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.stringContaining("/login?redirect="),
    );
  });

  it("allows authenticated users through to protected routes", async () => {
    mockUserStore.isAuthenticated = true;
    const result = await runMiddleware("/dashboard");
    expect(result).toBeUndefined();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
