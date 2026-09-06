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
  parseForwardedEmail: vi.fn(),
}));
vi.mock("~/server/utils/matchCoachByEmail", () => ({
  matchCoachByEmail: vi.fn(),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const receivingGetMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { receiving: { get: receivingGetMock } };
  },
}));

const mockState = {
  rawInsertId: "raw-1",
  draftInsertRow: undefined as Record<string, unknown> | undefined,
};

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
            mockState.draftInsertRow = row;
            return {
              select: () => ({
                single: async () => ({ data: { id: "draft-1" }, error: null }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { readRawBody, getHeaders } from "h3";
import { verifyResendWebhook } from "~/server/utils/verifyResendWebhook";
import { parseInboundToken, resolveFamilyByInboundToken } from "~/server/utils/familyInboundToken";
import { parseForwardedEmail } from "~/server/utils/parseForwardedEmail";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";

describe("POST /api/webhooks/inbound-email", () => {
  beforeEach(() => {
    vi.mocked(readRawBody).mockResolvedValue('{"type":"email.received"}');
    vi.mocked(getHeaders).mockReturnValue({
      "svix-id": "msg_1",
      "svix-timestamp": "123",
      "svix-signature": "v1,sig",
    });
    mockState.draftInsertRow = undefined;
    receivingGetMock.mockReset();
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
    expect(mockState.draftInsertRow).toBeUndefined();
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
    vi.mocked(parseForwardedEmail).mockReturnValue({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
    vi.mocked(matchCoachByEmail).mockResolvedValue({ coachId: "coach-1", schoolId: "school-1" });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(receivingGetMock).toHaveBeenCalledWith("email-1");
    expect(parseForwardedEmail).toHaveBeenCalledWith(
      "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> hi",
    );
    expect(result).toEqual({ ok: true });
    expect(mockState.draftInsertRow).toMatchObject({
      family_unit_id: "family-1",
      matched_coach_id: "coach-1",
      matched_school_id: "school-1",
      sender_name: "Coach Smith",
      sender_email: "smith@osu.edu",
      status: "pending",
    });
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
    expect(parseForwardedEmail).not.toHaveBeenCalled();
    expect(mockState.draftInsertRow).toMatchObject({
      family_unit_id: "family-1",
      matched_coach_id: null,
      sender_name: null,
      body_text: null,
      status: "pending",
    });
  });
});
