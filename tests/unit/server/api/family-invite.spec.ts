import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Shared mock state ───────────────────────────────────────────────────────
const state = {
  userId: "member-user-id",
  userEmail: "member@example.com",
  membership: { family_unit_id: "family-123" } as object | null,
  existingUser: null as object | null,
  existingMember: null as object | null,
  inviterProfile: { full_name: "Alice Smith" },
  family: { family_name: "Smith Family" },
  insertedInvitation: { id: "invite-abc" } as object | null,
  insertError: null as object | null,
  // For token lookup
  invitation: null as Record<string, unknown> | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: state.userId, email: state.userEmail })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
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
    maybeSingle: opts.maybeSingle ?? (() => Promise.resolve({ data: null, error: null })),
    order: opts.order ?? (() => Promise.resolve({ data: [], error: null })),
  };
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () =>
            chainableEq({
              single: () => Promise.resolve({ data: state.membership, error: null }),
              maybeSingle: () => Promise.resolve({ data: state.existingMember, error: null }),
            }),
          insert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === "users") {
        return {
          select: () =>
            chainableEq({
              maybeSingle: () => Promise.resolve({ data: state.existingUser, error: null }),
              single: () => Promise.resolve({ data: state.inviterProfile, error: null }),
            }),
        };
      }
      if (table === "family_units") {
        return {
          select: () =>
            chainableEq({
              single: () => Promise.resolve({ data: state.family, error: null }),
            }),
        };
      }
      if (table === "family_invitations") {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: state.insertedInvitation, error: state.insertError }),
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
          update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
          delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
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
    readBody: vi.fn(async () => ({ email: "invited@example.com", role: "parent" })),
    getRouterParam: vi.fn((_, key: string) => (key === "token" ? "test-token" : "invite-abc")),
    createError: (config: { statusCode: number; statusMessage?: string; message?: string }) => {
      const err = new Error(config.statusMessage ?? config.message) as Error & { statusCode: number };
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
    state.existingUser = null;
    state.existingMember = null;
    state.insertedInvitation = { id: "invite-abc" };
    state.insertError = null;
  });

  it("creates an invitation and returns token", async () => {
    const { default: handler } = await import("~/server/api/family/invite.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, invitationId: "invite-abc" });
  });

  it("rejects if inviter is not a family member", async () => {
    state.membership = null;
    const { default: handler } = await import("~/server/api/family/invite.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      "You are not a member of any family",
    );
  });

  it("rejects if invited email is already a member", async () => {
    state.existingUser = { id: "existing-user-id" };
    state.existingMember = { id: "member-1" };
    const { default: handler } = await import("~/server/api/family/invite.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      "This person is already a member of your family",
    );
  });
});

// ─── GET /api/family/invite/[token] ──────────────────────────────────────────
describe("GET /api/family/invite/[token]", () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
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

  it("returns family info for valid pending token", async () => {
    const { default: handler } = await import("~/server/api/family/invite/[token].get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ role: "parent", email: "invited@example.com" });
  });

  it("returns 404 for unknown token", async () => {
    state.invitation = null;
    const { default: handler } = await import("~/server/api/family/invite/[token].get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow("Invitation not found");
  });

  it("returns 410 Gone for expired token", async () => {
    state.invitation = { ...state.invitation!, expires_at: pastDate };
    const { default: handler } = await import("~/server/api/family/invite/[token].get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow("expired");
  });

  it("returns 409 for already-accepted token", async () => {
    state.invitation = { ...state.invitation!, status: "accepted" };
    const { default: handler } = await import("~/server/api/family/invite/[token].get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow("already been accepted");
  });
});

// ─── POST /api/family/invite/[token]/accept ───────────────────────────────────
describe("POST /api/family/invite/[token]/accept", () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    state.userId = "accepting-user-id";
    state.userEmail = "invited@example.com";
    state.existingMember = null;
    state.invitation = {
      id: "invite-abc",
      family_unit_id: "family-123",
      invited_email: "invited@example.com",
      role: "parent",
      status: "pending",
      expires_at: futureDate,
    };
  });

  it("creates family_member record and marks invitation accepted", async () => {
    const { default: handler } = await import(
      "~/server/api/family/invite/[token]/accept.post"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, familyUnitId: "family-123", emailMismatch: false });
  });

  it("is idempotent when already a member", async () => {
    state.existingMember = { id: "existing-member" };
    const { default: handler } = await import(
      "~/server/api/family/invite/[token]/accept.post"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
  });
});
