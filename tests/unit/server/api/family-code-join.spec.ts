import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "player-user-id",
  userRole: "player" as string | null,
  family: { id: "family-123", family_name: "Test Family", created_by_user_id: "parent-user-id" } as object | null,
  existingMember: null as object | null,
  memberInsertError: null as object | null,
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
  isValidFamilyCodeFormat: vi.fn(() => true),
  checkRateLimit: vi.fn(() => true),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_units") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: mockState.family, error: mockState.family ? null : { message: "not found" } }),
            }),
          }),
        };
      }
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: mockState.existingMember, error: null }),
              }),
            }),
          }),
          insert: () =>
            Promise.resolve({ error: mockState.memberInsertError }),
        };
      }
      if (table === "family_code_usage_log") {
        const noop = { then: vi.fn(() => ({ catch: vi.fn() })), catch: vi.fn() };
        return { insert: vi.fn().mockReturnValue(noop) };
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
    readBody: vi.fn(async () => ({ familyCode: "FAM-TESTCODE" })),
    getRequestIP: vi.fn(() => "127.0.0.1"),
    createError: (config: { statusCode: number; message?: string; statusMessage?: string }) => {
      const err = new Error(config.message ?? config.statusMessage) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } = await import("~/server/api/family/code/join.post");

describe("POST /api/family/code/join — symmetric", () => {
  beforeEach(() => {
    mockState.userId = "player-user-id";
    mockState.userRole = "player";
    mockState.family = { id: "family-123", family_name: "Test Family", created_by_user_id: "parent-user-id" };
    mockState.existingMember = null;
    mockState.memberInsertError = null;
  });

  it("allows a player to join a parent-created family via code", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, familyId: "family-123" });
  });

  it("allows a parent to join a player-created family via code", async () => {
    mockState.userId = "other-parent-id";
    mockState.userRole = "parent";
    mockState.family = { id: "family-456", family_name: "Player Family", created_by_user_id: "player-user-id" };

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, familyId: "family-456" });
  });

  it("prevents a user from joining their own family", async () => {
    mockState.userId = "parent-user-id";
    mockState.family = { id: "family-123", family_name: "My Family", created_by_user_id: "parent-user-id" };

    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow("You cannot join your own family");
  });

  it("returns idempotent success if already a member", async () => {
    mockState.existingMember = { id: "member-1" };

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, message: "You are already a member of this family" });
  });
});
