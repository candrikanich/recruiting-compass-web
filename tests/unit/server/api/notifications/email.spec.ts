import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  authHeader: "Bearer test-secret" as string | undefined,
  altHeader: undefined as string | undefined,
  body: {
    to: "player@example.com",
    subject: "New offer",
    title: "New offer",
    message: "New athletic offer from State U.",
    priority: "high",
  } as Record<string, unknown>,
};

const sendResult = {
  success: true as boolean,
  messageId: "email-1",
  error: "",
};

vi.mock("~/server/utils/emailService", () => ({
  sendNotificationEmail: vi.fn(async () => ({ ...sendResult })),
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => mockState.body),
    getHeader: vi.fn((_event: unknown, name: string) =>
      name === "authorization" ? mockState.authHeader : mockState.altHeader,
    ),
    createError: (cfg: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(cfg.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = cfg.statusCode;
      return err;
    },
  };
});

vi.stubGlobal("process", {
  ...process,
  env: { ...process.env, CRON_SECRET: "test-secret" },
});

import { sendNotificationEmail } from "~/server/utils/emailService";

const { default: handler } =
  await import("~/server/api/notifications/email.post");

const call = () => handler({} as Parameters<typeof handler>[0]);

describe("POST /api/notifications/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.authHeader = "Bearer test-secret";
    mockState.altHeader = undefined;
    mockState.body = {
      to: "player@example.com",
      subject: "New offer",
      title: "New offer",
      message: "New athletic offer from State U.",
      priority: "high",
    };
    sendResult.success = true;
    sendResult.error = "";
    vi.mocked(sendNotificationEmail).mockResolvedValue({ ...sendResult });
  });

  it("sends the email and returns success for a valid authorized request", async () => {
    const res = await call();
    expect(res).toMatchObject({ success: true, messageId: "email-1" });
    expect(sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "player@example.com", priority: "high" }),
    );
  });

  it("accepts the x-cron-secret header as an alternative", async () => {
    mockState.authHeader = undefined;
    mockState.altHeader = "test-secret";
    await expect(call()).resolves.toMatchObject({ success: true });
  });

  it("rejects with 401 when the secret is missing or wrong", async () => {
    mockState.authHeader = "Bearer wrong-secret";
    await expect(call()).rejects.toMatchObject({ statusCode: 401 });
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("rejects with 422 when the body is invalid", async () => {
    mockState.body = { to: "not-an-email", subject: "x" };
    await expect(call()).rejects.toMatchObject({ statusCode: 422 });
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("rejects with 502 when Resend delivery fails", async () => {
    sendResult.success = false;
    sendResult.error = "boom";
    vi.mocked(sendNotificationEmail).mockResolvedValue({ ...sendResult });
    await expect(call()).rejects.toMatchObject({ statusCode: 502 });
  });
});
