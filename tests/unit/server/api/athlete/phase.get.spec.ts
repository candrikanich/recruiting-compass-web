import { describe, it, expect, vi, beforeEach } from "vitest";
import { H3Event } from "h3";

// Mock dependencies
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));

function createMockSupabase(graduationYear: number | null) {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  let singleCallCount = 0;
  mockSupabase.single.mockImplementation(() => {
    singleCallCount++;
    if (singleCallCount === 1) {
      // First .single() call: user_preferences (player category)
      return Promise.resolve({
        data: graduationYear
          ? { data: { graduation_year: graduationYear } }
          : null,
        error: graduationYear ? null : { code: "PGRST116" },
      });
    }
    return Promise.resolve({ data: null, error: null });
  });

  // Handle athlete_task query (no .single(), resolves as array)
  mockSupabase.eq.mockImplementation((field: string, value: unknown) => {
    if (field === "status" && value === "completed") {
      return Promise.resolve({ data: [], error: null });
    }
    return mockSupabase;
  });

  return mockSupabase;
}

describe("/api/athlete/phase.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe("Phase calculation based on graduation year", () => {
    it("should return sophomore phase for Class of 2028 in February 2026", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } = await import(
        "~/server/utils/supabase"
      );
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase(2028) as any,
      );

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      const response = await handler(mockEvent);

      expect(response.phase).toBe("sophomore");
    });

    it("should return freshman phase for Class of 2029 in February 2026", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } = await import(
        "~/server/utils/supabase"
      );
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase(2029) as any,
      );

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      const response = await handler(mockEvent);

      expect(response.phase).toBe("freshman");
    });

    it("should return junior phase for Class of 2027 in February 2026", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } = await import(
        "~/server/utils/supabase"
      );
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase(2027) as any,
      );

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      const response = await handler(mockEvent);

      expect(response.phase).toBe("junior");
    });

    it("should default to freshman when no graduation year is set", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } = await import(
        "~/server/utils/supabase"
      );
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase(null) as any,
      );

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      const response = await handler(mockEvent);

      expect(response.phase).toBe("freshman");
    });
  });
});
