import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getRouterParam: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockState = {
  membership: { family_unit_id: "family-1" } as {
    family_unit_id: string;
  } | null,
  draft: undefined as Record<string, unknown> | null | undefined,
  rpcCalledWith: undefined as Record<string, unknown> | undefined,
  rpcError: null as object | null,
};

const fakeClient = () => ({
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
    if (table === "inbound_email_drafts") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mockState.draft, error: null }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  },
  rpc: (fn: string, args: Record<string, unknown>) => {
    if (fn !== "discard_inbound_draft") {
      throw new Error(`unexpected rpc ${fn}`);
    }
    mockState.rpcCalledWith = args;
    return Promise.resolve({ data: null, error: mockState.rpcError });
  },
});

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: fakeClient,
  createServerSupabaseUserClient: fakeClient,
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

import { getRouterParam } from "h3";
import { requireAuth } from "~/server/utils/auth";

describe("POST /api/inbound-drafts/:id/discard", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getRouterParam).mockReturnValue(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    mockState.membership = { family_unit_id: "family-1" };
    mockState.rpcCalledWith = undefined;
    mockState.rpcError = null;
  });

  it("404s for a draft belonging to another family", async () => {
    mockState.draft = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      family_unit_id: "family-OTHER",
      status: "pending",
    };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/discard.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("marks a pending draft discarded", async () => {
    mockState.draft = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      family_unit_id: "family-1",
      status: "pending",
    };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/discard.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.rpcCalledWith).toEqual({
      p_draft_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result).toEqual({ ok: true });
  });

  it("is a no-op success for an already-confirmed draft (never overwrites a real interaction link)", async () => {
    mockState.draft = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      family_unit_id: "family-1",
      status: "confirmed",
    };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/discard.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.rpcCalledWith).toBeUndefined();
    expect(result).toEqual({ ok: true });
  });

  // Any attachments staged with this draft (issue #586 Phase 3 Task 3) stay
  // in `raw_inbound_attachments`, untouched — discard is not the purge job's
  // responsibility. Proven here by the mock's `from()` throwing on any table
  // other than `family_members`/`inbound_email_drafts`, and `rpc()` throwing
  // on any function other than `discard_inbound_draft`: if discard ever
  // touched `raw_inbound_attachments` or `documents`, this test would fail
  // with "unexpected table"/"unexpected rpc", not a normal assertion failure.
  it("never touches raw_inbound_attachments or documents when discarding", async () => {
    mockState.draft = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      family_unit_id: "family-1",
      status: "pending",
    };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/discard.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true });
    expect(mockState.rpcCalledWith).toEqual({
      p_draft_id: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("returns 500 when the discard RPC errors", async () => {
    mockState.draft = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      family_unit_id: "family-1",
      status: "pending",
    };
    mockState.rpcError = { message: "db error" };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/discard.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
