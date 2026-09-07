import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getRouterParam: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), { statusCode: opts.statusCode }),
  };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  membership: { family_unit_id: "family-1" } as { family_unit_id: string } | null,
  draft: undefined as Record<string, unknown> | null | undefined,
  updatedDraft: undefined as Record<string, unknown> | undefined,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: mockState.membership, error: null }) }) }) };
      }
      if (table === "inbound_email_drafts") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockState.draft, error: null }) }) }),
          update: (row: Record<string, unknown>) => {
            mockState.updatedDraft = row;
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { getRouterParam } from "h3";
import { requireAuth } from "~/server/utils/auth";

describe("POST /api/inbound-drafts/:id/discard", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getRouterParam).mockReturnValue("550e8400-e29b-41d4-a716-446655440000");
    mockState.membership = { family_unit_id: "family-1" };
    mockState.updatedDraft = undefined;
  });

  it("404s for a draft belonging to another family", async () => {
    mockState.draft = { id: "550e8400-e29b-41d4-a716-446655440000", family_unit_id: "family-OTHER", status: "pending" };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/discard.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 404 });
  });

  it("marks a pending draft discarded", async () => {
    mockState.draft = { id: "550e8400-e29b-41d4-a716-446655440000", family_unit_id: "family-1", status: "pending" };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/discard.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.updatedDraft).toMatchObject({ status: "discarded" });
    expect(result).toEqual({ ok: true });
  });

  it("is a no-op success for an already-confirmed draft (never overwrites a real interaction link)", async () => {
    mockState.draft = { id: "550e8400-e29b-41d4-a716-446655440000", family_unit_id: "family-1", status: "confirmed" };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/discard.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.updatedDraft).toBeUndefined();
    expect(result).toEqual({ ok: true });
  });

  // Any attachments staged with this draft (issue #586 Phase 3 Task 3) stay
  // in `raw_inbound_attachments`, untouched — discard is not the purge job's
  // responsibility. Proven here by the mock's `from()` throwing on any table
  // other than `family_members`/`inbound_email_drafts`: if discard ever
  // queried `raw_inbound_attachments` or `documents`, this test would fail
  // with "unexpected table", not a normal assertion failure.
  it("never touches raw_inbound_attachments or documents when discarding", async () => {
    mockState.draft = { id: "550e8400-e29b-41d4-a716-446655440000", family_unit_id: "family-1", status: "pending" };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/discard.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true });
    expect(mockState.updatedDraft).toMatchObject({ status: "discarded" });
  });
});
