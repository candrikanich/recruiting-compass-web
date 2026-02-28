import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable test state — updated per test, read by mock factories at call time
const mockState = {
  userId: "player-user-id",
  userRole: "player" as string | null,
  existingFamily: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
  getUserRole: vi.fn(async () => mockState.userRole),
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
  generateFamilyCode: vi.fn().mockResolvedValue("FAM-TESTCODE"),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_units") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.existingFamily, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "family-123", family_code: "FAM-TESTCODE", family_name: "My Family" },
                  error: null,
                }),
            }),
          }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "family_members") {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      if (table === "family_code_usage_log") {
        const builder = Object.assign(Promise.resolve({ data: null, error: null }), { catch: vi.fn() });
        return { insert: vi.fn().mockReturnValue(builder) };
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
    createError: (config: { statusCode: number; message?: string; statusMessage?: string }) => {
      const err = new Error(config.message ?? config.statusMessage) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

// Import handler once — mocks are established above
const { default: handler } = await import("~/server/api/family/create.post");

describe("POST /api/family/create — symmetric", () => {
  beforeEach(() => {
    mockState.userId = "player-user-id";
    mockState.userRole = "player";
    mockState.existingFamily = null;
  });

  it("allows a player to create a family unit", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, familyCode: "FAM-TESTCODE", familyId: "family-123" });
  });

  it("allows a parent to create a family unit", async () => {
    mockState.userId = "parent-user-id";
    mockState.userRole = "parent";

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, familyCode: "FAM-TESTCODE" });
  });

  it("returns existing family if one already exists", async () => {
    mockState.existingFamily = { id: "existing-family", family_code: "FAM-EXISTING", family_name: "My Family" };

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, familyId: "existing-family", message: "Family already exists" });
  });
});
