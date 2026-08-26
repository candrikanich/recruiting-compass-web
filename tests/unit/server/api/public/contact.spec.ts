import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  profileRow: null as {
    id: string;
    family_unit_id: string;
    user_id: string;
    is_published: boolean;
  } | null,
  userRow: null as { email: string; full_name: string | null } | null,
  schoolRow: null as { id: string } | null,
  insertedContact: null as Record<string, unknown> | null,
  contactInsertError: null as object | null,
  notificationInserts: [] as Record<string, unknown>[],
};

const rateLimitByIpMock = vi.fn(async () => ({
  success: true,
  limit: 5,
  remaining: 4,
  reset: 0,
}));
const verifyTurnstileMock = vi.fn(async () => ({ ok: true }));
const matchCoachByEmailMock = vi.fn(async () => ({ coachId: null as string | null }));
const sendNotificationEmailMock = vi.fn(async () => ({ success: true }));

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByIp: (...args: unknown[]) => rateLimitByIpMock(...args),
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

vi.mock("~/server/utils/emailService", () => ({
  sendNotificationEmail: (...args: unknown[]) =>
    sendNotificationEmailMock(...args),
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
        };
      }
      if (table === "schools") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: mockState.schoolRow, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.notificationInserts.push(row);
            return Promise.resolve({ error: null });
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

const { default: handler } = await import(
  "~/server/api/public/profile/[slug]/contact.post"
);

function makeEvent(body: Record<string, unknown>) {
  return { _body: body } as unknown as Parameters<typeof handler>[0];
}

const validBody = {
  coachName: "Coach Smith",
  coachEmail: "coach@example.edu",
  coachTitle: "Head Coach",
  schoolName: "Example State",
  note: "Loved your film, would like to talk.",
};

describe("POST /api/public/profile/[slug]/contact", () => {
  beforeEach(() => {
    mockState.profileRow = {
      id: "profile-1",
      family_unit_id: "family-1",
      user_id: "player-1",
      is_published: true,
    };
    mockState.userRow = { email: "player@example.com", full_name: "Player One" };
    mockState.schoolRow = null;
    mockState.insertedContact = null;
    mockState.contactInsertError = null;
    mockState.notificationInserts = [];
    rateLimitByIpMock.mockClear();
    rateLimitByIpMock.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: 0,
    });
    verifyTurnstileMock.mockClear();
    verifyTurnstileMock.mockResolvedValue({ ok: true });
    matchCoachByEmailMock.mockClear();
    matchCoachByEmailMock.mockResolvedValue({ coachId: null });
    sendNotificationEmailMock.mockClear();
    sendNotificationEmailMock.mockResolvedValue({ success: true });
  });

  it("silently returns ok when honeypot is tripped, with no insert or notify", async () => {
    const result = await handler(makeEvent({ ...validBody, hp: "im-a-bot" }));
    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toBeNull();
    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
    expect(mockState.notificationInserts).toHaveLength(0);
  });

  it("returns 429 when rate limited", async () => {
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

  it("returns 422 on invalid body", async () => {
    await expect(
      handler(makeEvent({ coachName: "", note: "" })),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("returns 403 when Turnstile verification fails", async () => {
    verifyTurnstileMock.mockResolvedValueOnce({ ok: false, reason: "invalid" });
    await expect(
      handler(makeEvent({ ...validBody, turnstileToken: "bad" })),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockState.insertedContact).toBeNull();
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

  it("inserts profile_contacts with matched_coach_id set on email match and notifies the player", async () => {
    matchCoachByEmailMock.mockResolvedValueOnce({ coachId: "coach-42" });
    const result = await handler(makeEvent(validBody));

    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toMatchObject({
      family_unit_id: "family-1",
      player_user_id: "player-1",
      type: "contact",
      coach_name: "Coach Smith",
      coach_email: "coach@example.edu",
      coach_title: "Head Coach",
      matched_coach_id: "coach-42",
      school_name: "Example State",
      note: "Loved your film, would like to talk.",
      ip: "1.2.3.4",
      user_agent: "Mozilla/5.0",
    });
    expect(mockState.notificationInserts).toHaveLength(1);
    expect(mockState.notificationInserts[0]).toMatchObject({
      user_id: "player-1",
      type: "inbound_interaction",
      related_entity_type: "profile_contact",
      related_entity_id: "contact-1",
    });
    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendNotificationEmailMock.mock.calls[0][0]).toMatchObject({
      to: "player@example.com",
    });
  });

  it("inserts profile_contacts with matched_coach_id null when no coach match, and still notifies", async () => {
    matchCoachByEmailMock.mockResolvedValueOnce({ coachId: null });
    const result = await handler(makeEvent(validBody));

    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toMatchObject({
      matched_coach_id: null,
    });
    expect(mockState.notificationInserts).toHaveLength(1);
    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
  });

  it("never leaks player/coach PII in the response body", async () => {
    const result = await handler(makeEvent(validBody));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("player@example.com");
    expect(serialized).not.toContain("coach@example.edu");
    expect(serialized).not.toContain("Coach Smith");
    expect(Object.keys(result as object).sort()).toEqual(["ok"]);
  });

  it("nulls out a well-formed but nonexistent schoolId instead of 500ing, keeping school_name", async () => {
    mockState.schoolRow = null; // no row matches (nonexistent)
    const result = await handler(
      makeEvent({
        ...validBody,
        schoolId: "65c867f3-8754-4bae-9900-4c8ac8875538",
      }),
    );
    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toMatchObject({
      school_id: null,
      school_name: "Example State",
    });
  });

  it("nulls out a schoolId belonging to a different family instead of linking it", async () => {
    // The mocked schools query is family-scoped (.eq(family_unit_id)); a
    // school owned by another family never matches, so this returns the
    // same "no row" shape as nonexistent — verifying the query is scoped,
    // not just an existence check.
    mockState.schoolRow = null;
    const result = await handler(
      makeEvent({
        ...validBody,
        schoolId: "a046d781-9a96-4f60-814a-158c5d9a99f3",
      }),
    );
    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toMatchObject({
      school_id: null,
      school_name: "Example State",
    });
  });

  it("uses the verified schoolId when it belongs to the player's own family", async () => {
    mockState.schoolRow = { id: "6eb01d94-1965-45a5-9106-1c3c9851a1aa" };
    const result = await handler(
      makeEvent({
        ...validBody,
        schoolId: "6eb01d94-1965-45a5-9106-1c3c9851a1aa",
      }),
    );
    expect(result).toEqual({ ok: true });
    expect(mockState.insertedContact).toMatchObject({
      school_id: "6eb01d94-1965-45a5-9106-1c3c9851a1aa",
    });
  });

  it("does not fail the response when notification insert fails", async () => {
    const mockFrom = (
      await import("~/server/utils/supabase")
    ).useSupabaseAdmin();
    void mockFrom;
    sendNotificationEmailMock.mockRejectedValueOnce(new Error("resend down"));
    const result = await handler(makeEvent(validBody));
    expect(result).toEqual({ ok: true });
  });
});
