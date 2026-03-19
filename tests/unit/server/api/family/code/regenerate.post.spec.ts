import { describe, it, expect, vi, beforeEach } from "vitest";

const VALID_FAMILY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const mockState = {
  userId: "user-1",
  familyData: null as { id: string; created_by_user_id: string } | null,
  updateError: null as object | null,
  generatedCode: "FAM-NEWCODE",
  body: { familyId: VALID_FAMILY_ID } as object,
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

vi.mock("~/server/utils/familyCode", () => ({
  generateFamilyCode: vi.fn(async () => mockState.generatedCode),
}));

vi.mock("~/server/utils/validation", () => ({
  validateBody: vi.fn(async (_event: unknown, _schema: unknown) => mockState.body),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_units") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: mockState.familyData, error: null }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: mockState.updateError }),
          }),
        };
      }
      if (table === "family_code_usage_log") {
        const logPromise = Object.assign(
          Promise.resolve({ data: null, error: null }),
          { catch: vi.fn() },
        );
        return { insert: vi.fn().mockReturnValue(logPromise) };
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
    createError: (config: { statusCode: number; statusMessage?: string; message?: string }) => {
      const err = new Error(config.statusMessage ?? config.message ?? "error") as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } = await import("~/server/api/family/code/regenerate.post");

const mockEvent = { context: {}, node: { req: {}, res: {} } } as Parameters<typeof handler>[0];

describe("POST /api/family/code/regenerate", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.familyData = { id: VALID_FAMILY_ID, created_by_user_id: "user-1" };
    mockState.updateError = null;
    mockState.generatedCode = "FAM-NEWCODE";
    mockState.body = { familyId: VALID_FAMILY_ID };
  });

  it("returns new family code on happy path", async () => {
    const result = await handler(mockEvent);
    expect(result).toMatchObject({ success: true, familyCode: "FAM-NEWCODE" });
  });

  it("throws 403 when family does not exist", async () => {
    mockState.familyData = null;
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("throws 403 when user is not the family owner", async () => {
    mockState.familyData = { id: VALID_FAMILY_ID, created_by_user_id: "other-user" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("throws 500 when DB update returns an error", async () => {
    mockState.updateError = { message: "write failed" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("propagates H3 error from requireAuth without wrapping", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3Err = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    vi.mocked(requireAuth).mockRejectedValueOnce(h3Err);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("propagates 400 from validateBody when body is invalid", async () => {
    const { validateBody } = await import("~/server/utils/validation");
    const validationErr = Object.assign(new Error("Validation failed"), { statusCode: 400 });
    vi.mocked(validateBody).mockRejectedValueOnce(validationErr);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("wraps unexpected non-H3 errors in a 500", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("unexpected crash"));

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
