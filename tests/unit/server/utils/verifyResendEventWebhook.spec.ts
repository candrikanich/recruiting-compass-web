import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }));

vi.mock("svix", () => ({
  Webhook: class {
    verify(rawBody: string, headers: Record<string, string>) {
      return verifyMock(rawBody, headers);
    }
  },
}));

import { verifyResendEventWebhook } from "~/server/utils/verifyResendEventWebhook";

describe("verifyResendEventWebhook", () => {
  const headers = {
    "svix-id": "msg_123",
    "svix-timestamp": "1234567890",
    "svix-signature": "v1,abc123",
  };

  beforeEach(() => {
    process.env.RESEND_EVENTS_WEBHOOK_SECRET = "whsec_test";
    verifyMock.mockReset();
  });

  afterEach(() => {
    delete process.env.RESEND_EVENTS_WEBHOOK_SECRET;
  });

  it("returns the verified payload on a valid signature", () => {
    verifyMock.mockReturnValue({
      type: "email.delivered",
      data: { email_id: "msg_1" },
    });
    const result = verifyResendEventWebhook(
      '{"type":"email.delivered"}',
      headers,
    );
    expect(result).toEqual({
      type: "email.delivered",
      data: { email_id: "msg_1" },
    });
  });

  it("throws when the secret is not configured", () => {
    delete process.env.RESEND_EVENTS_WEBHOOK_SECRET;
    expect(() => verifyResendEventWebhook("{}", headers)).toThrow(
      "Invalid webhook signature",
    );
  });

  it("throws when svix verification fails", () => {
    verifyMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    expect(() => verifyResendEventWebhook("{}", headers)).toThrow(
      "Invalid webhook signature",
    );
  });
});
