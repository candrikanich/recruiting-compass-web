import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }));

vi.mock("svix", () => ({
  Webhook: class {
    verify(rawBody: string, headers: Record<string, string>) {
      return verifyMock(rawBody, headers);
    }
  },
}));

import { verifyResendWebhook } from "~/server/utils/verifyResendWebhook";

describe("verifyResendWebhook", () => {
  const headers = {
    "svix-id": "msg_123",
    "svix-timestamp": "1234567890",
    "svix-signature": "v1,abc123",
  };

  beforeEach(() => {
    process.env.RESEND_INBOUND_WEBHOOK_SECRET = "whsec_test";
    verifyMock.mockReset();
  });

  afterEach(() => {
    delete process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  });

  it("returns the verified payload on a valid signature", () => {
    verifyMock.mockReturnValue({ type: "email.received", data: { subject: "hi" } });
    const result = verifyResendWebhook('{"type":"email.received"}', headers);
    expect(result).toEqual({ type: "email.received", data: { subject: "hi" } });
  });

  it("throws when the secret is not configured", () => {
    delete process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    expect(() => verifyResendWebhook("{}", headers)).toThrow("Invalid webhook signature");
  });

  it("throws when svix verification fails", () => {
    verifyMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    expect(() => verifyResendWebhook("{}", headers)).toThrow("Invalid webhook signature");
  });
});
