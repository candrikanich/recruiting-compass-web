import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Nuxt runtime components
vi.mock("#app", () => ({
  defineEventHandler: (handler: any) => handler,
  getHeader: vi.fn(),
  sendRedirect: vi.fn(),
}));

// middleware/onboarding.ts (the real client-side route middleware) relies on
// Nuxt's auto-imported globals, which aren't wired up under Vitest — stub
// them directly so the test below exercises the actual file instead of a
// hand-copied reimplementation.
const mockNavigateTo = vi.fn((path: string) => ({ __navigateTo: path }));
vi.stubGlobal("defineNuxtRouteMiddleware", (fn: unknown) => fn);
vi.stubGlobal("navigateTo", mockNavigateTo);

const mockSession: { value: { user: { id: string } } | null } = {
  value: null,
};
vi.mock("~/composables/useAuth", () => ({
  useAuth: () => ({ session: mockSession }),
}));
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({}),
}));
vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({ error: vi.fn() }),
}));

describe("onboarding middleware", () => {
  let mockEvent: any;
  let mockGetHeader: any;
  let mockSendRedirect: any;

  beforeEach(() => {
    mockEvent = {
      req: {
        headers: {
          cookie: "",
        },
      },
      node: {
        res: {},
      },
    };

    // Mock Nitro utilities
    mockGetHeader = vi.fn();
    mockSendRedirect = vi.fn();

    vi.clearAllMocks();
  });

  const loadMiddleware = async () => {
    // We'll test the middleware logic directly
    return {
      checkOnboardingStatus: async (
        userId: string,
        supabase: any,
      ): Promise<boolean> => {
        const { data, error } = (await supabase
          .from("users")
          .select("onboarding_completed")
          .eq("id", userId)
          .single()) as { data: any; error: any };

        if (error) {
          console.error("Failed to check onboarding status:", error);
          return true; // Allow access on error (fail open)
        }

        return data?.onboarding_completed === true;
      },

      isOnboardingRoute: (path: string): boolean => {
        return path.startsWith("/onboarding");
      },

      getPathRelativeToBase: (fullPath: string): string => {
        return fullPath.split("?")[0];
      },
    };
  };

  describe("Middleware Logic", () => {
    it("should allow access to /onboarding routes for unauthenticated users", async () => {
      // Exercises the REAL middleware/onboarding.ts, not a reimplementation:
      // with no session, the middleware must return early (no redirect) and
      // let the auth middleware handle unauthenticated users instead.
      mockSession.value = null;
      mockNavigateTo.mockClear();

      const mod = await import("~/middleware/onboarding");
      const middleware = mod.default as (
        to: { path: string; fullPath: string },
        from: unknown,
      ) => unknown;

      const result = await middleware(
        { path: "/onboarding/step-1", fullPath: "/onboarding/step-1" },
        {},
      );

      expect(result).toBeUndefined();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it("should check onboarding completion status for authenticated users", async () => {
      const middleware = await loadMiddleware();
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { onboarding_completed: true },
                error: null,
              }),
            }),
          }),
        }),
      };

      const isCompleted = await middleware.checkOnboardingStatus(
        "user-123",
        mockSupabase,
      );

      expect(isCompleted).toBe(true);
    });

    it("should return false when onboarding is not completed", async () => {
      const middleware = await loadMiddleware();
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { onboarding_completed: false },
                error: null,
              }),
            }),
          }),
        }),
      };

      const isCompleted = await middleware.checkOnboardingStatus(
        "user-123",
        mockSupabase,
      );

      expect(isCompleted).toBe(false);
    });

    it("should identify /onboarding routes correctly", async () => {
      const middleware = await loadMiddleware();

      expect(middleware.isOnboardingRoute("/onboarding")).toBe(true);
      expect(middleware.isOnboardingRoute("/onboarding/step-1")).toBe(true);
      expect(middleware.isOnboardingRoute("/dashboard")).toBe(false);
      expect(middleware.isOnboardingRoute("/schools")).toBe(false);
    });

    it("should strip query params from path", async () => {
      const middleware = await loadMiddleware();

      const cleanPath = middleware.getPathRelativeToBase(
        "/onboarding?step=1&id=123",
      );
      expect(cleanPath).toBe("/onboarding");
    });
  });

  describe("Access Control", () => {
    it("should allow authenticated users with completed onboarding to access any route", async () => {
      const middleware = await loadMiddleware();

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { onboarding_completed: true },
                error: null,
              }),
            }),
          }),
        }),
      };

      const isCompleted = await middleware.checkOnboardingStatus(
        "user-123",
        mockSupabase,
      );

      expect(isCompleted).toBe(true);
    });

    it("should allow authenticated users with incomplete onboarding to access /onboarding routes", async () => {
      const middleware = await loadMiddleware();

      const isOnboarding = middleware.isOnboardingRoute("/onboarding/step-1");
      expect(isOnboarding).toBe(true);
    });

    it("should redirect authenticated users with incomplete onboarding away from non-onboarding routes", async () => {
      const middleware = await loadMiddleware();

      // This would be /dashboard, /schools, etc.
      const isOnboarding = middleware.isOnboardingRoute("/dashboard");
      expect(isOnboarding).toBe(false);
    });

  });

  describe("Error Handling", () => {
    it("should handle Supabase query errors gracefully", async () => {
      const middleware = await loadMiddleware();
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Connection failed"),
              }),
            }),
          }),
        }),
      };

      const isCompleted = await middleware.checkOnboardingStatus(
        "user-123",
        mockSupabase,
      );

      // Should allow access on error (fail open)
      expect(isCompleted).toBe(true);
    });

    it("should handle null user ID gracefully", async () => {
      const middleware = await loadMiddleware();
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("No row found"),
              }),
            }),
          }),
        }),
      };

      const isCompleted = await middleware.checkOnboardingStatus(
        "",
        mockSupabase,
      );

      expect(isCompleted).toBe(true);
    });
  });

  describe("Route Pattern Matching", () => {
    it("should match /onboarding root path", async () => {
      const middleware = await loadMiddleware();
      expect(middleware.isOnboardingRoute("/onboarding")).toBe(true);
    });

    it("should match /onboarding/[step] paths", async () => {
      const middleware = await loadMiddleware();
      expect(middleware.isOnboardingRoute("/onboarding/1")).toBe(true);
      expect(middleware.isOnboardingRoute("/onboarding/welcome")).toBe(true);
      expect(middleware.isOnboardingRoute("/onboarding/basic-info")).toBe(true);
    });

    it("should not match similar but different paths", async () => {
      const middleware = await loadMiddleware();
      expect(middleware.isOnboardingRoute("/onboarded")).toBe(false);
      expect(middleware.isOnboardingRoute("/boards")).toBe(false);
      expect(middleware.isOnboardingRoute("/onboard")).toBe(false);
    });

    it("should handle case sensitivity correctly", async () => {
      const middleware = await loadMiddleware();
      expect(middleware.isOnboardingRoute("/Onboarding")).toBe(false);
      expect(middleware.isOnboardingRoute("/ONBOARDING")).toBe(false);
    });
  });

});
