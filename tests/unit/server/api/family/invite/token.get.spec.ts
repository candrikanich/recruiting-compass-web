import { describe, it, expect, beforeEach, vi } from "vitest";

const mockState = {
  invitation: null as Record<string, unknown> | null,
  inviter: null as Record<string, unknown> | null,
  userByEmail: null as Record<string, unknown> | null,
  familyUnit: null as Record<string, unknown> | null,
};

// Mock Supabase admin — chainable builder pattern
function makeChain(resolveWith: () => Promise<{ data: unknown }>) {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.single = resolveWith;
  chain.maybeSingle = resolveWith;
  return chain;
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (col: string, val: string) => {
          // family_invitations lookup by token
          if (table === "family_invitations") {
            return {
              single: () => Promise.resolve({ data: mockState.invitation }),
            };
          }
          // family_units lookup by id
          if (table === "family_units") {
            return {
              single: () => Promise.resolve({ data: mockState.familyUnit }),
            };
          }
          // users lookup — by id (inviter) or by email (existence check)
          if (table === "users") {
            if (col === "id") {
              return {
                single: () => Promise.resolve({ data: mockState.inviter }),
              };
            }
            // email check
            return {
              maybeSingle: () => Promise.resolve({ data: mockState.userByEmail }),
            };
          }
          return { single: () => Promise.resolve({ data: null }), maybeSingle: () => Promise.resolve({ data: null }) };
        },
      }),
    }),
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getRouterParam: vi.fn(() => "test-token"),
  };
});

const { default: handler } = await import(
  "~/server/api/family/invite/[token].get"
);
const mockEvent = {} as Parameters<typeof handler>[0];

describe("GET /api/family/invite/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.invitation = {
      id: "inv-1",
      invited_email: "player@example.com",
      role: "player",
      status: "pending",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      family_unit_id: "fam-1",
      invited_by: "user-1",
    };
    mockState.familyUnit = { family_name: "The Smiths", pending_player_details: null };
    mockState.inviter = { full_name: "Jane Smith" };
    mockState.userByEmail = null;
  });

  it("returns emailExists false when email not in users table", async () => {
    mockState.userByEmail = null;
    const result = await handler(mockEvent);
    expect(result.emailExists).toBe(false);
  });

  it("returns emailExists true when email found in users table", async () => {
    mockState.userByEmail = { id: "u-existing" };
    const result = await handler(mockEvent);
    expect(result.emailExists).toBe(true);
  });

  it("returns prefill when role is player and pending_player_details has playerName", async () => {
    mockState.familyUnit = {
      family_name: "The Smiths",
      pending_player_details: { playerName: "Alex Johnson", graduationYear: 2026 },
    };
    const result = await handler(mockEvent);
    expect(result.prefill).toEqual({ firstName: "Alex", lastName: "Johnson" });
  });

  it("returns no prefill when role is parent", async () => {
    (mockState.invitation as Record<string, unknown>).role = "parent";
    mockState.familyUnit = {
      family_name: "The Smiths",
      pending_player_details: { playerName: "Alex Johnson" },
    };
    const result = await handler(mockEvent);
    expect(result.prefill).toBeUndefined();
  });

  it("returns no prefill when pending_player_details is null", async () => {
    mockState.familyUnit = { family_name: "The Smiths", pending_player_details: null };
    const result = await handler(mockEvent);
    expect(result.prefill).toBeUndefined();
  });

  it("throws 409 when invitation status is accepted", async () => {
    (mockState.invitation as Record<string, unknown>).status = "accepted";
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("throws 409 when invitation status is declined", async () => {
    (mockState.invitation as Record<string, unknown>).status = "declined";
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 409 });
  });
});
