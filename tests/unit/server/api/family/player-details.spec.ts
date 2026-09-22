import { describe, it, expect, vi, beforeEach } from "vitest";
import { getGraduationYearOptions } from "~/utils/graduationYears";

// #913: graduationYear is now validated against getGraduationYearOptions()'s
// live range, so a hardcoded year (e.g. 2026) goes stale as real time
// passes. Derive a value that's always valid.
const VALID_GRADUATION_YEAR = getGraduationYearOptions()[0];

const mockState = {
  userId: "user-abc",
  membership: { family_unit_id: "family-123" } as object | null,
  updateError: null as object | null,
  capturedUpdate: null as Record<string, unknown> | null,
  body: {
    playerName: "Alex Johnson",
    playerDob: "2010-05-01",
    graduationYear: VALID_GRADUATION_YEAR as unknown,
    sport: "Soccer",
    position: "Midfielder",
  } as Record<string, unknown>,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
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
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockState.membership }),
            }),
          }),
        };
      }
      if (table === "family_units") {
        return {
          update: (payload: Record<string, unknown>) => {
            mockState.capturedUpdate = payload;
            return {
              eq: () => Promise.resolve({ error: mockState.updateError }),
            };
          },
        };
      }
      return {};
    },
  })),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => mockState.body),
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => {
      const err = new Error(config.statusMessage ?? config.message) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/family/player-details.post");

describe("POST /api/family/player-details", () => {
  beforeEach(() => {
    mockState.userId = "user-abc";
    mockState.membership = { family_unit_id: "family-123" };
    mockState.updateError = null;
    mockState.capturedUpdate = null;
    mockState.body = {
      playerName: "Alex Johnson",
      playerDob: "2010-05-01",
      graduationYear: VALID_GRADUATION_YEAR,
      sport: "Soccer",
      position: "Midfielder",
    };
  });

  it("saves player details to the family unit", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
  });

  it("persists playerDob (previously dropped) into pending_player_details", async () => {
    await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.capturedUpdate?.pending_player_details).toMatchObject({
      playerName: "Alex Johnson",
      playerDob: "2010-05-01",
      graduationYear: VALID_GRADUATION_YEAR,
      sport: "Soccer",
      position: "Midfielder",
    });
  });

  it("returns 403 when the user is not a family member", async () => {
    mockState.membership = null;
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 500 when the update fails", async () => {
    mockState.updateError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  describe("request body validation (Zod, #913)", () => {
    // Regression: pages/onboarding/parent.vue's <select> is a plain string
    // v-model (never v-model.number) -- the real caller always sends
    // graduationYear as a numeric-looking string, not a number.
    it("accepts graduationYear as a string (parent.vue's actual shape)", async () => {
      mockState.body.graduationYear = String(VALID_GRADUATION_YEAR);
      await handler({} as Parameters<typeof handler>[0]);
      expect(
        (mockState.capturedUpdate?.pending_player_details as Record<string, unknown>)
          ?.graduationYear,
      ).toBe(VALID_GRADUATION_YEAR);
    });

    it("rejects a graduationYear outside the valid range", async () => {
      mockState.body.graduationYear = 1999;
      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("rejects a non-numeric graduationYear string", async () => {
      mockState.body.graduationYear = "not-a-year";
      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("rejects a malformed playerDob", async () => {
      mockState.body.playerDob = "not-a-date";
      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("accepts an empty playerName (parent.vue's submit button doesn't gate on it)", async () => {
      mockState.body.playerName = "";
      const result = await handler({} as Parameters<typeof handler>[0]);
      expect(result).toMatchObject({ success: true });
    });

    it("accepts a body with only the fields parent.vue actually sends (no position/gender)", async () => {
      mockState.body = {
        playerName: "Alex Johnson",
        playerDob: "2010-05-01",
        graduationYear: String(VALID_GRADUATION_YEAR),
        sport: "Soccer",
      };
      const result = await handler({} as Parameters<typeof handler>[0]);
      expect(result).toMatchObject({ success: true });
    });
  });
});
