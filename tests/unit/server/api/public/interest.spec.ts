import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  profileRow: null as {
    id: string;
    family_unit_id: string;
    user_id: string;
    is_published: boolean;
  } | null,
  userRow: null as { email: string; full_name: string | null } | null,
  insertedContact: null as Record<string, unknown> | null,
  contactInsertError: null as object | null,
  contactUpdate: null as { row: Record<string, unknown>; id: unknown } | null,
  notificationInserts: [] as Record<string, unknown>[],
  notificationInsertError: null as object | null,
  insertedInteraction: null as Record<string, unknown> | null,
  interactionInsertError: null as object | null,
};

const rateLimitByIpMock = vi.fn(async () => ({
  success: true,
  limit: 5,
  remaining: 4,
  reset: 0,
}));
const rateLimitByKeyMock = vi.fn(async () => ({
  success: true,
  limit: 20,
  remaining: 19,
  reset: 0,
}));
const verifyTurnstileMock = vi.fn(async () => ({ ok: true }));
const matchCoachByEmailMock = vi.fn(async () => ({
  coachId: null as string | null,
  schoolId: null as string | null,
}));

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByIp: (...args: unknown[]) => rateLimitByIpMock(...args),
  rateLimitByKey: (...args: unknown[]) => rateLimitByKeyMock(...args),
  throwIfRateLimited: (result: { success: boolean }) => {
    if (!result.success) {
      const err = new Error("Too many requests") as Error & {
        statusCode: number;
      };
      err.statusCode = 429;
      throw err;
    }
  },
}));

vi.mock("~/server/utils/turnstile", () => ({
  verifyTurnstile: (...args: unknown[]) => verifyTurnstileMock(...args),
  isHoneypotTripped: (hp: unknown) =>
    typeof hp === "string" && hp.trim().length > 0,
}));

vi.mock("~/server/utils/matchCoachByEmail", () => ({
  matchCoachByEmail: (...args: unknown[]) => matchCoachByEmailMock(...args),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "player_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.profileRow, error: null }),
            }),
          }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.userRow, error: null }),
            }),
          }),
        };
      }
      if (table === "profile_contacts") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.insertedContact = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: mockState.contactInsertError
                      ? null
                      : { id: "contact-1" },
                    error: mockState.contactInsertError,
                  }),
              }),
            };
          },
          update: (row: Record<string, unknown>) => ({
            eq: (_col: string, id: unknown) => {
              mockState.contactUpdate = { row, id };
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "interactions") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.insertedInteraction = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: mockState.interactionInsertError
                      ? null
                      : { id: "interaction-1" },
                    error: mockState.interactionInsertError,
                  }),
              }),
            };
          },
        };
      }
      if (table === "notifications") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.notificationInserts.push(row);
            return Promise.resolve({
              error: mockState.notificationInsertError,
            });
          },
        };
      }
      return {};
    },
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    getRouterParam: vi.fn(() => "abc123"),
    getRequestIP: vi.fn(() => "1.2.3.4"),
    getRequestHeader: vi.fn(() => "Mozilla/5.0"),
    getHeader: vi.fn(
      (event: { _headers?: Record<string, string> }, name: string) =>
        event._headers?.[name.toLowerCase()],
    ),
    readBody: vi.fn(async (event: { _body?: unknown }) => event._body ?? {}),
    createError: (cfg: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(cfg.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = cfg.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/public/profile/[slug]/interest.post");

function makeEvent(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return {
    _body: body,
    _headers: headers,
  } as unknown as Parameters<typeof handler>[0];
}

const validBody = {
  program: "2027 Baseball Camp",
};

describe("POST /api/public/profile/[slug]/interest", () => {
  beforeEach(() => {
    mockState.profileRow = {
      id: "profile-1",
      family_unit_id: "family-1",
      user_id: "player-1",
      is_published: true,
    };
    mockState.userRow = {
      email: "player@example.com",
      full_name: "Player One",
    };
    mockState.insertedContact = null;
    mockState.contactInsertError = null;
    mockState.contactUpdate = null;
    mockState.notificationInserts = [];
    mockState.notificationInsertError = null;
    mockState.insertedInteraction = null;
    mockState.interactionInsertError = null;
    rateLimitByIpMock.mockClear();
    rateLimitByIpMock.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: 0,
    });
    rateLimitByKeyMock.mockClear();
    rateLimitByKeyMock.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: 0,
    });
    verifyTurnstileMock.mockClear();
    verifyTurnstileMock.mockResolvedValue({ ok: true });
    matchCoachByEmailMock.mockClear();
    matchCoachByEmailMock.mockResolvedValue({ coachId: null, schoolId: null });
  });

  it("silently returns ok when honeypot is tripped, with no insert or notify", async () => {
    const result = await handler(makeEvent({ ...validBody, hp: "im-a-bot" }));
    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toBeNull();
    expect(mockState.insertedInteraction).toBeNull();
    expect(mockState.notificationInserts).toHaveLength(0);
  });

  it("returns 429 when per-IP rate limited", async () => {
    rateLimitByIpMock.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    await expect(handler(makeEvent(validBody))).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("returns 429 when per-slug rate limited, using an interest-namespaced key", async () => {
    rateLimitByKeyMock.mockResolvedValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    await expect(handler(makeEvent(validBody))).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(rateLimitByKeyMock).toHaveBeenCalledWith(
      expect.anything(),
      "interest:abc123",
      expect.objectContaining({ requests: 20, window: "1 h" }),
    );
  });

  it("returns 422 when program is missing", async () => {
    await expect(handler(makeEvent({}))).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("returns 403 when Turnstile verification fails", async () => {
    verifyTurnstileMock.mockResolvedValueOnce({ ok: false, reason: "invalid" });
    await expect(
      handler(makeEvent({ ...validBody, turnstileToken: "bad" })),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockState.insertedContact).toBeNull();
  });

  it("calls verifyTurnstile with expectedAction 'interest'", async () => {
    await handler(makeEvent(validBody));
    expect(verifyTurnstileMock).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ expectedAction: "interest" }),
    );
  });

  it("returns 404 when the slug does not resolve to a profile", async () => {
    mockState.profileRow = null;
    await expect(handler(makeEvent(validBody))).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("returns 404 when the profile is unpublished", async () => {
    mockState.profileRow = {
      id: "profile-1",
      family_unit_id: "family-1",
      user_id: "player-1",
      is_published: false,
    };
    await expect(handler(makeEvent(validBody))).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("inserts an anonymous interest with a placeholder coach name, no match, and notifies", async () => {
    const result = await handler(makeEvent(validBody));

    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toMatchObject({
      family_unit_id: "family-1",
      player_user_id: "player-1",
      type: "interest",
      program: "2027 Baseball Camp",
      coach_name: "A coach",
      coach_email: null,
      matched_coach_id: null,
      ip: "1.2.3.4",
      user_agent: "Mozilla/5.0",
      status: "pending",
    });
    expect(mockState.insertedInteraction).toBeNull();
    expect(mockState.notificationInserts).toHaveLength(1);
    expect(mockState.notificationInserts[0]).toMatchObject({
      user_id: "player-1",
      type: "inbound_interaction",
      title: "New interest from a coach",
      related_entity_type: "profile_contact",
      related_entity_id: "contact-1",
    });
  });

  it("mints an inbound interaction on email match and notifies the player pointed at the interaction", async () => {
    matchCoachByEmailMock.mockResolvedValueOnce({
      coachId: "coach-42",
      schoolId: "school-42",
    });
    const result = await handler(
      makeEvent({
        ...validBody,
        coachName: "Coach Smith",
        coachEmail: "coach@example.edu",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toMatchObject({
      matched_coach_id: "coach-42",
      status: "resolved",
    });
    expect(mockState.insertedInteraction).toMatchObject({
      coach_id: "coach-42",
      school_id: "school-42",
      family_unit_id: "family-1",
      logged_by: "player-1",
      direction: "inbound",
      type: "interest",
    });
    expect(mockState.contactUpdate).toMatchObject({
      row: { interaction_id: "interaction-1" },
      id: "contact-1",
    });
    // The DB trigger that fires on interaction insert excludes the player
    // (`logged_by`) — it's meant for other family members. The endpoint
    // itself is what notifies the player, repointed at the interaction.
    expect(mockState.notificationInserts).toHaveLength(1);
    expect(mockState.notificationInserts[0]).toMatchObject({
      user_id: "player-1",
      type: "inbound_interaction",
      related_entity_type: "interaction",
      related_entity_id: "interaction-1",
    });
  });

  it("sets matched_coach_id when coachEmail matches an existing coach", async () => {
    matchCoachByEmailMock.mockResolvedValueOnce({ coachId: "coach-42" });
    const result = await handler(
      makeEvent({
        ...validBody,
        coachName: "Coach Smith",
        coachEmail: "coach@example.edu",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toMatchObject({
      coach_name: "Coach Smith",
      coach_email: "coach@example.edu",
      matched_coach_id: "coach-42",
    });
  });

  it("never leaks player/coach PII in the response body", async () => {
    const result = await handler(
      makeEvent({ ...validBody, coachName: "Coach Smith" }),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("player@example.com");
    expect(serialized).not.toContain("Coach Smith");
    expect(Object.keys(result as object).sort()).toEqual(["ok"]);
  });

  it("does not fail the response when notification insert fails", async () => {
    mockState.notificationInsertError = new Error("db down");
    const result = await handler(makeEvent(validBody));
    expect(result).toEqual({ ok: true });
  });

  describe("trusted client IP", () => {
    it("uses x-vercel-forwarded-for for the rate-limit key and stored ip", async () => {
      const result = await handler(
        makeEvent(validBody, { "x-vercel-forwarded-for": "9.9.9.9" }),
      );
      expect(result).toEqual({ ok: true });
      expect(rateLimitByIpMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ip: "9.9.9.9" }),
      );
      expect(mockState.insertedContact).toMatchObject({ ip: "9.9.9.9" });
    });

    it("inserts with ip null instead of 500ing when the resolved IP is malformed", async () => {
      const result = await handler(
        makeEvent(validBody, { "x-vercel-forwarded-for": "garbage" }),
      );
      expect(result).toEqual({ ok: true });
      expect(mockState.insertedContact).toMatchObject({ ip: null });
    });
  });
});
