import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";
import type { User, Session } from "@supabase/supabase-js";

// Mock useSupabase at module level
vi.mock("~/composables/useSupabase");

// Get the mocked useSupabase function
const mockUseSupabase = vi.mocked(useSupabase);

describe("useAuth", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_metadata: { full_name: "Test User" },
    app_metadata: {},
  };

  const mockSession: Session = {
    user: mockUser,
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    expires_at: Date.now() / 1000 + 3600,
  };

  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    // Create fresh mock objects for each test
    mockAuth = {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(),
    };

    mockSupabase = {
      auth: mockAuth,
    };

    mockUseSupabase.mockReturnValue(mockSupabase);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const getMockSupabase = () => {
    return { mockSupabase, mockAuth };
  };

  describe("Initial State", () => {
    it("should return correct initial state", () => {
      getMockSupabase();

      const auth = useAuth();

      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toBe(null);
      expect(auth.isInitialized.value).toBe(false);
      expect(auth.session.value).toBe(null);
      expect(typeof auth.restoreSession).toBe("function");
      expect(typeof auth.login).toBe("function");
      expect(typeof auth.logout).toBe("function");
      expect(typeof auth.signup).toBe("function");
      expect(typeof auth.setupAuthListener).toBe("function");
    });

    it("should return readonly state refs", () => {
      getMockSupabase();

      const auth = useAuth();

      expect(auth.loading).toBeDefined();
      expect(auth.error).toBeDefined();
      expect(auth.isInitialized).toBeDefined();
      expect(auth.session).toBeDefined();
    });
  });

  describe("restoreSession", () => {
    it("should restore existing session successfully", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const auth = useAuth();
      const result = await auth.restoreSession();

      expect(mockAuth.getSession).toHaveBeenCalledTimes(1);
      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toBe(null);
      expect(auth.isInitialized.value).toBe(true);
      expect(auth.session.value).toEqual(mockSession);
      expect(result).toEqual(mockSession);
    });

    it("should handle no active session", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const auth = useAuth();
      const result = await auth.restoreSession();

      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toBe(null);
      expect(auth.isInitialized.value).toBe(true);
      expect(auth.session.value).toBe(null);
      expect(result).toBe(null);
    });

    it("should handle session fetch error", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const sessionError = new Error("Session fetch failed");
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: sessionError,
      });

      const auth = useAuth();
      const result = await auth.restoreSession();

      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toEqual(sessionError);
      expect(auth.isInitialized.value).toBe(true);
      expect(auth.session.value).toBe(null);
      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[useAuth]"),
        "[useAuth] Session restoration failed:",
        "Session fetch failed",
      );
    });

    it("should prevent redundant calls", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const auth = useAuth();

      await auth.restoreSession();
      expect(mockAuth.getSession).toHaveBeenCalledTimes(1);

      await auth.restoreSession();
      expect(mockAuth.getSession).toHaveBeenCalledTimes(1);
    });

    it("should set loading state during restore", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      let resolvePromise: (value: any) => void;
      const sessionPromise = new Promise((resolve) => {
        resolvePromise = resolve!;
      });

      mockAuth.getSession.mockReturnValue(sessionPromise);

      const auth = useAuth();
      const restorePromise = auth.restoreSession();

      expect(auth.loading.value).toBe(true);

      resolvePromise!({ data: { session: mockSession }, error: null });
      await restorePromise;

      expect(auth.loading.value).toBe(false);
    });

    it("should handle session with missing user", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.getSession.mockResolvedValue({
        data: { session: { ...mockSession, user: null } },
        error: null,
      });

      const auth = useAuth();
      const result = await auth.restoreSession();

      expect(auth.session.value).toBe(null);
      expect(auth.isInitialized.value).toBe(true);
      expect(result).toBe(null);
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const auth = useAuth();
      const result = await auth.login("test@example.com", "password123");

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toBe(null);
      expect(auth.session.value).toEqual(mockSession);
      expect(result).toEqual({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
    });

    it("should trim email before login", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const auth = useAuth();
      await auth.login("  test@example.com  ", "password123");

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should handle login error", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const loginError = new Error("Invalid login credentials");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: loginError,
      });

      const auth = useAuth();

      await expect(
        auth.login("test@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid login credentials");

      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toEqual(loginError);
      expect(auth.session.value).toBe(null);
    });

    it("should handle login without session data", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      });

      const auth = useAuth();
      const result = await auth.login("test@example.com", "password123");

      expect(auth.session.value).toBe(null);
      expect(result).toEqual({
        data: { session: null, user: null },
        error: null,
      });
    });

    it("should set loading state during login", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      let resolvePromise: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolvePromise = resolve!;
      });

      mockAuth.signInWithPassword.mockReturnValue(loginPromise);

      const auth = useAuth();
      const loginCall = auth.login("test@example.com", "password123");

      expect(auth.loading.value).toBe(true);

      resolvePromise!({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      await loginCall;

      expect(auth.loading.value).toBe(false);
    });

    it("should forward captchaToken to Supabase when provided", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const auth = useAuth();
      await auth.login(
        "test@example.com",
        "password123",
        false,
        "turnstile-token-abc",
      );

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: { captchaToken: "turnstile-token-abc" },
      });
    });

    it("should omit options when no captchaToken provided", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const auth = useAuth();
      await auth.login("test@example.com", "password123");

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  describe("logout", () => {
    beforeEach(() => {
      const { mockSupabase } = getMockSupabase();
      const auth = useAuth();
      // @ts-ignore - Set internal state for testing
      auth.session.value = mockSession;
      // @ts-ignore - Set internal state for testing
      auth.isInitialized.value = true;
    });

    it("should logout successfully", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signOut.mockResolvedValue({ error: null });

      const auth = useAuth();
      await auth.logout();

      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toBe(null);
      expect(auth.session.value).toBe(null);
      expect(auth.isInitialized.value).toBe(false);
    });

    it("should handle logout error", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const logoutError = new Error("Logout failed");
      mockAuth.signOut.mockResolvedValue({ error: logoutError });

      const auth = useAuth();

      // Set initial session first
      // @ts-ignore - Set internal state for testing
      auth.session.value = mockSession;
      // @ts-ignore - Set internal state for testing
      auth.isInitialized.value = true;

      await expect(auth.logout()).rejects.toThrow("Logout failed");

      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toEqual(logoutError);
      // Session should be cleared even on error
      expect(auth.session.value).toBe(null);
    });

    it("should set loading state during logout", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      let resolvePromise: (value: any) => void;
      const logoutPromise = new Promise((resolve) => {
        resolvePromise = resolve!;
      });

      mockAuth.signOut.mockReturnValue(logoutPromise);

      const auth = useAuth();
      const logoutCall = auth.logout();

      expect(auth.loading.value).toBe(true);

      resolvePromise!({ error: null });
      await logoutCall;

      expect(auth.loading.value).toBe(false);
    });
  });

  describe("signup", () => {
    it("should signup successfully with minimal data", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      const result = await auth.signup("new@example.com", "password123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ email: "new@example.com" }),
        }),
      );
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
      });
      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toBe(null);
      expect(result.data.session).toEqual(mockSession);
      expect(result.error).toBeNull();

      vi.unstubAllGlobals();
    });

    it("stores session_preferences after minting the post-signup session, like login() does", async () => {
      // Without this, middleware/auth.ts's expiry check reads whatever stale
      // (possibly already-expired) session_preferences entry was left in
      // localStorage from a prior session and immediately logs the brand-new
      // signup out on the next navigation with reason=timeout.
      localStorage.clear();
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      const beforeSignup = Date.now();
      await auth.signup("new@example.com", "password123");

      const storedPrefs = localStorage.getItem("session_preferences");
      expect(storedPrefs).toBeTruthy();
      const prefs = JSON.parse(storedPrefs!);
      expect(prefs.lastActivity).toBeGreaterThanOrEqual(beforeSignup);
      expect(prefs.expiresAt).toBeGreaterThan(Date.now());

      vi.unstubAllGlobals();
      localStorage.clear();
    });

    it("does not reject signup when writing session_preferences throws (e.g. storage quota/private mode)", async () => {
      // The account and session are already created by this point — a
      // localStorage failure here must be best-effort only, never surfaced
      // as a signup failure.
      localStorage.clear();
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      const auth = useAuth();
      const result = await auth.signup("new@example.com", "password123");

      expect(result.data.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(auth.error.value).toBeNull();

      setItemSpy.mockRestore();
      vi.unstubAllGlobals();
      localStorage.clear();
    });

    it("should signup with full name and role", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      const result = await auth.signup(
        "new@example.com",
        "password123",
        "John Doe",
        "parent",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            email: "new@example.com",
            password: "password123",
            fullName: "John Doe",
            role: "parent",
          }),
        }),
      );
      expect(result.data.session).toEqual(mockSession);

      vi.unstubAllGlobals();
    });

    it("should include dateOfBirth in signup metadata when provided", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      await auth.signup(
        "new@example.com",
        "password123",
        "John Doe",
        "player",
        undefined,
        "2010-01-01",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            email: "new@example.com",
            fullName: "John Doe",
            role: "player",
            dateOfBirth: "2010-01-01",
          }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it("should include pending_admin in signup metadata when requested", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      await auth.signup(
        "admin@example.com",
        "password123",
        "Admin User",
        "parent",
        undefined,
        undefined,
        true,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            email: "admin@example.com",
            fullName: "Admin User",
            role: "parent",
            metadata: expect.objectContaining({ pending_admin: true }),
          }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it("should include drafted onboarding step-1 fields in signup metadata when provided", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      await auth.signup(
        "new@example.com",
        "password123",
        "Jane Player",
        "player",
        undefined,
        undefined,
        undefined,
        {
          graduationYear: 2027,
          primarySport: "Baseball",
          gender: "male",
          zipCode: "90210",
        },
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            email: "new@example.com",
            fullName: "Jane Player",
            role: "player",
            metadata: {
              pending_graduation_year: "2027",
              pending_primary_sport: "Baseball",
              pending_gender: "male",
              pending_zip_code: "90210",
            },
          }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it("omits optional pending fields (gender, zip) when not drafted", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      await auth.signup(
        "new@example.com",
        "password123",
        "Jane Player",
        "player",
        undefined,
        undefined,
        undefined,
        { graduationYear: 2027, primarySport: "Baseball" },
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            email: "new@example.com",
            fullName: "Jane Player",
            role: "player",
            metadata: {
              pending_graduation_year: "2027",
              pending_primary_sport: "Baseball",
            },
          }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it("should trim email during signup", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      await auth.signup("  new@example.com  ", "password123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ email: "new@example.com" }),
        }),
      );
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
      });

      vi.unstubAllGlobals();
    });

    it("forwards captchaToken to the signInWithPassword call", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      await auth.signup(
        "new@example.com",
        "password123",
        undefined,
        undefined,
        "turnstile-token-abc",
      );

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: { captchaToken: "turnstile-token-abc" },
      });

      vi.unstubAllGlobals();
    });

    it("signs in with a freshly-minted captcha token when a callback is given", async () => {
      // The signup token was already consumed by /api/auth/signup's own
      // Turnstile check — replaying it would read as a duplicate to
      // Supabase's native CAPTCHA on the sign-in endpoint.
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);
      const getFresh = vi.fn(async () => "fresh-token-xyz");

      const auth = useAuth();
      await auth.signup(
        "new@example.com",
        "password123",
        undefined,
        undefined,
        "consumed-token-abc",
        undefined,
        undefined,
        undefined,
        undefined,
        getFresh,
      );

      expect(getFresh).toHaveBeenCalled();
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: { captchaToken: "fresh-token-xyz" },
      });

      vi.unstubAllGlobals();
    });

    it("omits captcha options when the fresh-token callback yields nothing", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      vi.stubGlobal(
        "$fetch",
        vi.fn(async () => ({ userId: mockUser.id })),
      );

      const auth = useAuth();
      await auth.signup(
        "new@example.com",
        "password123",
        undefined,
        undefined,
        "consumed-token-abc",
        undefined,
        undefined,
        undefined,
        undefined,
        async () => undefined,
      );

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
      });

      vi.unstubAllGlobals();
    });

    it("tags a post-signup sign-in failure as recoverable (account already created)", async () => {
      const { mockAuth } = getMockSupabase();
      const signInError = Object.assign(
        new Error(
          "captcha protection: request disallowed (no captcha_token found)",
        ),
        { name: "AuthApiError" },
      );
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: signInError,
      });
      vi.stubGlobal(
        "$fetch",
        vi.fn(async () => ({ userId: mockUser.id })),
      );

      const auth = useAuth();
      await expect(
        auth.signup(
          "new@example.com",
          "password123",
          undefined,
          undefined,
          "consumed-token-abc",
          undefined,
          undefined,
          undefined,
          undefined,
          async () => undefined,
        ),
      ).rejects.toMatchObject({ accountCreatedButSignInFailed: true });

      vi.unstubAllGlobals();
    });

    it("forwards skipVerificationEmail to the signup endpoint", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      await auth.signup(
        "new@example.com",
        "password123",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          body: expect.objectContaining({ skipVerificationEmail: true }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it("omits skipVerificationEmail from the body by default", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      await auth.signup("new@example.com", "password123");

      const body = (mockFetch.mock.calls[0] as unknown as [string, { body: Record<string, unknown> }])[1].body;
      expect(body).not.toHaveProperty("skipVerificationEmail");

      vi.unstubAllGlobals();
    });

    it("should handle signup error", async () => {
      const { mockAuth } = getMockSupabase();

      const signupError = new Error("Email already exists");
      const mockFetch = vi.fn(async () => {
        throw signupError;
      });
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();

      await expect(
        auth.signup("existing@example.com", "password123"),
      ).rejects.toThrow("Email already exists");

      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toEqual(signupError);
      expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("should set loading state during signup", async () => {
      const { mockAuth } = getMockSupabase();

      let resolvePromise: (value: any) => void;
      const signupPromise = new Promise((resolve) => {
        resolvePromise = resolve!;
      });
      const mockFetch = vi.fn(() => signupPromise);
      vi.stubGlobal("$fetch", mockFetch);
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const auth = useAuth();
      const signupCall = auth.signup("new@example.com", "password123");

      expect(auth.loading.value).toBe(true);

      resolvePromise!({ userId: mockUser.id });
      await signupCall;

      expect(auth.loading.value).toBe(false);

      vi.unstubAllGlobals();
    });
  });

  describe("setupAuthListener", () => {
    it("should set up auth state listener and return unsubscribe function", () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const mockSubscription = { unsubscribe: vi.fn() };
      mockAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const auth = useAuth();

      const callback = vi.fn();
      const unsubscribe = auth.setupAuthListener(callback);

      expect(mockAuth.onAuthStateChange).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    it("should call callback with user on auth state change", () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const mockSubscription = { unsubscribe: vi.fn() };

      let authChangeCallback: (event: string, session: Session | null) => void;
      mockAuth.onAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: mockSubscription } };
      });

      const auth = useAuth();
      const callback = vi.fn();

      auth.setupAuthListener(callback);

      authChangeCallback!("SIGNED_IN", mockSession);
      expect(callback).toHaveBeenCalledWith(mockUser);

      authChangeCallback!("SIGNED_OUT", null);
      expect(callback).toHaveBeenCalledWith(null);
    });

    it("should handle auth state change with session but no user", () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const mockSubscription = { unsubscribe: vi.fn() };

      let authChangeCallback: (event: string, session: Session | null) => void;
      mockAuth.onAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: mockSubscription } };
      });

      const auth = useAuth();
      const callback = vi.fn();

      auth.setupAuthListener(callback);

      const sessionWithoutUser = { ...mockSession, user: null } as any;
      authChangeCallback!("SIGNED_IN", sessionWithoutUser);
      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-Error objects in restoreSession", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.getSession.mockRejectedValue("String error");

      const auth = useAuth();
      await auth.restoreSession();

      expect(auth.error.value).toBeInstanceOf(Error);
      expect(auth.error.value?.message).toBe("Failed to restore session");
    });

    it("should handle non-Error objects in login", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signInWithPassword.mockRejectedValue("String error");

      const auth = useAuth();

      await expect(auth.login("test@example.com", "password")).rejects.toThrow(
        "Login failed",
      );
      expect(auth.error.value).toBeInstanceOf(Error);
      expect(auth.error.value?.message).toBe("Login failed");
    });

    it("should handle non-Error objects in logout", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signOut.mockRejectedValue("String error");

      const auth = useAuth();

      await expect(auth.logout()).rejects.toThrow("Logout failed");
      expect(auth.error.value).toBeInstanceOf(Error);
      expect(auth.error.value?.message).toBe("Logout failed");
    });

    it("should handle non-Error objects in signup", async () => {
      const mockFetch = vi.fn(async () => {
        throw "String error";
      });
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();

      await expect(auth.signup("test@example.com", "password")).rejects.toThrow(
        "Signup failed",
      );
      expect(auth.error.value).toBeInstanceOf(Error);
      expect(auth.error.value?.message).toBe("Signup failed");

      vi.unstubAllGlobals();
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent login calls", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const auth = useAuth();

      const [result1, result2] = await Promise.all([
        auth.login("test@example.com", "password"),
        auth.login("test@example.com", "password"),
      ]);

      expect(result1).toEqual({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      expect(result2).toEqual({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple auth listeners", () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const mockSubscription1 = { unsubscribe: vi.fn() };
      const mockSubscription2 = { unsubscribe: vi.fn() };

      mockAuth.onAuthStateChange
        .mockReturnValueOnce({ data: { subscription: mockSubscription1 } })
        .mockReturnValueOnce({ data: { subscription: mockSubscription2 } });

      const auth = useAuth();

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = auth.setupAuthListener(callback1);
      const unsubscribe2 = auth.setupAuthListener(callback2);

      expect(mockAuth.onAuthStateChange).toHaveBeenCalledTimes(2);

      unsubscribe1();
      unsubscribe2();

      expect(mockSubscription1.unsubscribe).toHaveBeenCalled();
      expect(mockSubscription2.unsubscribe).toHaveBeenCalled();
    });
  });

  describe("signup with role (onboarding)", () => {
    it("should include role in metadata for player signup", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      const result = await auth.signup(
        "player@example.com",
        "password123",
        "Jane Player",
        "player",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            email: "player@example.com",
            fullName: "Jane Player",
            role: "player",
          }),
        }),
      );
      expect(result.data.session).toEqual(mockSession);

      vi.unstubAllGlobals();
    });

    it("should include role in metadata for parent signup", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
      vi.stubGlobal("$fetch", mockFetch);

      const auth = useAuth();
      const result = await auth.signup(
        "parent@example.com",
        "password123",
        "John Parent",
        "parent",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            email: "parent@example.com",
            fullName: "John Parent",
            role: "parent",
          }),
        }),
      );
      expect(result.data.session).toEqual(mockSession);

      vi.unstubAllGlobals();
    });
  });
});
