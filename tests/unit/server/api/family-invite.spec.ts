import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Shared mock state ───────────────────────────────────────────────────────
const state = {
  userId: "member-user-id",
  userEmail: "member@example.com",
  membership: { family_unit_id: "family-123" } as object | null,
  memberships: [
    {
      family_unit_id: "family-123",
      family_units: { created_by_user_id: "member-user-id" },
    },
  ] as Array<{
    family_unit_id: string;
    family_units: { created_by_user_id: string | null } | null;
  }>,
  existingUser: null as object | null,
  // Spy on users.update(...) so the guardian-consent write on minor acceptance
  // is observable. Returns a chainable .eq() to match the handler's call shape.
  usersUpdateSpy: vi.fn((_payload: unknown) => ({
    eq: () => Promise.resolve({ error: null }),
  })),
  existingMember: null as object | null,
  inviterProfile: { full_name: "Alice Smith" },
  family: { family_name: "Smith Family" } as {
    family_name: string;
    pending_player_details?: Record<string, unknown> | null;
  },
  insertedInvitation: { id: "invite-abc" } as object | null,
  insertError: null as object | null,
  familyMemberInsertSpy: vi.fn(() => Promise.resolve({ error: null })),
  // For token lookup
  invitation: null as Record<string, unknown> | null,
  // Overridable request body
  requestBody: { email: "invited@example.com", role: "parent" } as Record<
    string,
    unknown
  >,
};

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByUser: vi.fn(async () => ({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 3_600_000,
  })),
  throwIfRateLimited: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: state.userId,
    email: state.userEmail,
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/emailService", () => ({
  sendInviteEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Chainable eq builder — supports arbitrary depth of .eq() chaining
function chainableEq(opts: {
  single?: () => Promise<unknown>;
  maybeSingle?: () => Promise<unknown>;
  order?: () => Promise<unknown>;
}): ReturnType<typeof buildChain> {
  return buildChain(opts);
}
function buildChain(opts: {
  single?: () => Promise<unknown>;
  maybeSingle?: () => Promise<unknown>;
  order?: () => Promise<unknown>;
}): {
  eq: () => ReturnType<typeof buildChain>;
  single: () => Promise<unknown>;
  maybeSingle: () => Promise<unknown>;
  order: () => Promise<unknown>;
} {
  return {
    eq: () => buildChain(opts),
    single: opts.single ?? (() => Promise.resolve({ data: null, error: null })),
    maybeSingle:
      opts.maybeSingle ?? (() => Promise.resolve({ data: null, error: null })),
    order: opts.order ?? (() => Promise.resolve({ data: [], error: null })),
  };
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        // The invite handler awaits `.select(...).eq("user_id", id)` as a list,
        // while the existing-member check chains `.eq().eq().maybeSingle()`.
        // A thenable chain supports both, mirroring PostgrestFilterBuilder.
        const chain: Record<string, unknown> = {
          eq: () => chain,
          single: () =>
            Promise.resolve({ data: state.membership, error: null }),
          maybeSingle: () =>
            Promise.resolve({ data: state.existingMember, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
          then: (resolve: (v: unknown) => unknown) =>
            resolve({ data: state.memberships, error: null }),
        };
        return {
          select: () => chain,
          insert: state.familyMemberInsertSpy,
        };
      }
      if (table === "users") {
        return {
          select: () =>
            chainableEq({
              maybeSingle: () =>
                Promise.resolve({ data: state.existingUser, error: null }),
              single: () =>
                Promise.resolve({ data: state.inviterProfile, error: null }),
            }),
          update: state.usersUpdateSpy,
        };
      }
      if (table === "family_units") {
        return {
          select: () =>
            chainableEq({
              single: () =>
                Promise.resolve({ data: state.family, error: null }),
            }),
        };
      }
      if (table === "family_invitations") {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: state.insertedInvitation,
                  error: state.insertError,
                }),
            }),
          }),
          select: () =>
            chainableEq({
              single: () =>
                Promise.resolve({
                  data: state.invitation,
                  error: state.invitation ? null : { message: "not found" },
                }),
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          update: () => ({
            eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
          }),
          delete: () => ({
            eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
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
    readBody: vi.fn(async () => state.requestBody),
    getRouterParam: vi.fn((_, key: string) =>
      key === "token" ? "test-token" : "invite-abc",
    ),
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

// ─── POST /api/family/invite ──────────────────────────────────────────────────
describe("POST /api/family/invite", () => {
  beforeEach(() => {
    state.userId = "member-user-id";
    state.membership = { family_unit_id: "family-123" };
    state.memberships = [
      {
        family_unit_id: "family-123",
        family_units: { created_by_user_id: "member-user-id" },
      },
    ];
    state.existingUser = null;
    state.existingMember = null;
    state.insertedInvitation = { id: "invite-abc" };
    state.insertError = null;
    state.requestBody = { email: "invited@example.com", role: "parent" };
  });

  it("creates an invitation and returns token", async () => {
    const { default: handler } =
      await import("~/server/api/family/invite.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, invitationId: "invite-abc" });
  });

  it("rejects if inviter is not a family member", async () => {
    state.membership = null;
    state.memberships = [];
    const { default: handler } =
      await import("~/server/api/family/invite.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      "You are not a member of any family",
    );
  });

  it("rejects if invited email is already a member", async () => {
    state.existingUser = { id: "existing-user-id" };
    state.existingMember = { id: "member-1" };
    const { default: handler } =
      await import("~/server/api/family/invite.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      "This person is already a member of your family",
    );
  });

  it("returns 400 for an invalid email address", async () => {
    state.requestBody = { email: "not-an-email", role: "parent" };
    const { default: handler } =
      await import("~/server/api/family/invite.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 for an invalid role", async () => {
    state.requestBody = { email: "invited@example.com", role: "coach" };
    const { default: handler } =
      await import("~/server/api/family/invite.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── GET /api/family/invite/[token] ──────────────────────────────────────────
describe("GET /api/family/invite/[token]", () => {
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastDate = new Date(Date.now() - 1000).toISOString();

  beforeEach(() => {
    state.invitation = {
      id: "invite-abc",
      invited_email: "invited@example.com",
      role: "parent",
      status: "pending",
      expires_at: futureDate,
      family_unit_id: "family-123",
      invited_by: "inviter-id",
    };
  });

  it("returns family info for valid pending token without PII", async () => {
    const { default: handler } =
      await import("~/server/api/family/invite/[token].get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({
      invitationId: "invite-abc",
      role: "parent",
    });
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("emailExists");
    expect(result).not.toHaveProperty("inviterName");
  });

  it("returns 404 for unknown token", async () => {
    state.invitation = null;
    const { default: handler } =
      await import("~/server/api/family/invite/[token].get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      "Invitation not found",
    );
  });

  it("returns 410 Gone for expired token", async () => {
    state.invitation = { ...state.invitation!, expires_at: pastDate };
    const { default: handler } =
      await import("~/server/api/family/invite/[token].get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      "expired",
    );
  });

  it("returns 409 for already-accepted token", async () => {
    state.invitation = { ...state.invitation!, status: "accepted" };
    const { default: handler } =
      await import("~/server/api/family/invite/[token].get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      "no longer valid",
    );
  });
});

// ─── POST /api/family/invite/[token]/accept ───────────────────────────────────
describe("POST /api/family/invite/[token]/accept", () => {
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // A DOB ~15 years ago → a minor (13–17) whose acceptance must record consent.
  const minorDob = new Date(
    Date.now() - 15 * 365.25 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0];
  // A DOB ~20 years ago → an adult; no guardian consent should be recorded.
  const adultDob = new Date(
    Date.now() - 20 * 365.25 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0];

  beforeEach(() => {
    state.userId = "accepting-user-id";
    state.userEmail = "invited@example.com";
    state.existingMember = null;
    state.existingUser = null;
    state.invitation = {
      id: "invite-abc",
      family_unit_id: "family-123",
      invited_by: "inviting-parent-id",
      invited_email: "invited@example.com",
      role: "parent",
      status: "pending",
      expires_at: futureDate,
    };
    state.family = {
      family_name: "Smith Family",
      pending_player_details: null,
    };
    state.familyMemberInsertSpy = vi.fn(() => Promise.resolve({ error: null }));
    state.usersUpdateSpy = vi.fn((_payload: unknown) => ({
      eq: () => Promise.resolve({ error: null }),
    }));
  });

  it("creates family_member record and marks invitation accepted", async () => {
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({
      success: true,
      familyUnitId: "family-123",
    });
    expect(result).not.toHaveProperty("emailMismatch");
    expect(state.familyMemberInsertSpy).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when already a member", async () => {
    state.existingMember = { id: "existing-member" };
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
  });

  it("rejects with 403 when authenticated email does not match invited email", async () => {
    state.userEmail = "someone-else@example.com";
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 403 });
    // Family membership must be unchanged on a rejected mismatch attempt.
    expect(state.familyMemberInsertSpy).not.toHaveBeenCalled();
  });

  it("mismatch rejection message offers signing in with the invited account", async () => {
    state.userEmail = "someone-else@example.com";
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      /sign in|different email/i,
    );
  });

  it("is case-insensitive when comparing invited and authenticated email", async () => {
    state.userEmail = "INVITED@EXAMPLE.COM";
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
  });

  it("returns prefill for a player-role invite on successful acceptance", async () => {
    state.invitation = {
      ...state.invitation!,
      role: "player",
    };
    state.family = {
      family_name: "Smith Family",
      pending_player_details: {
        playerName: "Alex Johnson",
        graduationYear: 2027,
        sport: "Soccer",
        position: "Midfielder",
      },
    };
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({
      success: true,
      prefill: {
        firstName: "Alex",
        lastName: "Johnson",
        graduationYear: 2027,
        sport: "Soccer",
        position: "Midfielder",
      },
    });
  });

  it("records guardian consent when a minor (13-17) accepts a player invite", async () => {
    state.invitation = { ...state.invitation!, role: "player" };
    state.existingUser = { date_of_birth: minorDob };
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    await handler({} as Parameters<typeof handler>[0]);

    expect(state.usersUpdateSpy).toHaveBeenCalledTimes(1);
    expect(state.usersUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        guardian_consent_at: expect.any(String),
        // Consent is attributed to the inviting parent/guardian.
        guardian_consent_by: "inviting-parent-id",
        guardian_consent_terms_version: expect.anything(),
      }),
    );
  });

  it("does NOT record guardian consent when an adult accepts a player invite", async () => {
    state.invitation = { ...state.invitation!, role: "player" };
    state.existingUser = { date_of_birth: adultDob };
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    await handler({} as Parameters<typeof handler>[0]);

    expect(state.usersUpdateSpy).not.toHaveBeenCalled();
  });

  it("does NOT record guardian consent for a parent-role invite", async () => {
    // role stays "parent"; even a minor DOB must not trigger the consent write,
    // because the consent branch only runs for player-role acceptances.
    state.existingUser = { date_of_birth: minorDob };
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    await handler({} as Parameters<typeof handler>[0]);

    expect(state.usersUpdateSpy).not.toHaveBeenCalled();
  });
});
