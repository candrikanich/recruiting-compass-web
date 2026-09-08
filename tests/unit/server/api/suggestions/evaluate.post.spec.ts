/**
 * POST /api/suggestions/evaluate — parent/athlete resolution (#555).
 *
 * The `assertNotParent` gate that blocked parents outright was removed:
 * family-shared profile means a parent triggering this evaluates the LINKED
 * ATHLETE's suggestions (resolveAthleteId), never their own.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

const mockRequireAuth = vi.fn();
vi.mock("~/server/utils/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockResolveAthleteId = vi.fn();
vi.mock("~/server/utils/resolveAthleteId", () => ({
  resolveAthleteId: (...args: unknown[]) => mockResolveAthleteId(...args),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockGenerateSuggestions = vi.fn(async () => ({ count: 0, ids: [] }));
vi.mock("~/server/utils/ruleEngine", () => ({
  RuleEngine: class {
    generateSuggestions = mockGenerateSuggestions;
  },
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
  };
});

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
    }) => Error & { statusCode: number };
  }
).createError = (config) => {
  const err = new Error(config.statusMessage) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(): H3Event {
  return { context: {}, node: { req: {}, res: {} } } as unknown as H3Event;
}

/** Builds a supabase stub whose queries all resolve scoped to `athleteId`. */
function mockSupabaseFor(athleteId: string) {
  return {
    from: vi.fn((table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: (field: string, value: string) => ({
              single: () =>
                value === athleteId
                  ? Promise.resolve({
                      data: { family_unit_id: "fam-1" },
                      error: null,
                    })
                  : Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      // user_preferences / schools / interactions / athlete_task /
      // video_links / events — every chained call returns the same
      // permissive builder, thenable at any depth, so both the
      // `.eq().single()` and `.eq().eq()`-awaited-directly shapes resolve.
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.single = () => Promise.resolve({ data: null, error: null });
      builder.then = (resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null });
      return builder;
    }),
  };
}

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe("POST /api/suggestions/evaluate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("a parent's request evaluates the LINKED ATHLETE's suggestions, not their own", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "parent-1",
      email: "parent@example.com",
    });
    mockResolveAthleteId.mockResolvedValue("athlete-9");

    const supabase = mockSupabaseFor("athlete-9");
    const { createServerSupabaseClient } = await import(
      "~/server/utils/supabase"
    );
    vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as never);

    const handler = (await import("~/server/api/suggestions/evaluate.post"))
      .default;
    const result = (await handler(fakeEvent())) as { generated: number };

    expect(mockResolveAthleteId).toHaveBeenCalledWith(
      "parent-1",
      expect.anything(),
    );
    expect(result.generated).toBe(0);
    // The family membership lookup — the first query the handler makes —
    // was scoped to the resolved athlete, not the raw caller (parent-1).
    expect(supabase.from).toHaveBeenCalledWith("family_members");
  });

  it("404s when the resolved athlete has no family membership", async () => {
    mockRequireAuth.mockResolvedValue({ id: "athlete-9", email: "a@t.com" });
    mockResolveAthleteId.mockResolvedValue("athlete-9");

    const supabase = mockSupabaseFor("nobody");
    const { createServerSupabaseClient } = await import(
      "~/server/utils/supabase"
    );
    vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as never);

    const handler = (await import("~/server/api/suggestions/evaluate.post"))
      .default;

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
