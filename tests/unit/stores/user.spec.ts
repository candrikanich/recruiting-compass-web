import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import type { User } from "~/types/models";
import { useSupabase } from "~/composables/useSupabase";

// Mock useSupabase at module level with implementation
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(),
}));

// Get the mocked useSupabase function
const mockUseSupabase = vi.mocked(useSupabase);

describe("useUserStore", () => {
  let store: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Initialize mock useSupabase for all tests
    getMockSupabase();

    // Create a fresh pinia for each test
    const pinia = createPinia();
    setActivePinia(pinia);
    store = useUserStore();

    // Reset store state manually
    store.user = null;
    store.loading = false;
    store.isAuthenticated = false;

    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  const getMockSupabase = () => {
    const mockSingle = vi.fn();
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi
      .fn()
      .mockReturnValue({ eq: mockEq, single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    const mockQuery = {
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      insert: mockInsert,
    };

    const mockSupabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnValue(mockQuery),
    };

    mockUseSupabase.mockReturnValue(mockSupabase);
    return { mockSupabase, mockQuery, mockSingle, mockSelect, mockEq, mockInsert };
  };

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const createMockUser = (overrides = {}): User => ({
    id: "user-123",
    email: "test@example.com",
    role: "parent",
    full_name: "Test User",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      expect(store.user).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe("Getters", () => {
    it("should return currentUser from state", () => {
      const mockUser = createMockUser();
      store.user = mockUser;

      expect(store.currentUser).toEqual(mockUser);
    });

    it("should return null for currentUser when no user", () => {
      expect(store.currentUser).toBeNull();
    });

    it("should return userRole from user", () => {
      store.user = createMockUser({ role: "student" });

      expect(store.userRole).toBe("student");
    });

    it("should return undefined for userRole when no user", () => {
      expect(store.userRole).toBeUndefined();
    });

    it("should return isLoggedIn based on isAuthenticated", () => {
      expect(store.isLoggedIn).toBe(false);

      store.isAuthenticated = true;
      expect(store.isLoggedIn).toBe(true);
    });

    it("should return true for isAthlete when role is student", () => {
      store.user = createMockUser({ role: "student" });

      expect(store.isAthlete).toBe(true);
    });

    it("should return false for isAthlete when role is not student", () => {
      store.user = createMockUser({ role: "parent" });

      expect(store.isAthlete).toBe(false);
    });

    it("should return false for isAthlete when no user", () => {
      expect(store.isAthlete).toBe(false);
    });

    it("should return true for isParent when role is parent", () => {
      store.user = createMockUser({ role: "parent" });

      expect(store.isParent).toBe(true);
    });

    it("should return false for isParent when role is not parent", () => {
      store.user = createMockUser({ role: "student" });

      expect(store.isParent).toBe(false);
    });

    it("should return false for isParent when no user", () => {
      expect(store.isParent).toBe(false);
    });
  });

  describe("initializeUser", () => {
    it("should initialize user from session", async () => {
      const mockUser = createMockUser();
      const mockSession = {
        user: { id: "user-123" },
      };

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: mockUser, error: null });

      await store.initializeUser();

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith("users");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "user-123");
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(store.loading).toBe(false);
    });

    it("should set loading state during initialization", async () => {
      const mockSession = { user: { id: "user-123" } };
      const mockUser = createMockUser();

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: mockUser, error: null }), 100),
          ),
      );

      const initPromise = store.initializeUser();
      expect(store.loading).toBe(true);

      await initPromise;
      expect(store.loading).toBe(false);
    });

    it("should handle no active session", async () => {
      const { mockSupabase } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      await store.initializeUser();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should handle error fetching user profile", async () => {
      const mockSession = {
        user: { id: "user-123", email: "test@example.com" },
      };

      const { mockSupabase, mockSingle, mockSelect } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      // First call to single() returns null (no profile found)
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      await store.initializeUser();

      // Should handle null data as "not found" and create a profile
      expect(store.user).not.toBeNull();
      expect(store.user?.id).toBe("user-123");
      expect(store.user?.email).toBe("test@example.com");
      expect(store.isAuthenticated).toBe(true);
      expect(store.loading).toBe(false);
    });

    it("should handle session fetch error", async () => {
      const { mockSupabase } = getMockSupabase();

      mockSupabase.auth.getSession.mockRejectedValue(
        new Error("Session error"),
      );

      await store.initializeUser();

      expect(console.error).toHaveBeenCalledWith(
        "[initializeUser] Unexpected error:",
        expect.any(Error),
      );
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it("should handle session with missing user", async () => {
      const { mockSupabase } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: null } },
      });

      await store.initializeUser();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it("should fetch parent role user", async () => {
      const parentUser = createMockUser({ role: "parent" });
      const mockSession = { user: { id: "user-123" } };

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: parentUser, error: null });

      await store.initializeUser();

      expect(store.user?.role).toBe("parent");
    });

    it("should fetch student role user", async () => {
      const studentUser = createMockUser({ role: "student" });
      const mockSession = { user: { id: "user-123" } };

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: studentUser, error: null });

      await store.initializeUser();

      expect(store.user?.role).toBe("student");
    });
  });

  describe("setUser", () => {
    it("should set user and mark as authenticated", () => {
      const mockUser = createMockUser();

      store.setUser(mockUser);

      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
    });

    it("should set user to null and mark as not authenticated", () => {
      const mockUser = createMockUser();
      store.user = mockUser;
      store.isAuthenticated = true;

      store.setUser(null);

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it("should handle truthy user object", () => {
      const mockUser = createMockUser();

      store.setUser(mockUser);

      expect(store.isAuthenticated).toBe(true);
    });

    it("should handle falsy user value", () => {
      store.setUser(null);

      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear user and authentication state", () => {
      const mockUser = createMockUser();
      store.user = mockUser;
      store.isAuthenticated = true;

      store.logout();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it("should work when already logged out", () => {
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);

      store.logout();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe("State Persistence", () => {
    it("should maintain state across multiple actions", async () => {
      const mockUser = createMockUser();

      // Set user
      store.setUser(mockUser);
      expect(store.user).toEqual(mockUser);

      // Check state persists
      expect(store.currentUser).toEqual(mockUser);
      expect(store.isLoggedIn).toBe(true);

      // Logout
      store.logout();
      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
    });

    it("should handle rapid state changes", () => {
      const user1 = createMockUser({ id: "user-1" });
      const user2 = createMockUser({ id: "user-2" });

      store.setUser(user1);
      expect(store.user?.id).toBe("user-1");

      store.setUser(user2);
      expect(store.user?.id).toBe("user-2");

      store.setUser(null);
      expect(store.user).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle user with no role", async () => {
      const userNoRole = createMockUser({ role: undefined });
      const mockSession = { user: { id: "user-123" } };

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: userNoRole, error: null });

      await store.initializeUser();

      expect(store.user?.role).toBeUndefined();
      expect(store.userRole).toBeUndefined();
    });

    it("should handle user with optional fields missing", async () => {
      const minimalUser: User = {
        id: "user-123",
        email: "test@example.com",
      };

      store.setUser(minimalUser);

      expect(store.user?.role).toBeUndefined();
      expect(store.user?.full_name).toBeUndefined();
      expect(store.user?.created_at).toBeUndefined();
    });

    it("should handle concurrent initialization calls", async () => {
      const mockSession = { user: { id: "user-123" } };
      const mockUser = createMockUser();

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: mockUser, error: null });

      // Call initializeUser multiple times concurrently
      await Promise.all([
        store.initializeUser(),
        store.initializeUser(),
        store.initializeUser(),
      ]);

      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
    });

    it("should handle malformed session data", async () => {
      const { mockSupabase } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: undefined } },
      });

      await store.initializeUser();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it("should handle database returning null for user", async () => {
      const mockSession = {
        user: { id: "user-123", email: "test@example.com" },
      };

      const { mockSupabase, mockSingle, mockSelect, mockInsert } =
        getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      // First call to single() returns null (no profile found)
      // Then insert().select() returns created user
      mockSingle.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockResolvedValueOnce({
        data: [
          {
            id: "user-123",
            email: "test@example.com",
            role: "student",
            full_name: "",
          },
        ],
        error: null,
      });

      await store.initializeUser();

      // Should create a new user profile when none exists
      expect(store.user).not.toBeNull();
      expect(store.user?.id).toBe("user-123");
      expect(store.isAuthenticated).toBe(true);
    });
  });

  describe("Integration Scenarios", () => {
    it("should simulate full login flow", async () => {
      // Start logged out
      expect(store.isLoggedIn).toBe(false);

      // User logs in and setUser is called
      const mockUser = createMockUser();
      store.setUser(mockUser);

      expect(store.isLoggedIn).toBe(true);
      expect(store.currentUser).toEqual(mockUser);
      expect(store.userRole).toBe("parent");

      // Page refresh - initializeUser is called
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
          user_metadata: { full_name: "Test User" },
        },
      };

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: mockUser, error: null });

      await store.initializeUser();

      expect(store.isLoggedIn).toBe(true);
      expect(store.user).toEqual(mockUser);
    });

    it("should simulate logout flow", async () => {
      // User is logged in
      const mockUser = createMockUser();
      store.setUser(mockUser);
      expect(store.isLoggedIn).toBe(true);

      // User logs out
      store.logout();

      expect(store.isLoggedIn).toBe(false);
      expect(store.user).toBeNull();
      expect(store.currentUser).toBeNull();
      expect(store.userRole).toBeUndefined();
    });

    it("should simulate session expired scenario", async () => {
      // User was logged in
      const mockUser = createMockUser();
      store.setUser(mockUser);

      // Page refresh but session expired
      const { mockSupabase } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      await store.initializeUser();

      expect(store.isLoggedIn).toBe(false);
      expect(store.user).toBeNull();
    });
  });

  describe("Type Safety", () => {
    it("should accept valid user object", () => {
      const validUser: User = {
        id: "user-123",
        email: "test@example.com",
        role: "parent",
        full_name: "Test User",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      store.setUser(validUser);
      expect(store.user).toEqual(validUser);
    });

    it("should accept user with minimal fields", () => {
      const minimalUser: User = {
        id: "user-123",
        email: "test@example.com",
      };

      store.setUser(minimalUser);
      expect(store.user).toEqual(minimalUser);
    });

    it("should accept null", () => {
      store.setUser(null);
      expect(store.user).toBeNull();
    });
  });

  describe("Email Verification Status", () => {
    it("should initialize isEmailVerified from session", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
          email_confirmed_at: "2024-01-02T00:00:00Z",
        },
      };
      const mockUser = createMockUser();

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: mockUser, error: null });

      await store.initializeUser();

      expect(store.isEmailVerified).toBe(true);
    });

    it("should set isEmailVerified to false for unverified email", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
          email_confirmed_at: null,
        },
      };
      const mockUser = createMockUser();

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: mockUser, error: null });

      await store.initializeUser();

      expect(store.isEmailVerified).toBe(false);
    });

    it("emailVerified getter should return verification status", () => {
      store.isEmailVerified = true;
      expect(store.emailVerified).toBe(true);

      store.isEmailVerified = false;
      expect(store.emailVerified).toBe(false);
    });

    it("should refresh verification status from auth", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-02T00:00:00Z",
      };

      const { mockSupabase } = getMockSupabase();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      store.isEmailVerified = false;
      await store.refreshVerificationStatus();

      expect(store.isEmailVerified).toBe(true);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it("should handle unverified email in refreshVerificationStatus", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: null,
      };

      const { mockSupabase } = getMockSupabase();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      store.isEmailVerified = true;
      await store.refreshVerificationStatus();

      expect(store.isEmailVerified).toBe(false);
    });

    it("should handle error in refreshVerificationStatus", async () => {
      const { mockSupabase } = getMockSupabase();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth error"),
      });

      store.isEmailVerified = true;
      await store.refreshVerificationStatus();

      // Should not change on error
      expect(store.isEmailVerified).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    it("should clear email verification status on logout", () => {
      store.isEmailVerified = true;
      store.user = createMockUser();
      store.isAuthenticated = true;

      store.logout();

      expect(store.isEmailVerified).toBe(false);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it("should handle undefined email_confirmed_at as unverified", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
          email_confirmed_at: undefined,
        },
      };
      const mockUser = createMockUser();

      const { mockSupabase, mockQuery } = getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      mockQuery.single.mockResolvedValue({ data: mockUser, error: null });

      await store.initializeUser();

      expect(store.isEmailVerified).toBe(false);
    });
  });
});
