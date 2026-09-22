import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-1",
  athleteId: "user-1",
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/playerOwnedPreferences", () => ({
  resolveActingAthleteId: vi.fn(async () => mockState.athleteId),
}));

vi.mock("~/server/utils/notificationGenerator", () => ({
  generateOfferNotifications: vi.fn(async () => ({ count: 1, type: "offers" })),
  generateRecommendationNotifications: vi.fn(async () => ({
    count: 2,
    type: "recommendations",
  })),
  generateEventNotifications: vi.fn(async () => ({ count: 0, type: "events" })),
  generateCoachFollowupNotifications: vi.fn(async () => ({
    count: 3,
    type: "coaches",
  })),
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
  createServerSupabaseUserClient: vi.fn(() => ({})),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
  };
});

// createError is a Nuxt auto-import (unimported global) in generate.post.ts.
(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage: string;
    }) => Error & { statusCode: number };
  }
).createError = (config: { statusCode: number; statusMessage: string }) => {
  const err = new Error(config.statusMessage) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

const { default: handler } = await import(
  "~/server/api/notifications/generate.post"
);

describe("POST /api/notifications/generate", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.athleteId = "user-1";
  });

  it("aggregates generation counts across all sources", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({
      success: true,
      created: 6,
      breakdown: { offers: 1, recommendations: 2, events: 0, coaches: 3 },
    });
  });

  it("resolves a parent's call to their linked athlete before generating", async () => {
    mockState.athleteId = "player-1";
    const { generateOfferNotifications } = await import(
      "~/server/utils/notificationGenerator"
    );
    await handler({} as Parameters<typeof handler>[0]);
    expect(generateOfferNotifications).toHaveBeenCalledWith(
      "player-1",
      expect.anything(),
    );
  });

  it("propagates H3 errors from requireAuth without wrapping", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3Err = Object.assign(new Error("Unauthorized"), {
      statusCode: 401,
    });
    vi.mocked(requireAuth).mockRejectedValueOnce(h3Err);
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
