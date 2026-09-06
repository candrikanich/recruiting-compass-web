import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    readRawBody: vi.fn(),
    getHeaders: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});

vi.mock("~/server/utils/verifyResendEventWebhook", () => ({
  verifyResendEventWebhook: vi.fn(),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  insertedRow: undefined as Record<string, unknown> | undefined,
  insertError: null as { message: string } | null,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "email_events") throw new Error(`unexpected table ${table}`);
      return {
        insert: (row: Record<string, unknown>) => {
          mockState.insertedRow = row;
          return Promise.resolve({ error: mockState.insertError });
        },
      };
    },
  }),
}));

import { readRawBody, getHeaders } from "h3";
import { verifyResendEventWebhook } from "~/server/utils/verifyResendEventWebhook";

describe("POST /api/webhooks/resend-events", () => {
  beforeEach(() => {
    vi.mocked(readRawBody).mockResolvedValue('{"type":"email.delivered"}');
    vi.mocked(getHeaders).mockReturnValue({
      "svix-id": "msg_1",
      "svix-timestamp": "123",
      "svix-signature": "v1,sig",
    });
    mockState.insertedRow = undefined;
    mockState.insertError = null;
  });

  it("rejects a bad signature with 401", async () => {
    vi.mocked(verifyResendEventWebhook).mockImplementation(() => {
      throw new Error("Invalid webhook signature");
    });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("skips an unrecognized payload shape", async () => {
    vi.mocked(verifyResendEventWebhook).mockReturnValue({ type: "email.delivered" });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, skipped: "unrecognized-payload" });
    expect(mockState.insertedRow).toBeUndefined();
  });

  it("skips an unhandled event type", async () => {
    vi.mocked(verifyResendEventWebhook).mockReturnValue({
      type: "email.clicked.link", // not in the known set
      created_at: "2026-09-06T00:00:00Z",
      data: { email_id: "msg_1", to: ["coach@school.edu"], subject: "hi" },
    });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, skipped: "unhandled-type" });
    expect(mockState.insertedRow).toBeUndefined();
  });

  it("stores a recognized event", async () => {
    vi.mocked(verifyResendEventWebhook).mockReturnValue({
      type: "email.delivered",
      created_at: "2026-09-06T00:00:00Z",
      data: { email_id: "msg_1", to: ["coach@school.edu"], subject: "hi" },
    });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true });
    expect(mockState.insertedRow).toMatchObject({
      message_id: "msg_1",
      event_type: "delivered",
      recipient_email: "coach@school.edu",
      subject: "hi",
      occurred_at: "2026-09-06T00:00:00Z",
    });
  });

  it("returns 500 when the insert fails", async () => {
    mockState.insertError = { message: "db down" };
    vi.mocked(verifyResendEventWebhook).mockReturnValue({
      type: "email.bounced",
      created_at: "2026-09-06T00:00:00Z",
      data: { email_id: "msg_2", to: ["coach@school.edu"] },
    });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
