import { describe, it, expect, vi, beforeEach } from "vitest";

// auth.client.ts registers a Supabase onAuthStateChange listener that must
// route the user back to /login (via userStore.logout + resetAppState) when
// the session ends — including when Supabase signs the user out locally
// after failing to refresh an invalid/expired refresh token
// ("AuthApiError: Invalid Refresh Token: Refresh Token Not Found").

// defineNuxtPlugin is a Nuxt auto-import in the source (used bare, not imported
// from "#app") — inject it as a global that returns the plugin fn unwrapped.
global.defineNuxtPlugin = (fn: (ctx: unknown) => unknown) => fn;

type AuthSession = { user: { id: string } } | undefined;
let authStateCallback: (event: string, session?: AuthSession) => void =
  () => {};
const mockOnAuthStateChange = vi.fn(
  (cb: (event: string, session?: AuthSession) => void) => {
    authStateCallback = cb;
  },
);

// useSupabase and useUserStore are Nuxt auto-imports in the source (no
// explicit import statements) — inject as globals for the test environment.
global.useSupabase = () => ({
  auth: { onAuthStateChange: mockOnAuthStateChange },
});

const mockLogout = vi.fn();
const mockInitializeUser = vi.fn().mockResolvedValue(undefined);
global.useUserStore = () => ({
  logout: mockLogout,
  initializeUser: mockInitializeUser,
});

const mockResetAppState = vi.fn();
vi.mock("~/composables/useAuthLifecycle", () => ({
  resetAppState: mockResetAppState,
}));

const mockEnsureAccountProvisioned = vi.fn().mockResolvedValue(undefined);
vi.mock("~/composables/useAccountProvisioning", () => ({
  useAccountProvisioning: () => ({
    ensureAccountProvisioned: mockEnsureAccountProvisioned,
  }),
}));

describe("auth.client plugin", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { default: plugin } = await import("~/plugins/auth.client");
    plugin(undefined as never);
  });

  it("registers a single onAuthStateChange listener", () => {
    expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
  });

  it("logs the user out and resets app state on SIGNED_OUT", () => {
    // This is the path an invalid/missing refresh token takes: Supabase
    // emits SIGNED_OUT after failing to recover the session, which must
    // clear local state so middleware/auth.ts redirects to /login.
    authStateCallback("SIGNED_OUT");

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockResetAppState).toHaveBeenCalledOnce();
    expect(mockInitializeUser).not.toHaveBeenCalled();
  });

  it("initializes the user on SIGNED_IN without logging out", () => {
    authStateCallback("SIGNED_IN");

    expect(mockInitializeUser).toHaveBeenCalledOnce();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockResetAppState).not.toHaveBeenCalled();
  });

  it("ensures account provisioning (family unit, pending admin) on every SIGNED_IN — not just an explicit /login submit", async () => {
    // This is the gap that used to exist: Supabase's own email-confirmation
    // link establishes a session and fires SIGNED_IN while landing on "/",
    // never on /login — provisioning must not depend on that specific page.
    const session = { user: { id: "user-123" } };
    authStateCallback("SIGNED_IN", session);
    await vi.waitFor(() => {
      expect(mockEnsureAccountProvisioned).toHaveBeenCalledWith(session.user);
    });
  });

  it("does not call ensureAccountProvisioned when SIGNED_IN fires with no session", async () => {
    authStateCallback("SIGNED_IN", undefined);
    await mockInitializeUser.mock.results[0]?.value;

    expect(mockEnsureAccountProvisioned).not.toHaveBeenCalled();
  });

  it("does nothing on unrelated auth events", () => {
    authStateCallback("USER_UPDATED");

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockResetAppState).not.toHaveBeenCalled();
    expect(mockInitializeUser).not.toHaveBeenCalled();
  });
});
