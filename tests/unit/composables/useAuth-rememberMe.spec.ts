import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAuth } from "~/composables/useAuth";
import { mockSupabase } from "~/tests/setup";
import type { User, Session } from "@supabase/supabase-js";
import type { SessionPreferences } from "~/types/session";

describe("useAuth - Remember Me Functionality", () => {
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
    localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Configure global mock auth methods with proper return values
    mockSupabase.auth.getSession.mockClear().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabase.auth.signInWithPassword.mockClear().mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });
    mockSupabase.auth.signOut.mockClear().mockResolvedValue({
      error: null,
    });
    mockSupabase.auth.signUp.mockClear().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    mockSupabase.auth.onAuthStateChange.mockClear().mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Login with Remember Me", () => {
    it("should store session preferences with 30-day expiry when rememberMe is true", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const auth = useAuth();
      const beforeLogin = Date.now();

      await auth.login("test@example.com", "password123", true);

      const storedPrefs = localStorage.getItem("session_preferences");
      expect(storedPrefs).toBeTruthy();

      const prefs = JSON.parse(storedPrefs!) as SessionPreferences;
      expect(prefs.rememberMe).toBe(true);
      expect(prefs.lastActivity).toBeGreaterThanOrEqual(beforeLogin);

      // 30 days in milliseconds
      const expectedExpiry = 30 * 24 * 60 * 60 * 1000;
      const actualExpiry = prefs.expiresAt - prefs.lastActivity;

      // Allow 1 second tolerance for test execution
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it("should store session preferences with 1-day expiry when rememberMe is false", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const auth = useAuth();
      const beforeLogin = Date.now();

      await auth.login("test@example.com", "password123", false);

      const storedPrefs = localStorage.getItem("session_preferences");
      expect(storedPrefs).toBeTruthy();

      const prefs = JSON.parse(storedPrefs!) as SessionPreferences;
      expect(prefs.rememberMe).toBe(false);
      expect(prefs.lastActivity).toBeGreaterThanOrEqual(beforeLogin);

      // 1 day in milliseconds
      const expectedExpiry = 24 * 60 * 60 * 1000;
      const actualExpiry = prefs.expiresAt - prefs.lastActivity;

      // Allow 1 second tolerance for test execution
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it("should default to rememberMe false when not provided", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const auth = useAuth();

      await auth.login("test@example.com", "password123");

      const storedPrefs = localStorage.getItem("session_preferences");
      const prefs = JSON.parse(storedPrefs!) as SessionPreferences;

      expect(prefs.rememberMe).toBe(false);
    });

    it("should update lastActivity timestamp on login", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const auth = useAuth();
      const loginTime = Date.now();

      await auth.login("test@example.com", "password123", true);

      const storedPrefs = localStorage.getItem("session_preferences");
      const prefs = JSON.parse(storedPrefs!) as SessionPreferences;

      expect(prefs.lastActivity).toBeGreaterThanOrEqual(loginTime);
      expect(prefs.lastActivity).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("Logout Clears Session Preferences", () => {
    it("should remove session_preferences from localStorage on logout", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const auth = useAuth();

      // Login first to store preferences
      await auth.login("test@example.com", "password123", true);
      expect(localStorage.getItem("session_preferences")).toBeTruthy();

      // Logout
      await auth.logout();

      expect(localStorage.getItem("session_preferences")).toBeNull();
    });

    it("should clear last_activity from localStorage on logout", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const auth = useAuth();

      // Simulate stored activity
      localStorage.setItem("last_activity", String(Date.now()));

      // Logout
      await auth.logout();

      expect(localStorage.getItem("last_activity")).toBeNull();
    });
  });

  describe("Session Preferences Storage Validation", () => {
    it("should handle login errors without storing preferences", async () => {
      const loginError = new Error("Invalid credentials");
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: loginError,
      });

      const auth = useAuth();

      try {
        await auth.login("test@example.com", "wrongpassword", true);
      } catch {
        // Expected to throw
      }

      expect(localStorage.getItem("session_preferences")).toBeNull();
    });

    it("should not store preferences if login returns null session", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const auth = useAuth();

      try {
        await auth.login("test@example.com", "password123", true);
      } catch {
        // Expected to throw or return error
      }

      expect(localStorage.getItem("session_preferences")).toBeNull();
    });
  });
});
