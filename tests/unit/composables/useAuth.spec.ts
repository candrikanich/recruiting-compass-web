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
    vi.restoreAllMocks();
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
      expect(auth.isInitialized.value).toBe(false);
      expect(auth.session.value).toBe(null);
      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
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
      const { mockSupabase, mockAuth } = getMockSupabase();

      const signupData = { user: mockUser, session: mockSession };
      mockAuth.signUp.mockResolvedValue({ data: signupData, error: null });

      const auth = useAuth();
      const result = await auth.signup("new@example.com", "password123");

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
      });
      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toBe(null);
      expect(result).toEqual(signupData);
    });

    it("should signup with full name and role", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const signupData = { user: mockUser, session: mockSession };
      mockAuth.signUp.mockResolvedValue({ data: signupData, error: null });

      const auth = useAuth();
      const result = await auth.signup(
        "new@example.com",
        "password123",
        "John Doe",
        "parent",
      );

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: {
          data: {
            full_name: "John Doe",
            role: "parent",
          },
        },
      });
      expect(result).toEqual(signupData);
    });

    it("should trim email during signup", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const signupData = { user: mockUser, session: null };
      mockAuth.signUp.mockResolvedValue({ data: signupData, error: null });

      const auth = useAuth();
      await auth.signup("  new@example.com  ", "password123");

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
      });
    });

    it("should handle signup error", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const signupError = new Error("Email already exists");
      mockAuth.signUp.mockResolvedValue({ data: null, error: signupError });

      const auth = useAuth();

      await expect(
        auth.signup("existing@example.com", "password123"),
      ).rejects.toThrow("Email already exists");

      expect(auth.loading.value).toBe(false);
      expect(auth.error.value).toEqual(signupError);
    });

    it("should set loading state during signup", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      let resolvePromise: (value: any) => void;
      const signupPromise = new Promise((resolve) => {
        resolvePromise = resolve!;
      });

      mockAuth.signUp.mockReturnValue(signupPromise);

      const auth = useAuth();
      const signupCall = auth.signup("new@example.com", "password123");

      expect(auth.loading.value).toBe(true);

      resolvePromise!({ data: { user: mockUser }, error: null });
      await signupCall;

      expect(auth.loading.value).toBe(false);
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
      const { mockSupabase, mockAuth } = getMockSupabase();

      mockAuth.signUp.mockRejectedValue("String error");

      const auth = useAuth();

      await expect(auth.signup("test@example.com", "password")).rejects.toThrow(
        "Signup failed",
      );
      expect(auth.error.value).toBeInstanceOf(Error);
      expect(auth.error.value?.message).toBe("Signup failed");
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
});
