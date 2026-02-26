import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-123" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn().mockReturnValue("school-uuid-1"),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "~/server/utils/supabase";

// Tracks how many times `from` was called per test
let fromCallCount = 0;

/**
 * Build a mock Supabase client that routes by table name:
 *   "schools"       → first call returns schoolData, subsequent calls return fitScoreData
 *   "account_links" → returns linkData
 *
 * fitScoreData defaults to schoolData (same object) so success-path queries
 * for the fit-score SELECT return a non-null row.
 */
function makeMockSupabase(
  schoolData: { id: string; user_id: string } | null,
  linkData: { id: string } | null,
  fitScoreData?: { id: string; user_id: string; name?: string; fit_score?: number | null; fit_score_data?: unknown } | null
) {
  fromCallCount = 0;
  const resolvedFitScoreData = fitScoreData !== undefined ? fitScoreData : schoolData;

  let schoolCallCount = 0;

  const makeSingle = (data: object | null) =>
    vi.fn(() =>
      Promise.resolve({ data, error: data ? null : { message: "not found" } })
    );

  const makeChain = (data: object | null) => {
    const single = makeSingle(data);
    const eq = vi.fn(function (this: unknown) {
      return { eq, single };
    });
    return { select: vi.fn(() => ({ eq })), single };
  };

  const mockFrom = vi.fn((table: string) => {
    fromCallCount++;
    if (table === "account_links") {
      return makeChain(linkData);
    }
    // "schools" table: first call is the access-check query; subsequent calls are the fit-score data query
    schoolCallCount++;
    return makeChain(schoolCallCount === 1 ? schoolData : resolvedFitScoreData);
  });

  return { from: mockFrom };
}

describe("GET /api/schools/[id]/fit-score - access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    fromCallCount = 0;
  });

  it("returns fit score when user owns the school", async () => {
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      makeMockSupabase({ id: "school-uuid-1", user_id: "user-123" }, null) as any
    );
    const { default: handler } = await import("~/server/api/schools/[id]/fit-score.get");
    const result = await handler({} as any);
    expect(result.success).toBe(true);
    expect(result.data.schoolId).toBe("school-uuid-1");
  });

  it("allows parent access via account_links", async () => {
    // School owned by athlete, user-123 is a linked parent
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      makeMockSupabase(
        { id: "school-uuid-1", user_id: "athlete-456" },
        { id: "link-789" }
      ) as any
    );
    const { default: handler } = await import("~/server/api/schools/[id]/fit-score.get");
    const result = await handler({} as any);
    expect(result.success).toBe(true);
  });

  it("returns 404 when school not found", async () => {
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      makeMockSupabase(null, null) as any
    );
    const { default: handler } = await import("~/server/api/schools/[id]/fit-score.get");
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 404 when user has no access (not owner, no parent link)", async () => {
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      makeMockSupabase(
        { id: "school-uuid-1", user_id: "other-user" },
        null // no parent link
      ) as any
    );
    const { default: handler } = await import("~/server/api/schools/[id]/fit-score.get");
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("uses at most 2 DB queries for owner access (not 3)", async () => {
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      makeMockSupabase({ id: "school-uuid-1", user_id: "user-123" }, null) as any
    );
    const { default: handler } = await import("~/server/api/schools/[id]/fit-score.get");
    await handler({} as any);
    // 1 query for access check + 1 for fit score data = 2 total
    expect(fromCallCount).toBeLessThanOrEqual(2);
  });
});
