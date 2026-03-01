import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-abc",
  familyId: "family-123" as string,
  access: { id: "member-self" } as object | null,
  accessError: null as object | null,
  members: null as Array<Record<string, unknown>> | null,
  membersError: null as object | null,
  users: null as Array<Record<string, unknown>> | null,
  usersError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

// Chainable builder that supports arbitrary .eq() depth before a terminal method
function buildChain(terminal: {
  order?: () => Promise<unknown>;
  maybeSingle?: () => Promise<unknown>;
}): {
  eq: () => ReturnType<typeof buildChain>;
  order: () => Promise<unknown>;
  maybeSingle: () => Promise<unknown>;
} {
  const chain = {
    get eq() { return () => chain; },
    order: terminal.order ?? (() => Promise.resolve({ data: [], error: null })),
    maybeSingle: terminal.maybeSingle ?? (() => Promise.resolve({ data: null, error: null })),
  };
  return chain;
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          // Differentiate by columns: "id" = access check, anything else = members list
          select: (cols: string) => {
            if (cols === "id") {
              return buildChain({
                maybeSingle: () => Promise.resolve({ data: mockState.access, error: mockState.accessError }),
              });
            }
            return buildChain({
              order: () => Promise.resolve({ data: mockState.members, error: mockState.membersError }),
            });
          },
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockState.users, error: mockState.usersError }),
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
    getQuery: vi.fn(() => ({ familyId: mockState.familyId })),
    createError: (config: { statusCode: number; statusMessage?: string; message?: string }) => {
      const err = new Error(config.statusMessage ?? config.message) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } = await import("~/server/api/family/members.get");

describe("GET /api/family/members", () => {
  beforeEach(() => {
    mockState.userId = "user-abc";
    mockState.familyId = "family-123";
    mockState.access = { id: "member-self" };
    mockState.accessError = null;
    mockState.members = [
      { id: "m-1", family_unit_id: "family-123", user_id: "user-abc", role: "player", added_at: "2024-01-01" },
    ];
    mockState.membersError = null;
    mockState.users = [{ id: "user-abc", email: "player@example.com", full_name: "Alice", role: "player" }];
    mockState.usersError = null;
  });

  it("returns members with user details", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, count: 1, familyId: "family-123" });
    expect(result.members[0]).toMatchObject({ user_id: "user-abc", users: { email: "player@example.com" } });
  });

  it("returns empty array when no members exist", async () => {
    mockState.members = [];
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, count: 0, members: [] });
  });

  it("uses empty user placeholder when user details not found", async () => {
    mockState.users = []; // no user record for the member
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result.members[0].users).toMatchObject({ id: "user-abc", email: "" });
  });

  it("returns 400 when familyId is missing", async () => {
    mockState.familyId = "";
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 403 when user is not a member of the family", async () => {
    mockState.access = null;
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 403 when access check returns an error", async () => {
    mockState.accessError = { message: "rls error" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 500 when members fetch fails", async () => {
    mockState.membersError = { message: "db error" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 500 when user details fetch fails", async () => {
    mockState.usersError = { message: "db error" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 500 });
  });
});
