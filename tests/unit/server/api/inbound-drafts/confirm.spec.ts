import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getRouterParam: vi.fn(),
    readBody: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/resolveAthleteId", () => ({
  resolveAthleteId: vi.fn(async (userId: string) => {
    if (mockState.callerRole !== "parent") return userId;
    return mockState.playerMember?.user_id ?? userId;
  }),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockState = {
  draft: undefined as Record<string, unknown> | null | undefined,
  rpcCalledWith: undefined as Record<string, unknown> | undefined,
  rpcError: null as { message: string } | null,
  // Simulates the RPC's own return: the confirmed draft row and the
  // interaction id it created (or, on the idempotent/race-loser path, the
  // id whichever request actually won).
  rpcInteractionId: "interaction-1" as string | null,
  interactionSchoolId: "school-1" as string | undefined,
  stagedAttachments: [] as Record<string, unknown>[],
  documentInsertRows: undefined as Record<string, unknown>[] | undefined,
  // resolveAthleteId's dependencies: the confirming user's role, and (when
  // they're a parent) their family's player member.
  callerRole: "parent" as "parent" | "player",
  playerMember: { user_id: "player-1" } as { user_id: string } | null,
};

const fakeClient = () => ({
  from: (table: string) => {
    if (table === "inbound_email_drafts") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mockState.draft, error: null }),
          }),
        }),
      };
    }
    if (table === "interactions") {
      // Only used by the attachments branch, to look up the school_id of
      // the interaction the RPC just created.
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data:
                mockState.interactionSchoolId !== undefined
                  ? { school_id: mockState.interactionSchoolId }
                  : null,
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "raw_inbound_attachments") {
      return {
        select: () => ({
          eq: async () => ({
            data: mockState.stagedAttachments,
            error: null,
          }),
        }),
      };
    }
    if (table === "documents") {
      return {
        insert: (rows: Record<string, unknown>[]) => {
          mockState.documentInsertRows = rows;
          return Promise.resolve({ error: null });
        },
      };
    }
    throw new Error(`unexpected table ${table}`);
  },
  storage: {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://storage.example/${bucket}/${path}` },
      }),
    }),
  },
  rpc: (fn: string, args: Record<string, unknown>) => {
    if (fn !== "confirm_inbound_draft") {
      throw new Error(`unexpected rpc ${fn}`);
    }
    mockState.rpcCalledWith = args;
    return {
      single: async () => {
        if (mockState.rpcError) {
          return { data: null, error: mockState.rpcError };
        }
        return {
          data: {
            draft: { ...mockState.draft, status: "confirmed" },
            interaction_id: mockState.rpcInteractionId,
          },
          error: null,
        };
      },
    };
  },
});

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: fakeClient,
  createServerSupabaseUserClient: fakeClient,
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

import { getRouterParam, readBody } from "h3";
import { requireAuth } from "~/server/utils/auth";

const DRAFT_ID = "550e8400-e29b-41d4-a716-446655440000";
const PENDING_DRAFT = {
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

describe("POST /api/inbound-drafts/:id/confirm", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getRouterParam).mockReturnValue(DRAFT_ID);
    vi.mocked(readBody).mockResolvedValue({});
    mockState.draft = undefined;
    mockState.rpcCalledWith = undefined;
    mockState.rpcError = null;
    mockState.rpcInteractionId = "interaction-1";
    mockState.interactionSchoolId = "school-1";
    mockState.stagedAttachments = [];
    mockState.documentInsertRows = undefined;
    mockState.callerRole = "parent";
    mockState.playerMember = { user_id: "player-1" };
  });

  it("404s when the draft isn't found or belongs to another family", async () => {
    mockState.draft = null;
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("422s before calling the RPC when unmatched and no schoolId is provided", async () => {
    mockState.draft = {
      ...PENDING_DRAFT,
      matched_school_id: null,
      matched_coach_id: null,
    };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mockState.rpcCalledWith).toBeUndefined();
  });

  it("400s for a malformed draft id", async () => {
    vi.mocked(getRouterParam).mockReturnValue("not-a-uuid");
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("422s when confirming an already-discarded draft", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "discarded",
    };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mockState.rpcCalledWith).toBeUndefined();
  });

  it("is idempotent: re-confirming returns the existing interactionId without calling the RPC", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "confirmed",
      confirmed_interaction_id: "interaction-existing",
    };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, interactionId: "interaction-existing" });
    expect(mockState.rpcCalledWith).toBeUndefined();
  });

  it("creates the interaction via the RPC and marks the draft confirmed", async () => {
    mockState.draft = PENDING_DRAFT;
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(mockState.rpcCalledWith).toEqual({
      p_draft_id: DRAFT_ID,
      p_school_id: null,
      p_coach_id: null,
      p_coach_id_set: false,
      p_type: null,
      p_direction: null,
      p_subject: null,
      p_subject_set: false,
      p_content: null,
      p_content_set: false,
      p_occurred_at: null,
    });
    expect(result).toEqual({ ok: true, interactionId: "interaction-1" });
    // No staged attachments on this draft — confirming must not write an
    // empty-array `documents` insert.
    expect(mockState.documentInsertRows).toBeUndefined();
  });

  it("forwards caller-supplied overrides to the RPC, including tri-state _set flags", async () => {
    mockState.draft = PENDING_DRAFT;
    vi.mocked(readBody).mockResolvedValue({
      schoolId: "33333333-3333-3333-3333-333333333333",
      coachId: "22222222-2222-2222-2222-222222222222",
      type: "phone_call",
      direction: "outbound",
      occurredAt: "2026-09-03T10:00:00.000Z",
      subject: "Edited subject",
      content: "Edited content",
    });
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await handler({} as Parameters<typeof handler>[0]);

    expect(mockState.rpcCalledWith).toEqual({
      p_draft_id: DRAFT_ID,
      p_school_id: "33333333-3333-3333-3333-333333333333",
      p_coach_id: "22222222-2222-2222-2222-222222222222",
      p_coach_id_set: true,
      p_type: "phone_call",
      p_direction: "outbound",
      p_subject: "Edited subject",
      p_subject_set: true,
      p_content: "Edited content",
      p_content_set: true,
      p_occurred_at: "2026-09-03T10:00:00.000Z",
    });
  });

  it("distinguishes an explicit null coachId (clear) from an omitted one (use draft default)", async () => {
    mockState.draft = PENDING_DRAFT;
    vi.mocked(readBody).mockResolvedValue({ coachId: null });
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await handler({} as Parameters<typeof handler>[0]);

    expect(mockState.rpcCalledWith).toMatchObject({
      p_coach_id: null,
      p_coach_id_set: true,
    });
  });

  it("still returns ok when a concurrent confirm already flipped the status (race guard)", async () => {
    mockState.draft = PENDING_DRAFT;
    mockState.rpcInteractionId = "interaction-that-won-the-race";
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      ok: true,
      interactionId: "interaction-that-won-the-race",
    });
  });

  it("returns 500 when the confirm RPC errors", async () => {
    mockState.draft = PENDING_DRAFT;
    mockState.rpcError = { message: "db error" };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("maps the RPC's invalid-schoolId error to a 422", async () => {
    mockState.draft = PENDING_DRAFT;
    mockState.rpcError = { message: "invalid schoolId" };
    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("creates a documents row per staged attachment, linked to the RPC-created interaction", async () => {
    mockState.draft = PENDING_DRAFT;
    mockState.stagedAttachments = [
      {
        filename: "camp-invite.pdf",
        content_type: "application/pdf",
        storage_path: "family-1/inbound/draft-1-camp-invite.pdf",
      },
      {
        filename: "roster.docx",
        content_type: "application/msword",
        storage_path: "family-1/inbound/draft-1-roster.docx",
      },
    ];

    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ ok: true, interactionId: "interaction-1" });
    expect(mockState.documentInsertRows).toEqual([
      {
        type: "coach_attachment",
        interaction_id: "interaction-1",
        family_unit_id: "family-1",
        school_id: "school-1",
        // Athlete-owned regardless of who confirmed (a parent, here).
        user_id: "player-1",
        uploaded_by: "user-1",
        file_url:
          "https://storage.example/documents/family-1/inbound/draft-1-camp-invite.pdf",
        file_type: "application/pdf",
        title: "camp-invite.pdf",
      },
      {
        type: "coach_attachment",
        interaction_id: "interaction-1",
        family_unit_id: "family-1",
        school_id: "school-1",
        user_id: "player-1",
        uploaded_by: "user-1",
        file_url:
          "https://storage.example/documents/family-1/inbound/draft-1-roster.docx",
        file_type: "application/msword",
        title: "roster.docx",
      },
    ]);
  });

  it("owns the created documents by the athlete's user id, not the confirming parent's, and resolves a public file_url", async () => {
    mockState.draft = PENDING_DRAFT;
    mockState.stagedAttachments = [
      {
        filename: "camp-invite.pdf",
        content_type: "application/pdf",
        storage_path: "family-1/inbound/draft-1-camp-invite.pdf",
      },
    ];
    mockState.callerRole = "parent";
    mockState.playerMember = { user_id: "player-1" };

    const { default: handler } =
      await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await handler({} as Parameters<typeof handler>[0]);

    expect(mockState.documentInsertRows).toHaveLength(1);
    expect(mockState.documentInsertRows![0]).toMatchObject({
      user_id: "player-1",
      uploaded_by: "user-1",
      file_url:
        "https://storage.example/documents/family-1/inbound/draft-1-camp-invite.pdf",
    });
    // A bare storage path is never written as file_url — every viewer treats it as a URL.
    expect(mockState.documentInsertRows![0].file_url).not.toBe(
      "family-1/inbound/draft-1-camp-invite.pdf",
    );
  });
});
