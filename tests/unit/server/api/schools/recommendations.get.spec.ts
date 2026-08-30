import { describe, it, expect, vi, beforeEach } from "vitest";

const auth = vi.hoisted(() => ({
  requireAuth: vi.fn(async () => ({ id: "caller-id", email: "a@b.com" })),
}));

const athlete = vi.hoisted(() => ({
  resolveTargetAthleteId: vi.fn(
    async (_e: unknown, callerId: string) => callerId,
  ),
}));

const assembled = vi.hoisted(() => ({
  assembleSchoolRecommendations: vi.fn(async () => ({
    recommendations: [
      {
        catalogKey: "ohio state university",
        name: "Ohio State University",
        division: "D1",
        conference: "Big Ten",
        state: "OH",
        website: "osu.edu",
        athleticsUrl: null,
        score: 70,
        reasons: ["In OH"],
      },
    ],
    signals: { homeState: "OH", gpa: 3.7, excludedCount: 0 },
  })),
}));

const cache = vi.hoisted(() => ({
  getOrSetShared: vi.fn(
    async (_key: string, _ttl: number, fetchFn: () => Promise<unknown>) => ({
      data: await fetchFn(),
      source: "origin" as const,
    }),
  ),
}));

vi.mock("~/server/utils/auth", () => ({ requireAuth: auth.requireAuth }));
vi.mock("~/server/utils/athleteAccess", () => ({
  resolveTargetAthleteId: athlete.resolveTargetAthleteId,
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({})),
}));
vi.mock("~/server/utils/assembleSchoolRecommendations", () => ({
  assembleSchoolRecommendations: assembled.assembleSchoolRecommendations,
}));
vi.mock("~/server/utils/sharedCache", () => ({
  getOrSetShared: cache.getOrSetShared,
}));
vi.mock("~/server/utils/redis", () => ({
  CACHE_KEYS: { SCHOOL_RECS: (id: string) => `rec:v1:${id}` },
  TTL: { TWO_MINUTES: 120 },
}));
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getQuery: vi.fn(),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { getQuery } from "h3";
import handler from "~/server/api/schools/recommendations.get";

describe("GET /api/schools/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.requireAuth.mockResolvedValue({ id: "caller-id", email: "a@b.com" });
    athlete.resolveTargetAthleteId.mockImplementation(
      async (_e, callerId) => callerId,
    );
    vi.mocked(getQuery).mockReturnValue({});
  });

  it("returns assembled recommendations for the caller", async () => {
    const result = await handler({} as never);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]?.name).toBe("Ohio State University");
    expect(result.cache).toBe("origin");
    expect(result.signals.homeState).toBe("OH");
  });

  it("authorizes a parent athleteId query param", async () => {
    vi.mocked(getQuery).mockReturnValue({ athleteId: "athlete-9" });
    athlete.resolveTargetAthleteId.mockResolvedValue("athlete-9");
    await handler({} as never);
    expect(athlete.resolveTargetAthleteId).toHaveBeenCalledWith(
      expect.anything(),
      "caller-id",
      "athlete-9",
    );
    expect(assembled.assembleSchoolRecommendations).toHaveBeenCalled();
  });

  it("slices the cached catalog to the requested limit", async () => {
    assembled.assembleSchoolRecommendations.mockResolvedValueOnce({
      recommendations: [
        {
          catalogKey: "a",
          name: "A",
          division: "D1",
          conference: null,
          state: "OH",
          website: null,
          athleticsUrl: null,
          score: 1,
          reasons: [],
        },
        {
          catalogKey: "b",
          name: "B",
          division: "D1",
          conference: null,
          state: "OH",
          website: null,
          athleticsUrl: null,
          score: 1,
          reasons: [],
        },
      ],
      signals: { homeState: "OH", gpa: null, excludedCount: 0 },
    });
    vi.mocked(getQuery).mockReturnValue({ limit: "1" });
    const result = await handler({} as never);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]?.name).toBe("A");
  });
});
