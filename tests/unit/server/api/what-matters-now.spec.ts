import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
  getUserRole: vi.fn(),
}));
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
  useSupabaseAdmin: vi.fn(),
}));
vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createError: vi.fn((opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    }),
    defineEventHandler: vi.fn((handler: (event: unknown) => unknown) => handler),
  };
});

/**
 * A minimal chainable Supabase stub. Each `.from(...)` chain resolves via
 * `.maybeSingle()` to the next queued result, in call order.
 */
function makeSupabaseStub(results: Array<{ data: unknown; error: unknown }>) {
  let i = 0;
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve(results[i++] ?? { data: null, error: null }),
  };
  return { from: () => chain };
}

describe("resolveViewerAthleteId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the caller unchanged for a player", async () => {
    const { getUserRole } = await import("~/server/utils/auth");
    vi.mocked(getUserRole).mockResolvedValue("player" as never);

    const { resolveViewerAthleteId } = await import("~/server/utils/athleteAccess");
    const supabase = makeSupabaseStub([]);

    const result = await resolveViewerAthleteId(supabase as never, "player-1");
    expect(result).toBe("player-1");
  });

  it("resolves a parent to the linked player in their family unit", async () => {
    const { getUserRole } = await import("~/server/utils/auth");
    vi.mocked(getUserRole).mockResolvedValue("parent" as never);

    const { resolveViewerAthleteId } = await import("~/server/utils/athleteAccess");
    const supabase = makeSupabaseStub([
      { data: { family_unit_id: "unit-1" }, error: null },
      { data: { user_id: "player-9" }, error: null },
    ]);

    const result = await resolveViewerAthleteId(supabase as never, "parent-1");
    expect(result).toBe("player-9");
  });

  it("falls back to the parent when no player is linked", async () => {
    const { getUserRole } = await import("~/server/utils/auth");
    vi.mocked(getUserRole).mockResolvedValue("parent" as never);

    const { resolveViewerAthleteId } = await import("~/server/utils/athleteAccess");
    const supabase = makeSupabaseStub([
      { data: { family_unit_id: "unit-1" }, error: null },
      { data: null, error: null },
    ]);

    const result = await resolveViewerAthleteId(supabase as never, "parent-1");
    expect(result).toBe("parent-1");
  });
});

describe("GET /api/athlete/what-matters-now", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * A per-table Supabase stub. Each `.from(table)` returns a builder that is
   * both awaitable (for `await from().select().eq(...)`) and terminable via
   * `.maybeSingle()`, resolving to the result queued for that table.
   */
  function makeSupabase(byTable: Record<string, { data: unknown; error: unknown }>) {
    return {
      from(table: string) {
        const result = byTable[table] ?? { data: null, error: null };
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: () => Promise.resolve(result),
          then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
        };
        return builder;
      },
    };
  }

  it("returns the highest-priority current-grade task for the athlete", async () => {
    const { requireAuth, getUserRole } = await import("~/server/utils/auth");
    const { createServerSupabaseClient } = await import("~/server/utils/supabase");
    vi.mocked(requireAuth).mockResolvedValue({ id: "player-1" } as never);
    vi.mocked(getUserRole).mockResolvedValue("player" as never);

    vi.mocked(createServerSupabaseClient).mockReturnValue(
      makeSupabase({
        users: { data: { current_phase: "junior" }, error: null },
        task: {
          data: [
            {
              id: "task-sat",
              category: "academic-standing",
              grade_level: 11,
              title: "Take official SAT or ACT",
              required: true,
              dependency_task_ids: [],
              why_it_matters: "Scores drive eligibility.",
            },
            {
              id: "task-coach",
              category: "communication",
              grade_level: 11,
              title: "Increase Coach Communications Cadence",
              required: true,
              dependency_task_ids: [],
              why_it_matters: "Stay on coaches' radar.",
            },
          ],
          error: null,
        },
        // one unrelated task completed — exercises the completion-status merge
        athlete_task: {
          data: [{ task_id: "task-other", status: "completed" }],
          error: null,
        },
      }) as never,
    );

    const { default: handler } = await import(
      "~/server/api/athlete/what-matters-now.get"
    );
    const result = await handler({
      context: {},
      node: { req: { headers: {} }, res: {} },
    } as never);

    expect(Array.isArray(result)).toBe(true);
    // academic-standing (priority 10) beats communication (priority 8)
    expect(result[0].taskId).toBe("task-sat");
    expect(result[0].title).toBe("Take official SAT or ACT");
  });

  it("rejects unauthenticated requests with 401", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const { createServerSupabaseClient } = await import("~/server/utils/supabase");
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );

    const { default: handler } = await import(
      "~/server/api/athlete/what-matters-now.get"
    );
    const mockEvent = {
      context: {},
      node: { req: { headers: {} }, res: {} },
    } as never;

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
