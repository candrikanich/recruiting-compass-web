import { describe, it, expect, beforeEach, vi } from "vitest";

const mockState = {
  invitation: null as Record<string, unknown> | null,
  familyUnit: null as Record<string, unknown> | null,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => {
          if (table === "family_invitations") {
            return {
              single: () => Promise.resolve({ data: mockState.invitation }),
            };
          }
          if (table === "family_units") {
            return {
              single: () => Promise.resolve({ data: mockState.familyUnit }),
            };
          }
          return { single: () => Promise.resolve({ data: null }) };
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

const { default: handler } =
  await import("~/server/api/family/invite/[token].get");
const mockEvent = {} as Parameters<typeof handler>[0];

describe("GET /api/family/invite/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.invitation = {
      id: "inv-1",
      role: "player",
      status: "pending",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      family_unit_id: "fam-1",
    };
    mockState.familyUnit = {
      family_name: "The Smiths",
      pending_player_details: null,
    };
  });

  it("returns invitationId, role, and familyName — no email or emailExists", async () => {
    const result = await handler(mockEvent);
    expect(result.invitationId).toBe("inv-1");
    expect(result.role).toBe("player");
    expect(result.familyName).toBe("The Smiths");
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("emailExists");
    expect(result).not.toHaveProperty("inviterName");
  });

  it("never returns athlete PII (name, grad year, sport, position) even when pending_player_details is populated", async () => {
    mockState.familyUnit = {
      family_name: "The Smiths",
      pending_player_details: {
        playerName: "Alex Johnson",
        graduationYear: 2026,
        sport: "Soccer",
        position: "Midfielder",
      },
    };
    const result = await handler(mockEvent);
    expect(result).toEqual({
      invitationId: "inv-1",
      role: "player",
      familyName: "The Smiths",
    });
    expect(result).not.toHaveProperty("prefill");
    expect(JSON.stringify(result)).not.toMatch(
      /Alex|Johnson|Soccer|Midfielder|2026/,
    );
  });

  it("returns no prefill field for parent-role invites either", async () => {
    (mockState.invitation as Record<string, unknown>).role = "parent";
    mockState.familyUnit = {
      family_name: "The Smiths",
      pending_player_details: { playerName: "Alex Johnson" },
    };
    const result = await handler(mockEvent);
    expect(result).not.toHaveProperty("prefill");
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
