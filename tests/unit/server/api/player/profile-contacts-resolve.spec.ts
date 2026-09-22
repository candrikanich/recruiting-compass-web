/**
 * POST /api/player/profile/contacts/:id/resolve — handler behavior.
 *
 * resolveBodySchema itself is covered separately in
 * tests/unit/server/api/resolveLead.validation.spec.ts; this covers the
 * handler's family-scope check, idempotency guard, and the RPC-backed
 * mutation (#912 -- session-scoped client, resolve_profile_contact_lead
 * SECURITY DEFINER RPC instead of a raw UPDATE).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

const LEAD_ID = "550e8400-e29b-41d4-a716-446655440000";
const INTERACTION_ID = "660e8400-e29b-41d4-a716-446655440000";

const mockState = {
  membership: { family_unit_id: "family-1" } as {
    family_unit_id: string;
  } | null,
  lead: undefined as Record<string, unknown> | null | undefined,
  rpcCalledWith: undefined as Record<string, unknown> | undefined,
  rpcError: null as object | null,
  rpcReturnsStoredLead: undefined as Record<string, unknown> | undefined,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: mockState.membership, error: null }),
            }),
          }),
        };
      }
      if (table === "profile_contacts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockState.lead, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: (fn: string, args: Record<string, unknown>) => {
      if (fn !== "resolve_profile_contact_lead") {
        throw new Error(`unexpected rpc ${fn}`);
      }
      mockState.rpcCalledWith = args;
      if (mockState.rpcError) {
        return Promise.resolve({ data: null, error: mockState.rpcError });
      }
      // Mirrors the RPC's real return shape: the row it actually stored,
      // which a concurrent resolution's idempotency guard may have pinned
      // to a different status/interaction than this request's own args.
      return Promise.resolve({
        data:
          mockState.rpcReturnsStoredLead ?? {
            status: args.p_status,
            interaction_id: args.p_interaction_id,
          },
        error: null,
      });
    },
  })),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => LEAD_ID),
    readBody: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(opts.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = opts.statusCode;
      return err;
    },
  };
});

import { readBody } from "h3";

const mockEvent = {} as H3Event;

describe("POST /api/player/profile/contacts/:id/resolve", () => {
  beforeEach(() => {
    vi.mocked(readBody).mockResolvedValue({});
    mockState.membership = { family_unit_id: "family-1" };
    mockState.rpcCalledWith = undefined;
    mockState.rpcError = null;
    mockState.rpcReturnsStoredLead = undefined;
  });

  it("dismisses a pending lead via the RPC", async () => {
    mockState.lead = {
      id: LEAD_ID,
      status: "pending",
      interaction_id: null,
      family_unit_id: "family-1",
    };
    vi.mocked(readBody).mockResolvedValue({ status: "dismissed" });
    const { default: handler } = await import(
      "~/server/api/player/profile/contacts/[id]/resolve.post"
    );

    const result = await handler(mockEvent);

    expect(mockState.rpcCalledWith).toEqual({
      p_lead_id: LEAD_ID,
      p_status: "dismissed",
      p_interaction_id: null,
    });
    expect(result).toEqual({
      ok: true,
      status: "dismissed",
      interactionId: null,
    });
  });

  it("resolves a pending lead with an interactionId via the RPC", async () => {
    mockState.lead = {
      id: LEAD_ID,
      status: "pending",
      interaction_id: null,
      family_unit_id: "family-1",
    };
    vi.mocked(readBody).mockResolvedValue({
      status: "resolved",
      interactionId: INTERACTION_ID,
    });
    const { default: handler } = await import(
      "~/server/api/player/profile/contacts/[id]/resolve.post"
    );

    const result = await handler(mockEvent);

    expect(mockState.rpcCalledWith).toEqual({
      p_lead_id: LEAD_ID,
      p_status: "resolved",
      p_interaction_id: INTERACTION_ID,
    });
    expect(result).toEqual({
      ok: true,
      status: "resolved",
      interactionId: INTERACTION_ID,
    });
  });

  it("422s resolving without an interactionId", async () => {
    mockState.lead = {
      id: LEAD_ID,
      status: "pending",
      interaction_id: null,
      family_unit_id: "family-1",
    };
    vi.mocked(readBody).mockResolvedValue({ status: "resolved" });
    const { default: handler } = await import(
      "~/server/api/player/profile/contacts/[id]/resolve.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(mockState.rpcCalledWith).toBeUndefined();
  });

  it("is idempotent: an already-resolved lead never calls the RPC again", async () => {
    mockState.lead = {
      id: LEAD_ID,
      status: "resolved",
      interaction_id: "interaction-existing",
      family_unit_id: "family-1",
    };
    vi.mocked(readBody).mockResolvedValue({
      status: "resolved",
      interactionId: INTERACTION_ID,
    });
    const { default: handler } = await import(
      "~/server/api/player/profile/contacts/[id]/resolve.post"
    );

    const result = await handler(mockEvent);

    expect(mockState.rpcCalledWith).toBeUndefined();
    expect(result).toEqual({
      ok: true,
      status: "resolved",
      interactionId: "interaction-existing",
    });
  });

  it("404s for a lead belonging to another family", async () => {
    mockState.lead = {
      id: LEAD_ID,
      status: "pending",
      interaction_id: null,
      family_unit_id: "family-OTHER",
    };
    vi.mocked(readBody).mockResolvedValue({ status: "dismissed" });
    const { default: handler } = await import(
      "~/server/api/player/profile/contacts/[id]/resolve.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("403s when the caller has no family membership", async () => {
    mockState.membership = null;
    vi.mocked(readBody).mockResolvedValue({ status: "dismissed" });
    const { default: handler } = await import(
      "~/server/api/player/profile/contacts/[id]/resolve.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("returns 500 when the RPC errors", async () => {
    mockState.lead = {
      id: LEAD_ID,
      status: "pending",
      interaction_id: null,
      family_unit_id: "family-1",
    };
    mockState.rpcError = { message: "db error" };
    vi.mocked(readBody).mockResolvedValue({ status: "dismissed" });
    const { default: handler } = await import(
      "~/server/api/player/profile/contacts/[id]/resolve.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  // Regression (qodo review on PR #949): a concurrent request could resolve
  // this lead between our own read and the RPC's lock, in which case the
  // RPC's idempotency guard preserves that earlier resolution instead of
  // applying ours. The response must report what was actually stored, not
  // blindly echo back the request body.
  it("reports the RPC's stored resolution, not the requested one, when a concurrent request won the race", async () => {
    mockState.lead = {
      id: LEAD_ID,
      status: "pending",
      interaction_id: null,
      family_unit_id: "family-1",
    };
    mockState.rpcReturnsStoredLead = {
      status: "dismissed",
      interaction_id: null,
    };
    vi.mocked(readBody).mockResolvedValue({
      status: "resolved",
      interactionId: INTERACTION_ID,
    });
    const { default: handler } = await import(
      "~/server/api/player/profile/contacts/[id]/resolve.post"
    );

    const result = await handler(mockEvent);

    expect(result).toEqual({
      ok: true,
      status: "dismissed",
      interactionId: null,
    });
  });
});
