import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useSupabase } from "~/composables/useSupabase";
import type { User, Session } from "@supabase/supabase-js";
import { setActivePinia, createPinia } from "pinia";

// Mock useSupabase at module level
vi.mock("~/composables/useSupabase");

// Get the mocked useSupabase function
const mockUseSupabase = vi.mocked(useSupabase);

describe("Login Flow Integration (useAuth + User Store)", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Create fresh Pinia instance for each test
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getMockSupabase = () => {
    const mockAuth = {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(),
    };

    // Create complete mock chain for database operations
    const mockSingle = vi.fn();
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockInsert = vi.fn(() => ({ select: vi.fn() }));
    const mockFrom = vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: mockSelect,
          insert: mockInsert,
        };
      }
      return { select: mockSelect };
    });

    const mockSupabase = {
      auth: mockAuth,
      from: mockFrom,
    };

    mockUseSupabase.mockReturnValue(mockSupabase);

    return {
      mockSupabase,
      mockAuth,
      mockFrom,
      mockSelect,
      mockEq,
      mockSingle,
      mockInsert,
    };
  };

  describe("Successful Login Flow", () => {
    it("should integrate useAuth login with user store initialization", async () => {
      const { mockSupabase, mockAuth, mockSingle } = getMockSupabase();

      // Mock successful login
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      // Mock session fetch after login
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock user profile fetch
      mockSingle.mockResolvedValue({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          full_name: "Test User",
          role: "student",
        },
        error: null,
      });

      const auth = useAuth();
      const userStore = useUserStore();

      // Initial state
      expect(userStore.user).toBe(null);
      expect(userStore.isAuthenticated).toBe(false);
      expect(userStore.loading).toBe(false);

      // Perform login
      const loginResult = await auth.login("test@example.com", "password123");

      // Verify login result
      expect(loginResult.data.session).toEqual(mockSession);
      expect(loginResult.data.user).toEqual(mockUser);

      // Initialize user store after successful login
      await userStore.initializeUser();

      // Verify user store is updated
      expect(userStore.isAuthenticated).toBe(true);
      expect(userStore.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        full_name: "Test User",
        role: "student",
      });
      expect(userStore.loading).toBe(false);

      // Verify auth state consistency
      expect(auth.session.value).toEqual(mockSession);
    });

    it("should handle session restoration with user store integration", async () => {
      const { mockSupabase, mockAuth, mockSingle } = getMockSupabase();

      // Mock existing session
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock user profile fetch
      mockSingle.mockResolvedValue({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          full_name: "Test User",
          role: "student",
        },
        error: null,
      });

      const auth = useAuth();
      const userStore = useUserStore();

      // Restore session
      const sessionResult = await auth.restoreSession();
      expect(sessionResult).toEqual(mockSession);

      // Initialize user store
      await userStore.initializeUser();

      // Verify both auth and user store are in sync
      expect(auth.session.value).toEqual(mockSession);
      expect(auth.isInitialized.value).toBe(true);
      expect(userStore.isAuthenticated).toBe(true);
      expect(userStore.user?.id).toBe(mockUser.id);
    });
  });

  describe("Logout Flow Integration", () => {
    it("should sync logout across auth composable and user store", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      // Mock successful logout
      mockAuth.signOut.mockResolvedValue({ error: null });

      const auth = useAuth();
      const userStore = useUserStore();

      // Mock initial session instead of setting internal state
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Initialize auth with session
      await auth.restoreSession();

      // Initialize user store
      await userStore.initializeUser();

      // Verify initial state
      expect(auth.session.value).toEqual(mockSession);
      expect(userStore.isAuthenticated).toBe(true);
      expect(userStore.user).not.toBeNull();

      // Perform logout
      await auth.logout();

      // Verify auth composable state
      expect(auth.session.value).toBe(null);
      expect(auth.isInitialized.value).toBe(false);

      // Sync user store logout
      userStore.logout();

      // Verify user store state
      expect(userStore.isAuthenticated).toBe(false);
      expect(userStore.user).toBe(null);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle login failure and keep user store in unauthenticated state", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      const loginError = new Error("Invalid credentials");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: loginError,
      });

      const auth = useAuth();
      const userStore = useUserStore();

      // Attempt login
      await expect(
        auth.login("wrong@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid credentials");

      // Verify auth state
      expect(auth.session.value).toBe(null);
      expect(auth.error.value).toEqual(loginError);

      // Verify user store remains unauthenticated
      expect(userStore.isAuthenticated).toBe(false);
      expect(userStore.user).toBe(null);
      expect(userStore.loading).toBe(false);
    });

    it("should handle user store initialization failure gracefully", async () => {
      const { mockSupabase, mockAuth } = getMockSupabase();

      // Mock successful session
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock database failure
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockRejectedValue(new Error("Database error"));

      mockSupabase.from = mockFrom;
      mockFrom.select = mockSelect;
      mockSelect.eq = mockEq;
      mockEq.single = mockSingle;

      const auth = useAuth();
      const userStore = useUserStore();

      // Restore session successfully
      await auth.restoreSession();
      expect(auth.session.value).toEqual(mockSession);

      // Initialize user store should handle database error gracefully
      await userStore.initializeUser();

      // User store should handle error and set user based on session
      expect(userStore.loading).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        "Profile not found, creating one:",
        expect.any(Error),
      );
    });
  });

  describe("Signup Flow Integration", () => {
    it("should integrate signup with user store initialization", async () => {
      const { mockSupabase, mockAuth, mockSingle } = getMockSupabase();

      // Mock successful signup
      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null }, // Email confirmation required
        error: null,
      });

      // Mock session after email confirmation (simulated)
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock user profile creation
      mockSingle.mockResolvedValue({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          full_name: "Test User",
          role: "student",
        },
        error: null,
      });

      const auth = useAuth();
      const userStore = useUserStore();

      // Perform signup
      const signupResult = await auth.signup(
        "new@example.com",
        "password123",
        "Test User",
        "student",
      );

      // Verify signup
      expect(signupResult.user).toEqual(mockUser);
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: {
          data: {
            full_name: "Test User",
            role: "student",
          },
        },
      });

      // Simulate session after email confirmation
      await auth.restoreSession();
      await userStore.initializeUser();

      // Verify user store state
      expect(userStore.isAuthenticated).toBe(true);
      expect(userStore.user?.email).toBe("test@example.com");
    });
  });

  describe("Auth State Change Integration", () => {
    it("should sync auth state changes with user store", async () => {
      const { mockSupabase, mockAuth, mockSingle } = getMockSupabase();

      // Mock auth state change subscription
      const mockSubscription = { unsubscribe: vi.fn() };

      let authChangeCallback: (event: string, session: Session | null) => void;
      mockAuth.onAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: mockSubscription } };
      });

      // Mock user profile for when user signs in
      mockSingle.mockResolvedValue({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          full_name: "Test User",
          role: "student",
        },
        error: null,
      });

      // Mock session fetch
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const auth = useAuth();
      const userStore = useUserStore();

      // Set up auth listener
      auth.setupAuthListener(async (user) => {
        if (user) {
          await userStore.initializeUser();
        } else {
          userStore.logout();
        }
      });

      // Simulate user signing in
      authChangeCallback!("SIGNED_IN", mockSession);
      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow async operations

      // Verify user store is updated
      expect(userStore.isAuthenticated).toBe(true);
      expect(userStore.user?.id).toBe(mockUser.id);

      // Simulate user signing out
      authChangeCallback!("SIGNED_OUT", null);

      // Verify user store is cleared
      expect(userStore.isAuthenticated).toBe(false);
      expect(userStore.user).toBe(null);

      // Cleanup
      mockSubscription.unsubscribe();
    });
  });

  describe("Loading State Coordination", () => {
    it("should coordinate loading states between auth and user store", async () => {
      const { mockSupabase, mockAuth, mockSingle } = getMockSupabase();

      // Mock slow operations
      let resolveSession: (value: any) => void;
      const sessionPromise = new Promise((resolve) => {
        resolveSession = resolve!;
      });

      let resolveProfile: (value: any) => void;
      const profilePromise = new Promise((resolve) => {
        resolveProfile = resolve!;
      });

      mockAuth.getSession.mockReturnValue(sessionPromise);
      mockSingle.mockReturnValue(profilePromise);

      const auth = useAuth();
      const userStore = useUserStore();

      // Start operations in parallel
      const authPromise = auth.restoreSession();
      const userStorePromise = userStore.initializeUser();

      // Check loading states during operations
      expect(auth.loading.value).toBe(true);
      expect(userStore.loading).toBe(true);

      // Resolve auth operation
      resolveSession!({ data: { session: mockSession }, error: null });
      await authPromise;

      // Auth loading should be done, user store still loading
      expect(auth.loading.value).toBe(false);
      expect(userStore.loading).toBe(true);

      // Resolve user profile
      resolveProfile!({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          full_name: "Test User",
          role: "student",
        },
        error: null,
      });
      await userStorePromise;

      // Both should be done loading
      expect(auth.loading.value).toBe(false);
      expect(userStore.loading).toBe(false);
    });
  });
});
