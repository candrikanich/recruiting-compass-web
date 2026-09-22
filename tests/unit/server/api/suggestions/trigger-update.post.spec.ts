import { describe, it, expect, vi, beforeEach } from "vitest";

const TEST_ATHLETE_ID = "11111111-1111-4111-8111-111111111111";
const TEST_SCHOOL_ID = "22222222-2222-4222-8222-222222222222";
const TEST_COACH_ID = "33333333-3333-4333-8333-333333333333";

const mockState = {
  body: { reason: "profile_change" } as Record<string, unknown>,
};

const trigger = vi.hoisted(() => ({
  resolveActingAthleteId: vi.fn(),
  triggerSuggestionUpdate: vi.fn(),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({})),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-id" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/playerOwnedPreferences", () => ({
  resolveActingAthleteId: trigger.resolveActingAthleteId,
}));

vi.mock("~/server/utils/triggerSuggestionUpdate", () => ({
  triggerSuggestionUpdate: trigger.triggerSuggestionUpdate,
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => mockState.body),
    createError: (opts: { statusCode: number; message?: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    },
  };
});

import handler from "~/server/api/suggestions/trigger-update.post";

const mockEvent = {} as any;

describe("POST /api/suggestions/trigger-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.body = { reason: "profile_change" };
    trigger.resolveActingAthleteId.mockResolvedValue(TEST_ATHLETE_ID);
    trigger.triggerSuggestionUpdate.mockResolvedValue({ success: true });
  });

  it("triggers an update for a valid reason", async () => {
    const result = await handler(mockEvent);

    expect(result).toEqual({ success: true });
    expect(trigger.triggerSuggestionUpdate).toHaveBeenCalledWith(
      {},
      TEST_ATHLETE_ID,
      "profile_change",
      { interactionSchoolId: undefined, interactionCoachId: undefined },
    );
  });

  it("passes through valid interactionSchoolId/interactionCoachId UUIDs", async () => {
    mockState.body = {
      reason: "interaction_logged",
      interactionSchoolId: TEST_SCHOOL_ID,
      interactionCoachId: TEST_COACH_ID,
    };

    await handler(mockEvent);

    expect(trigger.triggerSuggestionUpdate).toHaveBeenCalledWith(
      {},
      TEST_ATHLETE_ID,
      "interaction_logged",
      {
        interactionSchoolId: TEST_SCHOOL_ID,
        interactionCoachId: TEST_COACH_ID,
      },
    );
  });

  it("400s an invalid reason", async () => {
    mockState.body = { reason: "not-a-real-reason" };

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("400s a missing reason", async () => {
    mockState.body = {};

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("400s a non-UUID interactionSchoolId", async () => {
    mockState.body = {
      reason: "interaction_logged",
      interactionSchoolId: "not-a-uuid",
    };

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("400s a non-UUID interactionCoachId", async () => {
    mockState.body = {
      reason: "interaction_logged",
      interactionCoachId: "not-a-uuid",
    };

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("returns 500 when triggerSuggestionUpdate throws", async () => {
    trigger.triggerSuggestionUpdate.mockRejectedValue(new Error("db error"));

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
