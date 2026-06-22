import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateUnsubscribeToken } from "~/server/utils/unsubscribeToken";

const SECRET = "test-unsubscribe-secret";
const RECIPIENT = "player@example.com";

const sendEmailMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("~/server/utils/emailService", () => ({
  sendEmail: sendEmailMock,
  renderWeeklyDigestEmail: vi.fn(() => "<p>digest</p>"),
  renderDeadlineAlertEmail: vi.fn(() => "<p>deadline</p>"),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
    })),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    readBody: vi.fn(),
    createError: vi.fn((opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    }),
  };
});

const mockEvent = {
  context: {},
  node: { req: { headers: {} }, res: {} },
} as never;

const validBody = {
  to: RECIPIENT,
  subject: "Weekly Digest",
  template: "weekly-digest" as const,
  data: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  sendEmailMock.mockResolvedValue({ success: true, messageId: "id" });
  maybeSingleMock.mockResolvedValue({ data: null, error: null });
  vi.stubGlobal("useRuntimeConfig", () => ({ unsubscribeSecret: SECRET }));
});

describe("POST /api/email/send suppression", () => {
  it("skips the send when the recipient has opted out", async () => {
    maybeSingleMock.mockResolvedValue({ data: { email: RECIPIENT }, error: null });
    const h3 = await import("h3");
    vi.mocked(h3.readBody).mockResolvedValue(validBody);

    const { default: handler } = await import("~/server/api/email/send.post");
    const result = await handler(mockEvent);

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, skipped: true });
  });

  it("sends with a List-Unsubscribe URL when the recipient is not opted out", async () => {
    const h3 = await import("h3");
    vi.mocked(h3.readBody).mockResolvedValue(validBody);

    const { default: handler } = await import("~/server/api/email/send.post");
    await handler(mockEvent);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [arg] = sendEmailMock.mock.calls[0];
    expect(arg.listUnsubscribeUrl).toContain("/api/email/unsubscribe");
    expect(arg.listUnsubscribeUrl).toContain(
      `token=${generateUnsubscribeToken(RECIPIENT, SECRET)}`,
    );
  });
});
