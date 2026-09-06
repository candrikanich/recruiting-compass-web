import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getRouterParam: vi.fn(),
    readBody: vi.fn(),
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
  school: undefined as Record<string, unknown> | null | undefined,
  insertedInteraction: undefined as Record<string, unknown> | undefined,
  updatedDraft: undefined as Record<string, unknown> | undefined,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: mockState.membership, error: null }) }) }),
        };
      }
      if (table === "inbound_email_drafts") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: mockState.draft, error: null }) }),
          }),
          update: (row: Record<string, unknown>) => {
            mockState.updatedDraft = row;
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === "schools") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: mockState.school, error: null }) }),
            }),
          }),
        };
      }
      if (table === "interactions") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.insertedInteraction = row;
            return {
              select: () => ({ single: async () => ({ data: { id: "interaction-1" }, error: null }) }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { getRouterParam, readBody } from "h3";
import { requireAuth } from "~/server/utils/auth";

describe("POST /api/inbound-drafts/:id/confirm", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getRouterParam).mockReturnValue("draft-1");
    vi.mocked(readBody).mockResolvedValue({});
    mockState.membership = { family_unit_id: "family-1" };
    mockState.school = undefined;
    mockState.insertedInteraction = undefined;
    mockState.updatedDraft = undefined;
  });

  it("404s when the draft isn't found or belongs to another family", async () => {
    mockState.draft = null;
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 404 });
  });

  it("422s when unmatched and no schoolId is provided", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "pending",
      matched_school_id: null,
      matched_coach_id: null,
      sender_name: "Coach Smith",
      subject: "Fwd: Camp",
      body_text: "hi",
      occurred_at: "2026-09-02T15:15:00.000Z",
    };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 422 });
  });

  it("422s when the caller-supplied schoolId belongs to a different family", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "pending",
      matched_school_id: null,
      matched_coach_id: null,
      sender_name: "Coach Smith",
      subject: "Fwd: Camp",
      body_text: "hi",
      occurred_at: "2026-09-02T15:15:00.000Z",
    };
    mockState.school = null; // schools query scoped to family-1 finds nothing
    vi.mocked(readBody).mockResolvedValue({ schoolId: "11111111-1111-1111-1111-111111111111" });
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 422 });
    expect(mockState.insertedInteraction).toBeUndefined();
  });

  it("creates the interaction and marks the draft confirmed", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "pending",
      matched_school_id: "school-1",
      matched_coach_id: "coach-1",
      subject: "Fwd: Camp",
      body_text: "hi",
      occurred_at: "2026-09-02T15:15:00.000Z",
      confirmed_interaction_id: null,
    };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(mockState.insertedInteraction).toMatchObject({
      family_unit_id: "family-1",
      school_id: "school-1",
      coach_id: "coach-1",
      direction: "inbound",
      type: "email",
      logged_by: "user-1",
    });
    expect(mockState.updatedDraft).toMatchObject({
      status: "confirmed",
      confirmed_interaction_id: "interaction-1",
    });
    expect(result).toEqual({ ok: true, interactionId: "interaction-1" });
  });

  it("is idempotent: re-confirming returns the existing interactionId without a new insert", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "confirmed",
      confirmed_interaction_id: "interaction-existing",
    };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, interactionId: "interaction-existing" });
    expect(mockState.insertedInteraction).toBeUndefined();
  });
});
