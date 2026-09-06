import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    readRawBody: vi.fn(),
    getHeaders: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), { statusCode: opts.statusCode }),
  };
});

vi.mock("~/server/utils/verifyResendWebhook", () => ({
  verifyResendWebhook: vi.fn(),
}));
vi.mock("~/server/utils/familyInboundToken", () => ({
  parseInboundToken: vi.fn(),
  resolveFamilyByInboundToken: vi.fn(),
}));
vi.mock("~/server/utils/parseForwardedEmail", () => ({
  parseForwardedThread: vi.fn(),
}));
vi.mock("~/server/utils/matchCoachByEmail", () => ({
  matchCoachByEmail: vi.fn(),
  autoCreateCoachByEmailDomain: vi.fn(),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const receivingGetMock = vi.fn();
const attachmentsGetMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { receiving: { get: receivingGetMock, attachments: { get: attachmentsGetMock } } };
  },
}));

const mockState = {
  rawInsertId: "raw-1",
  draftInsertRows: [] as Record<string, unknown>[],
  notificationRowBatches: [] as Record<string, unknown>[][],
  attachmentInsertRows: [] as Record<string, unknown>[],
  storageUploads: [] as { path: string; contentType?: string }[],
  storageUploadResult: { error: null as { message: string } | null },
};

// Convenience accessors mirroring the pre-loop single-draft shape, for tests
// that only ever produce one segment.
function lastDraftInsertRow(): Record<string, unknown> | undefined {
  return mockState.draftInsertRows[mockState.draftInsertRows.length - 1];
}
function lastNotificationRows(): Record<string, unknown>[] | undefined {
  return mockState.notificationRowBatches[mockState.notificationRowBatches.length - 1];
}

let draftIdCounter = 0;

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "raw_inbound_emails") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: mockState.rawInsertId }, error: null }),
            }),
          }),
        };
      }
      if (table === "inbound_email_drafts") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.draftInsertRows.push(row);
            const id = `draft-${++draftIdCounter}`;
            return {
              select: () => ({
                single: async () => ({ data: { id }, error: null }),
              }),
            };
          },
        };
      }
      if (table === "family_members") {
        return {
          select: () => ({
            eq: async () => ({ data: [{ user_id: "parent-1" }, { user_id: "player-1" }], error: null }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: (rows: Record<string, unknown>[]) => {
            mockState.notificationRowBatches.push(rows);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === "raw_inbound_attachments") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.attachmentInsertRows.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, _body: unknown, options?: { contentType?: string }) => {
          mockState.storageUploads.push({ path, contentType: options?.contentType });
          return Promise.resolve({ data: { path: `${bucket}/${path}` }, error: mockState.storageUploadResult.error });
        },
      }),
    },
  }),
}));

import { readRawBody, getHeaders } from "h3";
import { verifyResendWebhook } from "~/server/utils/verifyResendWebhook";
import { parseInboundToken, resolveFamilyByInboundToken } from "~/server/utils/familyInboundToken";
import { parseForwardedThread } from "~/server/utils/parseForwardedEmail";
import { matchCoachByEmail, autoCreateCoachByEmailDomain } from "~/server/utils/matchCoachByEmail";

describe("POST /api/webhooks/inbound-email", () => {
  beforeEach(() => {
    vi.mocked(readRawBody).mockResolvedValue('{"type":"email.received"}');
    vi.mocked(getHeaders).mockReturnValue({
      "svix-id": "msg_1",
      "svix-timestamp": "123",
      "svix-signature": "v1,sig",
    });
    mockState.draftInsertRows = [];
    mockState.notificationRowBatches = [];
    mockState.attachmentInsertRows = [];
    mockState.storageUploads = [];
    mockState.storageUploadResult = { error: null };
    draftIdCounter = 0;
    receivingGetMock.mockReset();
    attachmentsGetMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }),
    );
    vi.mocked(parseForwardedThread).mockReset();
    vi.mocked(autoCreateCoachByEmailDomain).mockReset().mockResolvedValue({
      coachId: null,
      schoolId: null,
    });
  });

  it("rejects a bad signature with 401", async () => {
    vi.mocked(verifyResendWebhook).mockImplementation(() => {
      throw new Error("Invalid webhook signature");
    });
    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("skips gracefully when the inbound token doesn't resolve to a family", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-1",
        to: ["family-deadbeef@inbound.therecruitingcompass.com"],
        from: "Coach Smith <smith@osu.edu>",
        subject: "Re: hi",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("deadbeef");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue(null);

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, skipped: "unknown-family" });
    expect(mockState.draftInsertRows).toHaveLength(0);
    expect(receivingGetMock).not.toHaveBeenCalled();
  });

  it("creates a matched draft when the forwarded sender matches a coach", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-1",
        to: ["family-ab3d9f2c@inbound.therecruitingcompass.com"],
        from: "Player <player@example.com>",
        subject: "Fwd: Camp invite",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("ab3d9f2c");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue("family-1");
    receivingGetMock.mockResolvedValue({
      data: { text: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> hi" },
      error: null,
    });
    const bodyText = "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> hi";
    vi.mocked(parseForwardedThread).mockReturnValue([
      {
        parsed: {
          senderName: "Coach Smith",
          senderEmail: "smith@osu.edu",
          originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
        },
        segmentText: bodyText,
      },
    ]);
    vi.mocked(matchCoachByEmail).mockResolvedValue({ coachId: "coach-1", schoolId: "school-1" });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(autoCreateCoachByEmailDomain).not.toHaveBeenCalled();
    expect(receivingGetMock).toHaveBeenCalledWith("email-1");
    expect(parseForwardedThread).toHaveBeenCalledWith(bodyText);
    expect(result).toEqual({ ok: true });
    expect(mockState.draftInsertRows).toHaveLength(1);
    expect(lastDraftInsertRow()).toMatchObject({
      family_unit_id: "family-1",
      matched_coach_id: "coach-1",
      matched_school_id: "school-1",
      sender_name: "Coach Smith",
      sender_email: "smith@osu.edu",
      body_text: bodyText,
      status: "pending",
    });
    expect(mockState.notificationRowBatches).toHaveLength(1);
    expect(lastNotificationRows()).toEqual([
      expect.objectContaining({
        user_id: "parent-1",
        type: "inbound_interaction",
        related_entity_id: "draft-1",
        related_entity_type: "inbound_email_draft",
      }),
      expect.objectContaining({
        user_id: "player-1",
        type: "inbound_interaction",
        related_entity_id: "draft-1",
        related_entity_type: "inbound_email_draft",
      }),
    ]);
  });

  it("still creates an unmatched draft when fetching the full email body fails", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-1",
        to: ["family-ab3d9f2c@inbound.therecruitingcompass.com"],
        from: "Player <player@example.com>",
        subject: "Fwd: Camp invite",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("ab3d9f2c");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue("family-1");
    receivingGetMock.mockResolvedValue({ data: null, error: { message: "not found" } });
    vi.mocked(matchCoachByEmail).mockResolvedValue({ coachId: null, schoolId: null });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ ok: true });
    expect(parseForwardedThread).not.toHaveBeenCalled();
    expect(mockState.draftInsertRows).toHaveLength(1);
    expect(lastDraftInsertRow()).toMatchObject({
      family_unit_id: "family-1",
      matched_coach_id: null,
      sender_name: null,
      body_text: null,
      status: "pending",
    });
  });

  it("falls back to the school-domain auto-create when no coach matches", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-1",
        to: ["family-ab3d9f2c@inbound.therecruitingcompass.com"],
        from: "Player <player@example.com>",
        subject: "Fwd: Camp invite",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("ab3d9f2c");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue("family-1");
    receivingGetMock.mockResolvedValue({
      data: { text: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> hi" },
      error: null,
    });
    vi.mocked(parseForwardedThread).mockReturnValue([
      {
        parsed: {
          senderName: "Coach Smith",
          senderEmail: "smith@osu.edu",
          originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
        },
        segmentText: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> hi",
      },
    ]);
    vi.mocked(matchCoachByEmail).mockResolvedValue({ coachId: null, schoolId: null });
    vi.mocked(autoCreateCoachByEmailDomain).mockResolvedValue({
      coachId: "auto-coach-1",
      schoolId: "school-1",
    });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(autoCreateCoachByEmailDomain).toHaveBeenCalledWith(expect.anything(), {
      familyUnitId: "family-1",
      senderEmail: "smith@osu.edu",
      senderName: "Coach Smith",
    });
    expect(result).toEqual({ ok: true });
    expect(mockState.draftInsertRows).toHaveLength(1);
    expect(lastDraftInsertRow()).toMatchObject({
      family_unit_id: "family-1",
      matched_coach_id: "auto-coach-1",
      matched_school_id: "school-1",
      status: "pending",
    });
  });

  it("creates one draft per segment when the forward contains a multi-message thread", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-1",
        to: ["family-ab3d9f2c@inbound.therecruitingcompass.com"],
        from: "Player <player@example.com>",
        subject: "Fwd: Thread",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("ab3d9f2c");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue("family-1");
    const fullBody = "thread body";
    receivingGetMock.mockResolvedValue({ data: { text: fullBody }, error: null });
    vi.mocked(parseForwardedThread).mockReturnValue([
      {
        parsed: { senderName: "Coach A", senderEmail: "a@osu.edu", originalDate: "Sep 3, 2026" },
        segmentText: "segment-1",
      },
      {
        parsed: { senderName: "Coach B", senderEmail: "b@osu.edu", originalDate: "Sep 2, 2026" },
        segmentText: "segment-2",
      },
      {
        parsed: { senderName: "Coach C", senderEmail: "c@osu.edu", originalDate: "Sep 1, 2026" },
        segmentText: "segment-3",
      },
    ]);
    vi.mocked(matchCoachByEmail)
      .mockResolvedValueOnce({ coachId: "coach-a", schoolId: "school-a" })
      .mockResolvedValueOnce({ coachId: "coach-b", schoolId: "school-b" })
      .mockResolvedValueOnce({ coachId: null, schoolId: null });
    vi.mocked(autoCreateCoachByEmailDomain).mockResolvedValueOnce({
      coachId: "coach-c",
      schoolId: "school-c",
    });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ ok: true });
    expect(mockState.draftInsertRows).toHaveLength(3);
    expect(mockState.draftInsertRows[0]).toMatchObject({
      sender_name: "Coach A",
      sender_email: "a@osu.edu",
      body_text: "segment-1",
      matched_coach_id: "coach-a",
      matched_school_id: "school-a",
      occurred_at: new Date("Sep 3, 2026").toISOString(),
    });
    expect(mockState.draftInsertRows[1]).toMatchObject({
      sender_name: "Coach B",
      sender_email: "b@osu.edu",
      body_text: "segment-2",
      matched_coach_id: "coach-b",
      matched_school_id: "school-b",
      occurred_at: new Date("Sep 2, 2026").toISOString(),
    });
    expect(mockState.draftInsertRows[2]).toMatchObject({
      sender_name: "Coach C",
      sender_email: "c@osu.edu",
      body_text: "segment-3",
      matched_coach_id: "coach-c",
      matched_school_id: "school-c",
      occurred_at: new Date("Sep 1, 2026").toISOString(),
    });
    // Each draft's occurred_at comes from ITS OWN segment's parsed date, not
    // the shared webhook-receipt timestamp — proves they're actually distinct.
    const occurredAts = mockState.draftInsertRows.map((row) => row.occurred_at);
    expect(new Set(occurredAts).size).toBe(3);

    // One notification per draft, not a single bundled summary.
    expect(mockState.notificationRowBatches).toHaveLength(3);
    expect(mockState.notificationRowBatches[0]).toEqual([
      expect.objectContaining({ user_id: "parent-1", related_entity_id: "draft-1" }),
      expect.objectContaining({ user_id: "player-1", related_entity_id: "draft-1" }),
    ]);
    expect(mockState.notificationRowBatches[1]).toEqual([
      expect.objectContaining({ user_id: "parent-1", related_entity_id: "draft-2" }),
      expect.objectContaining({ user_id: "player-1", related_entity_id: "draft-2" }),
    ]);
    expect(mockState.notificationRowBatches[2]).toEqual([
      expect.objectContaining({ user_id: "parent-1", related_entity_id: "draft-3" }),
      expect.objectContaining({ user_id: "player-1", related_entity_id: "draft-3" }),
    ]);
  });

  it("falls back to the webhook-receipt timestamp when a segment's originalDate doesn't parse", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-1",
        to: ["family-ab3d9f2c@inbound.therecruitingcompass.com"],
        from: "Player <player@example.com>",
        subject: "Fwd: Camp invite",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("ab3d9f2c");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue("family-1");
    receivingGetMock.mockResolvedValue({
      data: { text: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> hi" },
      error: null,
    });
    // "at" between the date and the time is not reliably parseable by `Date`
    // — this is the free-text shape parseForwardedEmail actually extracts
    // from a real Gmail forward, so it's the realistic case, not a contrived
    // one.
    vi.mocked(parseForwardedThread).mockReturnValue([
      {
        parsed: {
          senderName: "Coach Smith",
          senderEmail: "smith@osu.edu",
          originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
        },
        segmentText: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> hi",
      },
    ]);
    vi.mocked(matchCoachByEmail).mockResolvedValue({ coachId: "coach-1", schoolId: "school-1" });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    await handler({} as Parameters<typeof handler>[0]);

    expect(lastDraftInsertRow()).toMatchObject({
      occurred_at: "2026-09-02T15:15:00.000Z",
    });
  });

  function mockSingleSegmentEmail() {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-1",
        to: ["family-ab3d9f2c@inbound.therecruitingcompass.com"],
        from: "Player <player@example.com>",
        subject: "Fwd: Camp invite",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("ab3d9f2c");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue("family-1");
    vi.mocked(parseForwardedThread).mockReturnValue([
      {
        parsed: { senderName: "Coach Smith", senderEmail: "smith@osu.edu", originalDate: null },
        segmentText: "hi",
      },
    ]);
    vi.mocked(matchCoachByEmail).mockResolvedValue({ coachId: "coach-1", schoolId: "school-1" });
  }

  it("stages a valid attachment to storage + raw_inbound_attachments on the created draft", async () => {
    mockSingleSegmentEmail();
    receivingGetMock.mockResolvedValue({
      data: {
        text: "hi",
        attachments: [{ id: "att-1", filename: "camp-invite.pdf", size: 1024, content_type: "application/pdf" }],
      },
      error: null,
    });
    attachmentsGetMock.mockResolvedValue({
      data: { download_url: "https://resend.example/signed/att-1" },
      error: null,
    });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ ok: true });
    expect(attachmentsGetMock).toHaveBeenCalledWith({ emailId: "email-1", id: "att-1" });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("https://resend.example/signed/att-1");
    expect(mockState.storageUploads).toHaveLength(1);
    expect(mockState.storageUploads[0].path).toBe("family-1/inbound/draft-1-camp-invite.pdf");
    expect(mockState.storageUploads[0].contentType).toBe("application/pdf");
    expect(mockState.attachmentInsertRows).toEqual([
      {
        draft_id: "draft-1",
        family_unit_id: "family-1",
        filename: "camp-invite.pdf",
        content_type: "application/pdf",
        storage_path: "family-1/inbound/draft-1-camp-invite.pdf",
      },
    ]);
  });

  it("skips an attachment whose type isn't on the coach_attachment allowlist, without failing the webhook", async () => {
    mockSingleSegmentEmail();
    receivingGetMock.mockResolvedValue({
      data: {
        text: "hi",
        attachments: [
          { id: "att-1", filename: "malware.exe", size: 1024, content_type: "application/x-msdownload" },
        ],
      },
      error: null,
    });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ ok: true });
    expect(attachmentsGetMock).not.toHaveBeenCalled();
    expect(mockState.storageUploads).toHaveLength(0);
    expect(mockState.attachmentInsertRows).toHaveLength(0);
    // The draft itself is unaffected by the skipped attachment.
    expect(mockState.draftInsertRows).toHaveLength(1);
  });

  it("skips an attachment over the size cap, without failing the webhook", async () => {
    mockSingleSegmentEmail();
    receivingGetMock.mockResolvedValue({
      data: {
        text: "hi",
        attachments: [
          {
            id: "att-1",
            filename: "roster.pdf",
            size: 50 * 1024 * 1024,
            content_type: "application/pdf",
          },
        ],
      },
      error: null,
    });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ ok: true });
    expect(attachmentsGetMock).not.toHaveBeenCalled();
    expect(mockState.storageUploads).toHaveLength(0);
    expect(mockState.attachmentInsertRows).toHaveLength(0);
  });

  it("does not stage anything, and never touches the storage/attachments tables, when the email has no attachments", async () => {
    mockSingleSegmentEmail();
    receivingGetMock.mockResolvedValue({ data: { text: "hi", attachments: [] }, error: null });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ ok: true });
    expect(attachmentsGetMock).not.toHaveBeenCalled();
    expect(mockState.storageUploads).toHaveLength(0);
    expect(mockState.attachmentInsertRows).toHaveLength(0);
  });

  it("continues to remaining segments and still returns 200 when one segment's draft insert fails", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-1",
        to: ["family-ab3d9f2c@inbound.therecruitingcompass.com"],
        from: "Player <player@example.com>",
        subject: "Fwd: Thread",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("ab3d9f2c");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue("family-1");
    receivingGetMock.mockResolvedValue({ data: { text: "thread body" }, error: null });
    vi.mocked(parseForwardedThread).mockReturnValue([
      {
        parsed: { senderName: "Coach A", senderEmail: "a@osu.edu", originalDate: "Sep 3, 2026" },
        segmentText: "segment-1",
      },
      {
        parsed: { senderName: "Coach B", senderEmail: "b@osu.edu", originalDate: "Sep 2, 2026" },
        segmentText: "segment-2",
      },
    ]);
    vi.mocked(matchCoachByEmail).mockResolvedValue({ coachId: "coach-1", schoolId: "school-1" });

    let insertCall = 0;
    vi.doMock("~/server/utils/supabase", () => ({
      useSupabaseAdmin: () => ({
        from: (table: string) => {
          if (table === "raw_inbound_emails") {
            return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: "raw-1" }, error: null }) }) }) };
          }
          if (table === "inbound_email_drafts") {
            return {
              insert: (row: Record<string, unknown>) => {
                insertCall++;
                if (insertCall === 1) {
                  // First segment's insert fails.
                  return { select: () => ({ single: async () => ({ data: null, error: { message: "db error" } }) }) };
                }
                mockState.draftInsertRows.push(row);
                const id = `draft-${insertCall}`;
                return { select: () => ({ single: async () => ({ data: { id }, error: null }) }) };
              },
            };
          }
          if (table === "family_members") {
            return { select: () => ({ eq: async () => ({ data: [{ user_id: "parent-1" }], error: null }) }) };
          }
          if (table === "notifications") {
            return {
              insert: (rows: Record<string, unknown>[]) => {
                mockState.notificationRowBatches.push(rows);
                return Promise.resolve({ error: null });
              },
            };
          }
          throw new Error(`unexpected table ${table}`);
        },
      }),
    }));
    vi.resetModules();

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    // Still 200 — Resend must not retry (a retry would re-insert segment 2's
    // already-committed draft too).
    expect(result).toEqual({ ok: true });
    // Only the second segment's draft actually landed; the first's failure
    // didn't abort the loop or throw.
    expect(mockState.draftInsertRows).toHaveLength(1);
    expect(mockState.draftInsertRows[0]).toMatchObject({ sender_name: "Coach B" });
    expect(mockState.notificationRowBatches).toHaveLength(1);
  });
});
