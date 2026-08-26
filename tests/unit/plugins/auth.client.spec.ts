import { describe, it, expect, vi, beforeEach } from "vitest";

// auth.client.ts registers a Supabase onAuthStateChange listener that must
// route the user back to /login (via userStore.logout + resetAppState) when
// the session ends — including when Supabase signs the user out locally
// after failing to refresh an invalid/expired refresh token
// ("AuthApiError: Invalid Refresh Token: Refresh Token Not Found").

vi.mock("#app", () => ({
  defineNuxtPlugin: (fn: (ctx: unknown) => unknown) => fn,
}));

let authStateCallback: (event: string) => void = () => {};
const mockOnAuthStateChange = vi.fn((cb: (event: string) => void) => {
  authStateCallback = cb;
});

// useSupabase and useUserStore are Nuxt auto-imports in the source (no
// explicit import statements) — inject as globals for the test environment.
global.useSupabase = () => ({
  auth: { onAuthStateChange: mockOnAuthStateChange },
});

const mockLogout = vi.fn();
const mockInitializeUser = vi.fn();
global.useUserStore = () => ({
  logout: mockLogout,
  initializeUser: mockInitializeUser,
});

const mockResetAppState = vi.fn();
vi.mock("~/composables/useAuthLifecycle", () => ({
  resetAppState: mockResetAppState,
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

  it("does nothing on unrelated auth events", () => {
    authStateCallback("USER_UPDATED");

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockResetAppState).not.toHaveBeenCalled();
    expect(mockInitializeUser).not.toHaveBeenCalled();
  });
});
