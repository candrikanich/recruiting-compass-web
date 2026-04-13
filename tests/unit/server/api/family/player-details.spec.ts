import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-abc",
  membership: { family_unit_id: "family-123" } as object | null,
  updateError: null as object | null,
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
  useSupabaseAdmin: vi.fn(() => ({
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
          update: () => ({
            eq: () => Promise.resolve({ error: mockState.updateError }),
          }),
        };
      }
      return {};
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => ({
      playerName: "Alex Johnson",
      graduationYear: 2026,
      sport: "Soccer",
      position: "Midfielder",
    })),
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
  });

  it("saves player details to the family unit", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
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
});
