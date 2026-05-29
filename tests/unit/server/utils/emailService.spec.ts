import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendMock, loggerMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => loggerMock,
}));

import {
  sendEmail,
  sendNotificationEmail,
  sendInviteEmail,
} from "~/server/utils/emailService";

describe("emailService (Resend SDK)", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockReset();
    sendMock.mockResolvedValue({
      data: { id: "email_abc123" },
      error: null,
    });
    Object.values(loggerMock).forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  describe("sendEmail", () => {
    it("returns failure without calling the SDK when API key is missing", async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendEmail({
        to: "a@b.com",
        subject: "Hi",
        html: "<p>Hi</p>",
      });

      expect(result.success).toBe(false);
      expect(sendMock).not.toHaveBeenCalled();
    });

    it("sends via the SDK and returns the message id on success", async () => {
      const result = await sendEmail({
        to: "a@b.com",
        subject: "Hi",
        html: "<p>Hi</p>",
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
      const [payload] = sendMock.mock.calls[0];
      expect(payload).toMatchObject({
        to: "a@b.com",
        subject: "Hi",
        html: "<p>Hi</p>",
      });
      expect(payload.from).toContain("@");
      expect(result).toEqual({ success: true, messageId: "email_abc123" });
    });

    it("forwards the idempotency key to the SDK send options", async () => {
      await sendEmail({
        to: "a@b.com",
        subject: "Hi",
        html: "<p>Hi</p>",
        idempotencyKey: "feedback-42",
      });

      const [, options] = sendMock.mock.calls[0];
      expect(options).toMatchObject({ idempotencyKey: "feedback-42" });
    });

    it("maps an SDK error response to a failure result without throwing", async () => {
      sendMock.mockResolvedValueOnce({
        data: null,
        error: { message: "domain not verified", statusCode: 403, name: "invalid_access" },
      });

      const result = await sendEmail({
        to: "a@b.com",
        subject: "Hi",
        html: "<p>Hi</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("domain not verified");
    });
  });

  describe("sendEmail reliability", () => {
    it("retries on a 5xx SDK error and succeeds on a later attempt", async () => {
      vi.useFakeTimers();
      sendMock.mockResolvedValueOnce({
        data: null,
        error: { message: "server error", statusCode: 500, name: "internal_server_error" },
      });
      sendMock.mockResolvedValueOnce({
        data: { id: "email_retry" },
        error: null,
      });

      const promise = sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" });
      await vi.runAllTimersAsync();
      const result = await promise;
      vi.useRealTimers();

      expect(sendMock).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true, messageId: "email_retry" });
    });

    it("does not retry a 4xx SDK error", async () => {
      sendMock.mockResolvedValue({
        data: null,
        error: { message: "invalid email", statusCode: 422, name: "validation_error" },
      });

      const result = await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" });

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
    });

    it("times out a hung send and retries", async () => {
      vi.useFakeTimers();
      sendMock.mockReturnValueOnce(new Promise(() => {})); // never resolves
      sendMock.mockResolvedValueOnce({
        data: { id: "email_after_timeout" },
        error: null,
      });

      const promise = sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" });
      await vi.runAllTimersAsync();
      const result = await promise;
      vi.useRealTimers();

      expect(sendMock).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true, messageId: "email_after_timeout" });
    });
  });

  describe("sendNotificationEmail", () => {
    it("forwards a provided idempotency key", async () => {
      await sendNotificationEmail({
        to: "a@b.com",
        subject: "Notice",
        title: "Notice",
        message: "Something happened",
        priority: "high",
        idempotencyKey: "notif-99",
      });

      const [, options] = sendMock.mock.calls[0];
      expect(options).toMatchObject({ idempotencyKey: "notif-99" });
    });
  });

  describe("sendInviteEmail", () => {
    it("derives a deterministic idempotency key from the invite token", async () => {
      await sendInviteEmail({
        to: "a@b.com",
        inviterName: "Coach",
        familyName: "Smith",
        role: "player",
        token: "tok_xyz",
      });

      const [, options] = sendMock.mock.calls[0];
      expect(options).toMatchObject({ idempotencyKey: "invite-tok_xyz" });
    });
  });
});
