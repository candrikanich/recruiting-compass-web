import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { H3Event } from "h3";
import {
  createMockSupabase,
  installCreateErrorPolyfill,
  freshmanMilestoneTaskRows,
} from "./phaseTestSupport";

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

installCreateErrorPolyfill();

function mockEvent() {
  return {
    context: {},
    node: { req: {}, res: {} },
  } as H3Event;
}

describe("/api/athlete/phase.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Phase calculation: grade-derived fallback (current_phase never set)", () => {
    it("should return sophomore phase for Class of 2028 in February 2026", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: null }, error: null },
          userPreferences: {
            data: { data: { graduation_year: 2028 } },
            error: null,
          },
        }) as any,
      );

      const response = await handler(mockEvent());

      expect(response.phase).toBe("sophomore");
    });

    it("should return freshman phase for Class of 2029 in February 2026", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: null }, error: null },
          userPreferences: {
            data: { data: { graduation_year: 2029 } },
            error: null,
          },
        }) as any,
      );

      const response = await handler(mockEvent());

      expect(response.phase).toBe("freshman");
    });

    it("should return junior phase for Class of 2027 in February 2026", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: null }, error: null },
          userPreferences: {
            data: { data: { graduation_year: 2027 } },
            error: null,
          },
        }) as any,
      );

      const response = await handler(mockEvent());

      expect(response.phase).toBe("junior");
    });

    it("should default to freshman when no graduation year is set", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: null }, error: null },
          userPreferences: { data: null, error: null },
        }) as any,
      );

      const response = await handler(mockEvent());

      expect(response.phase).toBe("freshman");
    });

    it("should return senior phase for Class of 2026 in February 2026", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: null }, error: null },
          userPreferences: {
            data: { data: { graduation_year: 2026 } },
            error: null,
          },
        }) as any,
      );

      const response = await handler(mockEvent());

      expect(response.phase).toBe("senior");
    });
  });

  describe("Phase read: users.current_phase as source of truth", () => {
    it("returns the stored phase, ignoring graduation year, once the athlete has explicitly advanced", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      // Grad year 2029 alone would compute "freshman" — but current_phase is
      // already "sophomore" from a prior explicit advance, and that must win.
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: "sophomore" }, error: null },
          userPreferences: {
            data: { data: { graduation_year: 2029 } },
            error: null,
          },
        }) as any,
      );

      const response = await handler(mockEvent());

      expect(response.phase).toBe("sophomore");
    });

    it("reports nonzero milestone progress for a partially-complete athlete", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      const taskRows = freshmanMilestoneTaskRows();

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: null }, error: null },
          userPreferences: { data: null, error: null }, // -> freshman default
          tasks: { data: taskRows, error: null },
          // Athlete has completed 1 of 4 required freshman milestone tasks
          athleteTasks: {
            data: [{ task_id: taskRows[0].id }],
            error: null,
          },
        }) as any,
      );

      const response = await handler(mockEvent());

      expect(response.phase).toBe("freshman");
      expect(response.milestoneProgress.percentComplete).toBeGreaterThan(0);
      expect(response.milestoneProgress.percentComplete).toBeLessThan(100);
      expect(response.canAdvance).toBe(false);
    });

    it("reports canAdvance true once all required milestone tasks are complete", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      const taskRows = freshmanMilestoneTaskRows();

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: null }, error: null },
          userPreferences: { data: null, error: null },
          tasks: { data: taskRows, error: null },
          athleteTasks: {
            data: taskRows.map((t) => ({ task_id: t.id })),
            error: null,
          },
        }) as any,
      );

      const response = await handler(mockEvent());

      expect(response.milestoneProgress.percentComplete).toBe(100);
      expect(response.canAdvance).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("throws 500 when the users.current_phase query returns an error", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: {
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          },
        }) as any,
      );

      await expect(handler(mockEvent())).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch user phase",
      });
    });

    it("throws 500 when preferences DB query returns a non-PGRST116 error", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: null }, error: null },
          userPreferences: {
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          },
        }) as any,
      );

      await expect(handler(mockEvent())).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch player preferences",
      });
    });

    it("throws 500 when athlete_task query returns an error", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: "junior" }, error: null },
          athleteTasks: {
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          },
        }) as any,
      );

      await expect(handler(mockEvent())).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch athlete tasks",
      });
    });

    it("throws 401 when a dependency inside the try block throws an Unauthorized error", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth, getUserRole } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: "junior" }, error: null },
        }) as any,
      );
      // getUserRole is called inside the try block — throw Unauthorized from there
      vi.mocked(getUserRole).mockRejectedValue(new Error("Unauthorized"));

      await expect(handler(mockEvent())).rejects.toMatchObject({
        statusCode: 401,
        message: "Unauthorized",
      });
    });

    it("throws 500 for unexpected generic errors thrown inside the try block", async () => {
      vi.setSystemTime(new Date("2026-02-14T12:00:00Z"));

      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth, getUserRole } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase.get")).default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        createMockSupabase({
          user: { data: { current_phase: "junior" }, error: null },
        }) as any,
      );
      // getUserRole throws a non-Unauthorized, non-H3 error inside the try block
      vi.mocked(getUserRole).mockRejectedValue(
        new Error("unexpected DB failure"),
      );

      await expect(handler(mockEvent())).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch phase",
      });
    });
  });
});
