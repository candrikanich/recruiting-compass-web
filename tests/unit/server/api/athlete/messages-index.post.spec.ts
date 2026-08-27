import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-123",
  resolvedTargetId: "athlete-999",
  insertedRow: null as Record<string, unknown> | null,
  insertError: null as { message: string } | null,
  returnedId: "msg-1",
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
    from: (table: string) => {
      expect(table).toBe("athlete_messages");
      return {
        insert: (row: Record<string, unknown>) => {
          mockState.insertedRow = row;
          return {
            select: () => ({
              single: () =>
                Promise.resolve(
                  mockState.insertError
                    ? { data: null, error: mockState.insertError }
                    : { data: { id: mockState.returnedId }, error: null },
                ),
            }),
          };
        },
      };
    },
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
  "~/server/api/athlete/messages/index.post"
);

const ATHLETE_ID = "11111111-1111-4111-8111-111111111111";
const SCHOOL_ID = "22222222-2222-4222-8222-222222222222";

const makeEvent = (body: unknown) =>
  ({ node: { req: {}, res: {} }, _body: body }) as any;

describe("POST /api/athlete/messages", () => {
  beforeEach(() => {
    mockState.userId = "user-123";
    mockState.resolvedTargetId = "athlete-999";
    mockState.insertedRow = null;
    mockState.insertError = null;
    mockState.returnedId = "msg-1";
  });

  it("logs a message against the resolved target athlete and returns its id", async () => {
    const result = await handler(
      makeEvent({
        athleteUserId: ATHLETE_ID,
        schoolId: SCHOOL_ID,
        templateSlug: "intro-standard",
        channel: "email",
        programNote: "  Team won state  ",
      }),
    );

    expect(result).toEqual({ success: true, id: "msg-1" });
    expect(mockState.insertedRow).toMatchObject({
      user_id: "athlete-999",
      school_id: SCHOOL_ID,
      template_slug: "intro-standard",
      channel: "email",
      program_note: "Team won state", // trimmed
      created_by: "user-123",
    });
  });

  it("nulls out an empty program note rather than storing whitespace", async () => {
    await handler(
      makeEvent({ athleteUserId: ATHLETE_ID, programNote: "   " }),
    );
    expect(mockState.insertedRow?.program_note).toBeNull();
  });

  it("rejects a body with a non-uuid athleteUserId", async () => {
    await expect(
      handler(makeEvent({ athleteUserId: "not-a-uuid" })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 500 when the insert fails", async () => {
    mockState.insertError = { message: "db down" };
    await expect(
      handler(makeEvent({ athleteUserId: ATHLETE_ID })),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
