import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The check endpoint fires up to three queries against athlete_messages:
 *  1. programNote dedupe — select("id")...limit(1), awaited directly
 *  2. last contact      — select("sent_at")...maybeSingle()
 *  3. message count     — select("id", { count, head }), awaited after .eq()
 * The mock branches on the select() call to return each shape.
 */
const mockState = {
  userId: "user-123",
  resolvedTargetId: "athlete-999",
  dedupeMatches: [] as { id: string }[],
  lastSentAt: null as string | null,
  countToSchool: 0,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/athleteAccess", () => ({
  resolveTargetAthleteId: vi.fn(async () => mockState.resolvedTargetId),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: () => ({
      select: (_field: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count) {
          // count chain — thenable resolving { count } after the .eq() calls
          const countable: any = {
            eq: () => countable,
            then: (resolve: (v: unknown) => void) =>
              resolve({ count: mockState.countToSchool }),
          };
          return countable;
        }
        // dedupe + last-contact chains share these builder methods
        const builder: any = {
          eq: () => builder,
          neq: () => builder,
          order: () => builder,
          limit: () => builder,
          maybeSingle: () =>
            Promise.resolve({
              data: mockState.lastSentAt
                ? { sent_at: mockState.lastSentAt }
                : null,
              error: null,
            }),
          then: (resolve: (v: unknown) => void) =>
            resolve({ data: mockState.dedupeMatches, error: null }),
        };
        return builder;
      },
    }),
  })),
}));

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async (event: any) => event._body),
  };
});

const { default: handler } = await import(
  "~/server/api/athlete/messages/check.post"
);

const ATHLETE_ID = "11111111-1111-4111-8111-111111111111";
const SCHOOL_ID = "22222222-2222-4222-8222-222222222222";

const makeEvent = (body: unknown) =>
  ({ node: { req: {}, res: {} }, _body: body }) as any;

describe("POST /api/athlete/messages/check", () => {
  beforeEach(() => {
    mockState.userId = "user-123";
    mockState.resolvedTargetId = "athlete-999";
    mockState.dedupeMatches = [];
    mockState.lastSentAt = null;
    mockState.countToSchool = 0;
  });

  it("flags programNoteReused when the note was sent to a different program", async () => {
    mockState.dedupeMatches = [{ id: "prior-msg" }];

    const result = await handler(
      makeEvent({
        athleteUserId: ATHLETE_ID,
        schoolId: SCHOOL_ID,
        programNote: "Team won state",
      }),
    );

    expect(result.programNoteReused).toBe(true);
  });

  it("does not flag reuse when there is no prior match", async () => {
    mockState.dedupeMatches = [];

    const result = await handler(
      makeEvent({
        athleteUserId: ATHLETE_ID,
        schoolId: SCHOOL_ID,
        programNote: "Fresh note",
      }),
    );

    expect(result.programNoteReused).toBe(false);
  });

  it("marks recentContact when last message to the program was < 7 days ago", async () => {
    mockState.lastSentAt = new Date(
      Date.now() - 2 * 86_400_000,
    ).toISOString();
    mockState.countToSchool = 3;

    const result = await handler(
      makeEvent({ athleteUserId: ATHLETE_ID, schoolId: SCHOOL_ID }),
    );

    expect(result.daysSinceLastContact).toBe(2);
    expect(result.recentContact).toBe(true);
    expect(result.messageCountToSchool).toBe(3);
  });

  it("does not mark recentContact when last message was >= 7 days ago", async () => {
    mockState.lastSentAt = new Date(
      Date.now() - 10 * 86_400_000,
    ).toISOString();

    const result = await handler(
      makeEvent({ athleteUserId: ATHLETE_ID, schoolId: SCHOOL_ID }),
    );

    expect(result.daysSinceLastContact).toBe(10);
    expect(result.recentContact).toBe(false);
  });

  it("returns null timing signals when the athlete has no prior contact", async () => {
    const result = await handler(
      makeEvent({ athleteUserId: ATHLETE_ID, schoolId: SCHOOL_ID }),
    );

    expect(result.daysSinceLastContact).toBeNull();
    expect(result.recentContact).toBe(false);
    expect(result.messageCountToSchool).toBe(0);
  });

  it("rejects a body with a non-uuid athleteUserId", async () => {
    await expect(
      handler(makeEvent({ athleteUserId: "not-a-uuid" })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
