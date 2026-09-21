import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "player-user-id",
  userEmail: "player@example.com",
  invitation: null as Record<string, unknown> | null,
  acceptingUserDob: null as string | null,
};

function eqResult(payload: { error?: unknown }) {
  const promise = Promise.resolve(payload);
  return Object.assign(promise, {
    is: () => Promise.resolve(payload),
  });
}

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: mockState.userId,
    email: mockState.userEmail,
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "supabase-token"),
}));

vi.mock("~/server/utils/hydrateAthleteProfile", () => ({
  hydrateAthleteFromPendingDetails: vi.fn(async () => {}),
}));

vi.mock("~/server/utils/onboardingComplete", () => ({
  markOnboardingComplete: vi.fn(async () => {}),
}));

vi.mock("~/utils/age", () => ({
  requiresGuardianInvite: vi.fn(() => false),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_invitations") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockState.invitation }),
            }),
          }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { date_of_birth: mockState.acceptingUserDob },
                }),
            }),
          }),
          update: () => ({
            eq: () => eqResult({ error: null }),
          }),
        };
      }
      return {};
    },
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getRouterParam: vi.fn(() => "test-token"),
  };
});

const { default: handler } = await import(
  "~/server/api/family/invite/[token]/accept.post"
);
const mockEvent = {} as Parameters<typeof handler>[0];

describe("POST /api/family/invite/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.userId = "player-user-id";
    mockState.userEmail = "player@example.com";
    mockState.acceptingUserDob = "2010-05-01";
    mockState.invitation = {
      id: "inv-1",
      family_unit_id: "fam-1",
      invited_email: "player@example.com",
      role: "player",
      status: "pending",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      invited_by: "parent-user-id",
      pending_player_details: {
        playerName: "Alex Johnson",
        playerDob: "2011-06-15",
      },
    };
  });

  it("returns prefill.dateOfBirth from pending_player_details.playerDob when present", async () => {
    const result = await handler(mockEvent);
    expect(result.prefill).toMatchObject({ dateOfBirth: "2011-06-15" });
  });

  it("omits prefill.dateOfBirth when pending_player_details has no playerDob", async () => {
    (
      mockState.invitation as { pending_player_details: Record<string, unknown> }
    ).pending_player_details = { playerName: "Alex Johnson" };

    const result = await handler(mockEvent);
    expect(result.prefill).not.toHaveProperty("dateOfBirth");
  });

  it("returns prefill.dateOfBirth regardless of the accepting user's existing date_of_birth (hydration fill-if-empty is independent)", async () => {
    mockState.acceptingUserDob = "1999-01-01";

    const result = await handler(mockEvent);
    expect(result.prefill).toMatchObject({ dateOfBirth: "2011-06-15" });
  });

  it("returns no prefill field at all for parent-role invites", async () => {
    (mockState.invitation as Record<string, unknown>).role = "parent";

    const result = await handler(mockEvent);
    expect(result).not.toHaveProperty("prefill");
  });
});
