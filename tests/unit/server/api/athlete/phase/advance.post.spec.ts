import { describe, it, expect, vi, beforeEach } from "vitest";
import { H3Event } from "h3";
import {
  createMockSupabase,
  installCreateErrorPolyfill,
  freshmanMilestoneTaskRows,
} from "../phaseTestSupport";

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
  getUserRole: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/auditLog", () => ({
  logCRUD: vi.fn().mockResolvedValue(undefined),
  logError: vi.fn().mockResolvedValue(undefined),
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

const ATHLETE_ID = "athlete-under-test";

describe("/api/athlete/phase/advance.post", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization (family-shared profile — #555)", () => {
    it("a player's own request scopes to their own id, never a caller-supplied one", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth, getUserRole } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });
      vi.mocked(getUserRole).mockResolvedValue("player");

      const taskRows = freshmanMilestoneTaskRows();
      const mockSupabase = createMockSupabase({
        user: { data: { current_phase: "freshman" }, error: null },
        tasks: { data: taskRows, error: null },
        athleteTasks: {
          data: taskRows.map((t) => ({ task_id: t.id })),
          error: null,
        },
        usersUpdate: { data: null, error: null },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      const response = await handler(mockEvent());

      expect(response.success).toBe(true);
    });

    it("a parent's request advances the LINKED ATHLETE's phase, not their own (resolveAthleteId, no blocking gate)", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth, getUserRole } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: "parent-user-id",
        email: "parent@example.com",
      });
      vi.mocked(getUserRole).mockResolvedValue("parent");

      const taskRows = freshmanMilestoneTaskRows();
      const mockSupabase = createMockSupabase({
        familyMembership: { data: { family_unit_id: "fam-1" }, error: null },
        playerMember: { data: { user_id: ATHLETE_ID }, error: null },
        user: { data: { current_phase: "freshman" }, error: null },
        tasks: { data: taskRows, error: null },
        athleteTasks: {
          data: taskRows.map((t) => ({ task_id: t.id })),
          error: null,
        },
        usersUpdate: { data: null, error: null },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      const response = await handler(mockEvent());

      // The gating + advance logic only produces success: true, phase:
      // "sophomore" when the "users" row it read/wrote was the linked
      // athlete's (freshman -> sophomore, milestones complete) — a parent
      // whose own row was targeted instead would hit whatever the mock's
      // default (unconfigured) response is and fail differently.
      expect(response.success).toBe(true);
      expect(response.phase).toBe("sophomore");
      expect(mockSupabase.usersUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ current_phase: "sophomore" }),
      );
    });
  });

  describe("milestone gating", () => {
    it("rejects advancement when required milestone tasks are incomplete", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      const taskRows = freshmanMilestoneTaskRows();
      const mockSupabase = createMockSupabase({
        user: { data: { current_phase: "freshman" }, error: null },
        tasks: { data: taskRows, error: null },
        // Only 1 of 4 required freshman milestones complete
        athleteTasks: { data: [{ task_id: taskRows[0].id }], error: null },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      const response = await handler(mockEvent());

      expect(response).toEqual({
        success: false,
        phase: "freshman",
        message: "Cannot advance phase - not all milestones completed",
      });
      // Gating rejected the advance — the users row must never be written.
      expect(mockSupabase.usersUpdate).not.toHaveBeenCalled();
    });

    it("does not resolve raw milestone slugs as completed task ids (regression guard for the original bug)", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      // athlete_task.task_id values are the milestone SLUGS themselves (as if
      // seed data never carried real ids) rather than resolved task uuids —
      // this must NOT satisfy gating.
      const taskRows = freshmanMilestoneTaskRows();
      const mockSupabase = createMockSupabase({
        user: { data: { current_phase: "freshman" }, error: null },
        tasks: { data: taskRows, error: null },
        athleteTasks: {
          data: taskRows.map((t) => ({ task_id: t.slug })),
          error: null,
        },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      const response = await handler(mockEvent());

      expect(response.success).toBe(false);
      expect(mockSupabase.usersUpdate).not.toHaveBeenCalled();
    });

    it("advances when all required milestone tasks are complete", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      const taskRows = freshmanMilestoneTaskRows();
      const mockSupabase = createMockSupabase({
        user: { data: { current_phase: "freshman" }, error: null },
        tasks: { data: taskRows, error: null },
        athleteTasks: {
          data: taskRows.map((t) => ({ task_id: t.id })),
          error: null,
        },
        usersUpdate: { data: null, error: null },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      const response = await handler(mockEvent());

      expect(response.success).toBe(true);
      expect(response.phase).toBe("sophomore");
      expect(mockSupabase.usersUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ current_phase: "sophomore" }),
      );
    });

    it("falls back to the grade-derived phase (matching GET) when current_phase has never been set", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      const taskRows = freshmanMilestoneTaskRows();
      const mockSupabase = createMockSupabase({
        user: { data: { current_phase: null }, error: null },
        userPreferences: { data: null, error: null }, // no grad year -> freshman
        tasks: { data: taskRows, error: null },
        athleteTasks: {
          data: taskRows.map((t) => ({ task_id: t.id })),
          error: null,
        },
        usersUpdate: { data: null, error: null },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      const response = await handler(mockEvent());

      expect(response.success).toBe(true);
      expect(response.phase).toBe("sophomore");
    });
  });

  describe("idempotency", () => {
    it("returns a non-error, non-duplicate response when already at the final phase (committed)", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      const mockSupabase = createMockSupabase({
        user: { data: { current_phase: "committed" }, error: null },
        athleteTasks: { data: [], error: null },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      const response = await handler(mockEvent());

      expect(response).toEqual({
        success: false,
        phase: "committed",
        message: "Already at final phase",
      });
      expect(mockSupabase.usersUpdate).not.toHaveBeenCalled();
    });

    it("advancing twice in a row is safe: the second call re-evaluates gating against the new phase rather than duplicating the first advance", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      const taskRows = freshmanMilestoneTaskRows();
      // Simulate the state *after* a first successful advance: current_phase
      // is now "sophomore", and the athlete has NOT completed any
      // sophomoreToJunior milestones yet.
      const mockSupabase = createMockSupabase({
        user: { data: { current_phase: "sophomore" }, error: null },
        tasks: { data: taskRows, error: null }, // only freshman milestones seeded in this fixture
        athleteTasks: {
          data: taskRows.map((t) => ({ task_id: t.id })),
          error: null,
        },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      const response = await handler(mockEvent());

      // Re-advancing immediately is rejected by gating (sophomore's own
      // milestones aren't done) rather than silently re-applying the prior
      // freshman->sophomore transition or erroring.
      expect(response.success).toBe(false);
      expect(response.phase).toBe("sophomore");
      expect(mockSupabase.usersUpdate).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("throws 404 (not 500) when the users row is missing — deleted account must not fake-succeed or alert", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      const mockSupabase = createMockSupabase({ userMissing: true });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      await expect(handler(mockEvent())).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockSupabase.usersUpdate).not.toHaveBeenCalled();
    });

    it("throws 500 when the users.current_phase query returns an error", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      const mockSupabase = createMockSupabase({
        user: {
          data: null,
          error: { code: "42P01", message: "relation does not exist" },
        },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      await expect(handler(mockEvent())).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch user phase",
      });
    });

    it("throws 500 when the users update fails", async () => {
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = (await import("~/server/api/athlete/phase/advance.post"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: ATHLETE_ID,
        email: "athlete@example.com",
      });

      const taskRows = freshmanMilestoneTaskRows();
      const mockSupabase = createMockSupabase({
        user: { data: { current_phase: "freshman" }, error: null },
        tasks: { data: taskRows, error: null },
        athleteTasks: {
          data: taskRows.map((t) => ({ task_id: t.id })),
          error: null,
        },
        usersUpdate: {
          data: null,
          error: { code: "23505", message: "update failed" },
        },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabase as any,
      );

      await expect(handler(mockEvent())).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to update phase",
      });
    });
  });
});
