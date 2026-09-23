import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "11111111-1111-4111-8111-111111111111",
  canMutate: true,
  updateError: null as object | null,
  capturedUpdate: null as Record<string, unknown> | null,
  body: {
    athleteUserId: "11111111-1111-4111-8111-111111111111",
    sourcePath: "column:users.high_school",
    value: "Central High",
  } as Record<string, unknown>,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
  canMutateAthleteData: vi.fn(async () => mockState.canMutate),
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
      if (table === "users") {
        return {
          update: (payload: Record<string, unknown>) => {
            mockState.capturedUpdate = payload;
            return {
              eq: () => Promise.resolve({ error: mockState.updateError }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
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

const { default: handler } = await import(
  "~/server/api/athlete/profile-field.patch"
);

describe("PATCH /api/athlete/profile-field", () => {
  beforeEach(() => {
    mockState.userId = "11111111-1111-4111-8111-111111111111";
    mockState.canMutate = true;
    mockState.updateError = null;
    mockState.capturedUpdate = null;
    mockState.body = {
      athleteUserId: "11111111-1111-4111-8111-111111111111",
      sourcePath: "column:users.high_school",
      value: "Central High",
    };
  });

  it("writes the editable column for the athlete's own profile", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, value: "Central High" });
    expect(mockState.capturedUpdate).toEqual({ high_school: "Central High" });
  });

  it("returns 403 when the caller isn't authorized to mutate this athlete's data", async () => {
    mockState.canMutate = false;
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 400 for a non-editable sourcePath", async () => {
    mockState.body = {
      athleteUserId: "11111111-1111-4111-8111-111111111111",
      sourcePath: "column:users.email",
      value: "x",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 for a value outside the column's range", async () => {
    mockState.body = {
      athleteUserId: "11111111-1111-4111-8111-111111111111",
      sourcePath: "column:users.graduation_year",
      value: "1999",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 500 when the update fails", async () => {
    mockState.updateError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
