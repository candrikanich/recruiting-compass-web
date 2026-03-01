import { describe, it, expect, vi, beforeEach } from "vitest";

const OWNER_ID = "owner-player-id";
const PARENT_MEMBER_ID = "00000000-0000-0000-0000-000000000001";

const mockState = {
  userId: OWNER_ID,
  memberId: PARENT_MEMBER_ID,
  member: null as Record<string, unknown> | null,
  memberFetchError: null as object | null,
  deleteError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

// Mock requireUuidParam to return mockState.memberId directly
vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => mockState.memberId),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: mockState.member, error: mockState.memberFetchError }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: mockState.deleteError }),
          }),
        };
      }
      if (table === "family_code_usage_log") {
        const p = Object.assign(Promise.resolve({ data: null, error: null }), {
          then: vi.fn(() => ({ catch: vi.fn() })),
          catch: vi.fn(),
        });
        return { insert: vi.fn().mockReturnValue(p) };
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
      const err = new Error(config.statusMessage ?? config.message) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } = await import("~/server/api/family/members/[memberId].delete");

describe("DELETE /api/family/members/[memberId]", () => {
  beforeEach(() => {
    mockState.userId = OWNER_ID;
    mockState.memberId = PARENT_MEMBER_ID;
    mockState.member = {
      id: PARENT_MEMBER_ID,
      family_unit_id: "family-123",
      user_id: "parent-user-id",
      role: "parent",
      family_units: { id: "family-123", family_name: "Test Family", created_by_user_id: OWNER_ID },
      users: { id: "parent-user-id", email: "parent@example.com" },
    };
    mockState.memberFetchError = null;
    mockState.deleteError = null;
  });

  it("allows the family owner to remove a parent member", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
  });

  it("returns 404 when member is not found", async () => {
    mockState.member = null;
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 500 when member fetch fails", async () => {
    mockState.memberFetchError = { message: "db error" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 403 when requester is not the family owner", async () => {
    mockState.userId = "some-other-user";
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 400 when the user attempts to remove themselves", async () => {
    mockState.member = { ...mockState.member!, user_id: OWNER_ID };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when the target member is not a parent", async () => {
    mockState.member = { ...mockState.member!, role: "player" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 500 when the family data is missing from the member record", async () => {
    mockState.member = { ...mockState.member!, family_units: null };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 500 when delete fails", async () => {
    mockState.deleteError = { message: "constraint violation" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 500 });
  });
});
