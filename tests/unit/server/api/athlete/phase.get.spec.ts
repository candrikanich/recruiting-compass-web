import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { H3Event } from "h3";

// Mock dependencies
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
  getUserRole: vi.fn().mockResolvedValue("player"),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
  };
});

// createError is a Nuxt auto-import (global) — polyfill it for the test environment
const createErrorGlobal = (config: {
  statusCode: number;
  statusMessage: string;
}) => {
  const err = new Error(config.statusMessage) as Error & { statusCode: number };
  err.statusCode = config.statusCode;
  return err;
};
(globalThis as any).createError = createErrorGlobal;

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

function createMockSupabaseWithErrors(opts: {
  prefError?: object | null;
  prefData?: object | null;
  tasksError?: object | null;
}) {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  mockSupabase.single.mockResolvedValue({
    data: opts.prefData ?? null,
    error: opts.prefError ?? null,
  });

  mockSupabase.eq.mockImplementation((field: string, value: unknown) => {
    if (field === "status" && value === "completed") {
      return Promise.resolve({
        data: opts.tasksError ? null : [],
        error: opts.tasksError ?? null,
      });
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

  afterEach(() => {
    vi.useRealTimers();
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

    it("should return senior phase for Class of 2026 in February 2026", async () => {
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
        createMockSupabase(2026) as any,
      );

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      const response = await handler(mockEvent);

      expect(response.phase).toBe("senior");
    });
  });

  describe("Error handling", () => {
    it("throws 500 when preferences DB query returns a non-PGRST116 error", async () => {
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
        createMockSupabaseWithErrors({
          prefError: { code: "42P01", message: "relation does not exist" },
        }) as any,
      );

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch player preferences",
      });
    });

    it("throws 500 when athlete_task query returns an error", async () => {
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
        createMockSupabaseWithErrors({
          prefData: { data: { graduation_year: 2027 } },
          tasksError: { code: "42P01", message: "relation does not exist" },
        }) as any,
      );

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch athlete tasks",
      });
    });

    it("throws 401 when a dependency inside the try block throws an Unauthorized error", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } = await import(
        "~/server/utils/supabase"
      );
      const { requireAuth, getUserRole } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase(2027) as any,
      );
      // getUserRole is called inside the try block — throw Unauthorized from there
      vi.mocked(getUserRole).mockRejectedValue(new Error("Unauthorized"));

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
        message: "Unauthorized",
      });
    });

    it("throws 500 for unexpected generic errors thrown inside the try block", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } = await import(
        "~/server/utils/supabase"
      );
      const { requireAuth, getUserRole } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase(2027) as any,
      );
      // getUserRole throws a non-Unauthorized, non-H3 error inside the try block
      vi.mocked(getUserRole).mockRejectedValue(new Error("unexpected DB failure"));

      const mockEvent = {
        context: {},
        node: { req: {}, res: {} },
      } as H3Event;

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch phase",
      });
    });
  });
});
