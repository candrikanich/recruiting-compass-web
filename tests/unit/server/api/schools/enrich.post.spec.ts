/**
 * POST /api/schools/[id]/enrich — parent access (#555).
 *
 * The `assertNotParent` gate that blocked parents outright was removed:
 * enrichment merges publicly-sourced Scorecard data into the family's
 * shared school record — no athlete-owned data — so a parent can trigger
 * it the same as the athlete, scoped by family_unit_id like any other
 * school mutation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

const mockRequireAuth = vi.fn();
vi.mock("~/server/utils/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockSearchCollegeScorecard = vi.fn();
vi.mock("~/server/utils/collegeScorecard", () => ({
  searchCollegeScorecard: (...args: unknown[]) =>
    mockSearchCollegeScorecard(...args),
  scorecardToAcademicInfo: vi.fn(() => ({})),
}));

const mockReadBody = vi.fn();
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
    readBody: (...args: unknown[]) => mockReadBody(...args),
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

const VALID_ID = "11111111-1111-1111-1111-111111111111";
function fakeEvent(): H3Event {
  return {
    context: { params: { id: VALID_ID } },
    node: { req: {}, res: {} },
  } as unknown as H3Event;
}

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe("POST /api/schools/[id]/enrich", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadBody.mockResolvedValue({ schoolName: "Test University" });
    mockSearchCollegeScorecard.mockResolvedValue({ results: [] });
  });

  it("a parent's request succeeds (no assertNotParent gate) when the school belongs to their family unit", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "parent-1",
      email: "parent@example.com",
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "family_members") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { family_unit_id: "fam-1" },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === "schools") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        id: VALID_ID,
                        name: "Test University",
                        academic_info: {},
                        family_unit_id: "fam-1",
                      },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };
    const { createServerSupabaseClient } = await import(
      "~/server/utils/supabase"
    );
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      mockSupabase as never,
    );

    const handler = (await import("~/server/api/schools/[id]/enrich.post"))
      .default;
    const result = (await handler(fakeEvent())) as { success: boolean };

    expect(result.success).toBe(true);
  });

  it("404s when the school is outside the caller's family unit (unchanged ownership check)", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "parent-1",
      email: "parent@example.com",
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "family_members") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { family_unit_id: "fam-1" },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === "schools") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };
    const { createServerSupabaseClient } = await import(
      "~/server/utils/supabase"
    );
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      mockSupabase as never,
    );

    const handler = (await import("~/server/api/schools/[id]/enrich.post"))
      .default;

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
