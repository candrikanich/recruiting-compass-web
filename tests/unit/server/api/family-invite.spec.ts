import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  // Separate from usersUpdateSpy so the email-verification stamp (a distinct
  // .update() call on the same table) doesn't get mixed into guardian-consent
  // call assertions below.
  verifyStampSpy: vi.fn((_payload: unknown) => ({
    eq: () => ({ is: () => Promise.resolve({ error: null }) }),
  })),
  // Separate again for the onboarding-complete stamp so it doesn't get mixed
  // into guardian-consent assertions either.
  onboardingCompleteSpy: vi.fn((_payload: unknown) => ({
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
  // accept.post.ts now delegates the family_members insert + invitation
  // status update to the accept_family_invitation RPC (SECURITY DEFINER) --
  // spy on that call instead of the raw table writes it replaced.
  acceptRpcSpy: vi.fn((_args: unknown) => Promise.resolve({ error: null })),
  // Spy on family_invitations.insert({ ..., pending_player_details }) so the
  // invite-time snapshot is observable as part of the single insert write
  // (issue #898 follow-up: no longer a separate update after the insert).
  familyInvitationsInsertSpy: vi.fn((_payload: unknown) => undefined),
  // Set to make the family_units.pending_player_details read (used to build
  // the snapshot) throw, so tests can prove a draft-read failure still lets
  // the invitation get created (just without the snapshot).
  familyUnitsSelectThrows: false as boolean,
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

const fakeClientFactory = () => ({
  rpc: (fnName: string, args: unknown) => {
    if (fnName === "accept_family_invitation") return state.acceptRpcSpy(args);
    // invite.post.ts's duplicate-member check -- the raw family_members
    // maybeSingle() query this used to be still populates state.existingMember,
    // so route the RPC through the same test knob.
    if (fnName === "find_family_member_by_email") {
      const existingMemberId =
        state.existingMember && typeof state.existingMember === "object"
          ? ((state.existingMember as { id?: string }).id ?? null)
          : null;
      return Promise.resolve({ data: existingMemberId, error: null });
    }
    // [token].get.ts's get_family_invitation_by_token RPC (#979) -- mirrors
    // the real function's error_code branching over the same state.invitation
    // knob the old raw-query fake used, so the describe block below didn't
    // need rewriting when the route moved off raw .from() queries.
    if (fnName === "get_family_invitation_by_token") {
      const invitation = state.invitation as {
        id: string;
        role: string;
        invited_email: string;
        status: string;
        expires_at: string;
      } | null;
      const single = () => {
        if (!invitation) {
          return Promise.resolve({
            data: {
              invitation_id: null,
              role: null,
              family_name: null,
              invited_email: null,
              error_code: "NOT_FOUND",
            },
            error: null,
          });
        }
        if (invitation.status !== "pending") {
          return Promise.resolve({
            data: {
              invitation_id: null,
              role: null,
              family_name: null,
              invited_email: null,
              error_code: "INVALID_STATUS",
            },
            error: null,
          });
        }
        if (new Date(invitation.expires_at) < new Date()) {
          return Promise.resolve({
            data: {
              invitation_id: null,
              role: null,
              family_name: null,
              invited_email: null,
              error_code: "EXPIRED",
            },
            error: null,
          });
        }
        return Promise.resolve({
          data: {
            invitation_id: invitation.id,
            role: invitation.role,
            family_name: state.family?.family_name ?? "My Family",
            invited_email: invitation.invited_email,
            error_code: null,
          },
          error: null,
        });
      };
      return { single };
    }
    return Promise.resolve({ data: null, error: null });
  },
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
          update: (payload: Record<string, unknown>) => {
            if ("email_verified_at" in payload)
              return state.verifyStampSpy(payload);
            if ("phase_milestone_data" in payload)
              return state.onboardingCompleteSpy(payload);
            return state.usersUpdateSpy(payload);
          },
        };
      }
      if (table === "family_units") {
        return {
          // invite.post.ts selects "family_name" for the invite email (must
          // never throw here) and separately "pending_player_details" to
          // build the snapshot — only the latter simulates a failure.
          select: (columns: string) => {
            if (
              state.familyUnitsSelectThrows &&
              columns === "pending_player_details"
            ) {
              throw new Error("family_units select blew up");
            }
            return chainableEq({
              single: () =>
                Promise.resolve({ data: state.family, error: null }),
            });
          },
        };
      }
      if (table === "family_invitations") {
        return {
          insert: (payload: Record<string, unknown>) => {
            state.familyInvitationsInsertSpy(payload);
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: state.insertedInvitation,
                    error: state.insertError,
                  }),
              }),
            };
          },
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
          // accept.post.ts stamps status/accepted_at on the invitation it's
          // accepting.
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
});

// [token].get.ts is pre-auth (no session to scope to) and went through the
// RPC-based createServerSupabaseAnonClient() migration in #979.
// invite.post.ts and accept.post.ts use the session-scoped one -- all three
// mock functions alias the same factory, but stay separate exports so the
// accept describe block below can assert useSupabaseAdmin is never called
// during its own tests.
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(fakeClientFactory),
  createServerSupabaseUserClient: vi.fn(fakeClientFactory),
  createServerSupabaseAnonClient: vi.fn(fakeClientFactory),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
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
    state.family = { family_name: "Smith Family" };
    state.familyInvitationsInsertSpy = vi.fn((_payload: unknown) => undefined);
    state.familyUnitsSelectThrows = false;
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

  // Regression for issue #895: iOS's ParentOnboardingWizardViewModel sends
  // pending_player_details on a player-role invite (first_name/last_name,
  // sport, position, graduation_year) — the schema previously didn't declare
  // the field at all, so Zod silently stripped it and nothing was persisted.
  describe("pending_player_details (issue #895)", () => {
    it("persists player details on a player-role invite, combining first/last name into the canonical playerName shape", async () => {
      state.requestBody = {
        email: "player@example.com",
        role: "player",
        pending_player_details: {
          first_name: "Alex",
          last_name: "Johnson",
          sport: "Soccer",
          position: "Midfielder",
          graduation_year: 2027,
        },
      };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({ success: true });
      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_player_details: {
            playerName: "Alex Johnson",
            graduationYear: 2027,
            sport: "Soccer",
            position: "Midfielder",
          },
        }),
      );
    });

    it("omits sport/position/graduationYear from the persisted shape when not provided", async () => {
      state.requestBody = {
        email: "player@example.com",
        role: "player",
        pending_player_details: {
          first_name: "Alex",
          last_name: "Johnson",
        },
      };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      await handler({} as Parameters<typeof handler>[0]);

      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_player_details: { playerName: "Alex Johnson" },
        }),
      );
    });

    it("does not include pending_player_details on the insert when omitted and the family has no staged draft", async () => {
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      await handler({} as Parameters<typeof handler>[0]);

      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          pending_player_details: expect.anything(),
        }),
      );
    });

    it("ignores pending_player_details on a parent-role invite (no player to describe)", async () => {
      state.requestBody = {
        email: "parent@example.com",
        role: "parent",
        pending_player_details: {
          first_name: "Alex",
          last_name: "Johnson",
        },
      };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({ success: true });
      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          pending_player_details: expect.anything(),
        }),
      );
    });

    it("returns 400 when pending_player_details is provided but missing required names", async () => {
      state.requestBody = {
        email: "player@example.com",
        role: "player",
        pending_player_details: { sport: "Soccer" },
      };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(state.familyInvitationsInsertSpy).not.toHaveBeenCalled();
    });

    // Review comment (issue #898 follow-up): the snapshot is now built BEFORE
    // the insert and included in the same write, so a failed snapshot read
    // must still let the invitation get created (just without the snapshot),
    // not surface as a 500.
    it("does not fail the whole invite when building the snapshot throws", async () => {
      state.familyUnitsSelectThrows = true;
      state.requestBody = {
        email: "player@example.com",
        role: "player",
        pending_player_details: { first_name: "Alex", last_name: "Johnson" },
      };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({
        success: true,
        invitationId: "invite-abc",
      });
      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          pending_player_details: expect.anything(),
        }),
      );
    });

    // iOS's onboarding invite step (ParentOnboardingWizardViewModel.sendInvite)
    // validates only the email field and deliberately sends an empty last name.
    it("accepts an empty last_name (iOS's invite step doesn't require one)", async () => {
      state.requestBody = {
        email: "player@example.com",
        role: "player",
        pending_player_details: { first_name: "Alex", last_name: "" },
      };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({ success: true });
      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_player_details: expect.objectContaining({
            playerName: "Alex",
          }),
        }),
      );
    });

    // Review comment: a wholesale overwrite would silently drop playerDob/gender
    // previously staged by server/api/family/player-details.post.ts, which
    // this endpoint doesn't receive over the wire at all.
    it("preserves playerDob/gender already staged on the family when merging in the invite's fields", async () => {
      state.family = {
        family_name: "Smith Family",
        pending_player_details: {
          playerName: "Old Name",
          playerDob: "2010-05-01",
          gender: "female",
        },
      };
      state.requestBody = {
        email: "player@example.com",
        role: "player",
        pending_player_details: {
          first_name: "Alex",
          last_name: "Johnson",
          sport: "Soccer",
        },
      };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      await handler({} as Parameters<typeof handler>[0]);

      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_player_details: {
            playerDob: "2010-05-01",
            gender: "female",
            playerName: "Alex Johnson",
            sport: "Soccer",
          },
        }),
      );
    });
  });

  // Issue #898: pending_player_details moved to invitation-scoped storage so a
  // family with more than one pending player invite doesn't have a later
  // invite's snapshot clobber an earlier one's.
  describe("invitation-scoped pending_player_details (issue #898)", () => {
    it("snapshots the invitation onto its OWN row at creation time, not the family row directly, even without a wire payload (web's flow: parent stages details via player-details.post.ts, then sends a bare invite)", async () => {
      state.family = {
        family_name: "Smith Family",
        pending_player_details: {
          playerName: "Staged Player",
          graduationYear: 2026,
          sport: "Baseball",
        },
      };
      state.requestBody = { email: "player@example.com", role: "player" };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      await handler({} as Parameters<typeof handler>[0]);

      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_player_details: {
            playerName: "Staged Player",
            graduationYear: 2026,
            sport: "Baseball",
          },
        }),
      );
    });

    it("a second player invite's snapshot does not depend on or clobber the first invitation's row (each insert carries its own snapshot)", async () => {
      state.family = {
        family_name: "Smith Family",
        pending_player_details: { playerName: "Second Child", sport: "Soccer" },
      };
      state.insertedInvitation = { id: "invite-second-child" };
      state.requestBody = {
        email: "second@example.com",
        role: "player",
        pending_player_details: { first_name: "Second", last_name: "Child" },
      };
      const { default: handler } =
        await import("~/server/api/family/invite.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({ invitationId: "invite-second-child" });
      expect(state.familyInvitationsInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_player_details: expect.objectContaining({
            playerName: "Second Child",
          }),
        }),
      );
    });
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
  const minorDob = new Date(Date.now() - 15 * 365.25 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  // A DOB ~20 years ago → an adult; no guardian consent should be recorded.
  const adultDob = new Date(Date.now() - 20 * 365.25 * 24 * 60 * 60 * 1000)
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
    state.acceptRpcSpy = vi.fn((_args: unknown) =>
      Promise.resolve({ error: null }),
    );
    state.usersUpdateSpy = vi.fn((_payload: unknown) => ({
      eq: () => Promise.resolve({ error: null }),
    }));
    state.verifyStampSpy = vi.fn((_payload: unknown) => ({
      eq: () => ({ is: () => Promise.resolve({ error: null }) }),
    }));
    state.onboardingCompleteSpy = vi.fn((_payload: unknown) => ({
      eq: () => Promise.resolve({ error: null }),
    }));
  });

  afterEach(async () => {
    // Regression guard: fakeClientFactory returns the same shape for both
    // clients, so a handler reverting to the privileged one would otherwise
    // pass every assertion below undetected.
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    expect(useSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("stamps the accepting user's email as verified", async () => {
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    await handler({} as Parameters<typeof handler>[0]);

    expect(state.verifyStampSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email_verified_at: expect.any(String) }),
    );
    const { createServerSupabaseUserClient } = await import(
      "~/server/utils/supabase"
    );
    expect(createServerSupabaseUserClient).toHaveBeenCalledWith("fake-token");
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
    expect(state.acceptRpcSpy).toHaveBeenCalledTimes(1);
    expect(state.acceptRpcSpy).toHaveBeenCalledWith({
      p_invitation_id: "invite-abc",
    });
  });

  // Idempotency (skip-insert-if-already-a-member) now lives inside the
  // accept_family_invitation RPC itself, not in route-level branching --
  // this just confirms the route still calls it and returns success either
  // way; the actual idempotent-skip behavior is covered by the live RLS
  // integration spec.
  it("is idempotent when already a member", async () => {
    state.existingMember = { id: "existing-member" };
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
    expect(state.acceptRpcSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects with 403 when authenticated email does not match invited email", async () => {
    state.userEmail = "someone-else@example.com";
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 403 });
    // Family membership must be unchanged on a rejected mismatch attempt.
    expect(state.acceptRpcSpy).not.toHaveBeenCalled();
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

  // Issue #898: two pending player invitations in the same family must not
  // share one another's details — each accept reads its own invitation row.
  it("hydrates only its own invitation's pending_player_details when a second pending player invite exists in the same family", async () => {
    state.invitation = {
      ...state.invitation!,
      role: "player",
      pending_player_details: {
        playerName: "First Child",
        graduationYear: 2027,
        sport: "Soccer",
      },
    };
    const { default: handler } =
      await import("~/server/api/family/invite/[token]/accept.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({
      success: true,
      prefill: { firstName: "First", lastName: "Child" },
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

  // A player skipping the onboarding wizard client-side (see pages/join.vue)
  // must have onboarding_complete stamped here first, or the global onboarding
  // middleware bounces them straight back out of /dashboard in a loop.
  describe("onboarding-complete stamping", () => {
    it("marks a parent-role acceptance onboarding-complete (nothing left for a second parent to enter)", async () => {
      const { default: handler } =
        await import("~/server/api/family/invite/[token]/accept.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({ onboardingComplete: true });
      expect(state.onboardingCompleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          phase_milestone_data: expect.objectContaining({
            onboarding_complete: true,
          }),
        }),
      );
    });

    it("marks a player-role acceptance onboarding-complete when the parent staged both graduation year and sport", async () => {
      state.invitation = {
        ...state.invitation!,
        role: "player",
        pending_player_details: {
          playerName: "Alex Johnson",
          graduationYear: 2027,
          sport: "Soccer",
        },
      };
      const { default: handler } =
        await import("~/server/api/family/invite/[token]/accept.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({ onboardingComplete: true });
      expect(state.onboardingCompleteSpy).toHaveBeenCalledTimes(1);
    });

    it("does NOT mark a player-role acceptance onboarding-complete when grad year/sport are missing, so the client falls back to the wizard", async () => {
      state.invitation = {
        ...state.invitation!,
        role: "player",
        pending_player_details: { playerName: "Alex Johnson" },
      };
      const { default: handler } =
        await import("~/server/api/family/invite/[token]/accept.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({ onboardingComplete: false });
      expect(state.onboardingCompleteSpy).not.toHaveBeenCalled();
    });

    it("does NOT mark a player-role acceptance onboarding-complete with no pending_player_details at all", async () => {
      state.invitation = { ...state.invitation!, role: "player" };
      // pending_player_details stays absent from the outer beforeEach's invitation.
      const { default: handler } =
        await import("~/server/api/family/invite/[token]/accept.post");
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toMatchObject({ onboardingComplete: false });
      expect(state.onboardingCompleteSpy).not.toHaveBeenCalled();
    });
  });
});
