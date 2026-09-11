import { describe, it, expect, beforeEach, vi } from "vitest";

// Captures the callback useSupabase() registers via onAuthStateChange, since
// the client is a module-level singleton — it's only ever constructed (and
// onAuthStateChange only ever called) once across this whole test file.
let authStateCallback: ((event: string, session: unknown) => void) | undefined;
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();

// useServiceStatus is a Nuxt auto-import in the source (no explicit import
// statement) — inject as a global for the test environment.
global.useServiceStatus = () => ({
  markServiceUnavailable: vi.fn(),
  markServiceAvailable: vi.fn(),
});

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: mockSignOut,
      onAuthStateChange: vi.fn((cb) => {
        authStateCallback = cb;
      }),
    },
    from: vi.fn(),
  })),
}));

// Mock Nuxt
vi.mock("#app", () => ({
  useRuntimeConfig: vi.fn(() => ({
    public: {
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "test-anon-key-12345",
    },
  })),
}));

// tests/setup.ts globally stubs this composable (returns a static mock client)
// to keep other suites off the network. This file exercises the REAL composable
// — its onAuthStateChange/TOKEN_REFRESHED handling — so undo that global mock here.
vi.unmock("~/composables/useSupabase");

import { useSupabase } from "~/composables/useSupabase";

describe("useSupabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it("should return a Supabase client", () => {
    const client = useSupabase();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("should return same instance on multiple calls", () => {
    const client1 = useSupabase();
    const client2 = useSupabase();
    expect(client1).toBe(client2);
  });

  it("clears the local session when a token refresh comes back with no session and no session is recoverable", async () => {
    // Reproduces "AuthApiError: Invalid Refresh Token: Refresh Token Not
    // Found" — Supabase reports TOKEN_REFRESHED with a null session when it
    // can't recover the stored refresh token. The composable must sign the
    // user out locally so the SIGNED_OUT listener (plugins/auth.client.ts)
    // clears app state and middleware/auth.ts redirects to /login.
    mockGetSession.mockResolvedValue({ data: { session: null } });
    useSupabase();
    expect(authStateCallback).toBeDefined();

    await authStateCallback?.("TOKEN_REFRESHED", null);

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not sign out on a successful token refresh", async () => {
    useSupabase();
    expect(authStateCallback).toBeDefined();

    await authStateCallback?.("TOKEN_REFRESHED", {
      access_token: "valid-token",
    });

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does not sign out when another tab already refreshed and a valid session is recoverable", async () => {
    // Multi-tab race: this tab's refresh attempt used an already-rotated
    // refresh token and got "Refresh Token Not Found" (TOKEN_REFRESHED,
    // null), but another tab already completed a successful refresh and
    // wrote the new session to shared localStorage. Signing out here would
    // kick the user out of a still-valid session — re-check getSession()
    // before committing to a local sign-out.
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "recovered-by-other-tab" } },
    });
    useSupabase();
    expect(authStateCallback).toBeDefined();

    await authStateCallback?.("TOKEN_REFRESHED", null);

    expect(mockGetSession).toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
