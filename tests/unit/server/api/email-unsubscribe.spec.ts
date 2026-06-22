import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateUnsubscribeToken } from "~/server/utils/unsubscribeToken";

const SECRET = "test-unsubscribe-secret";
const EMAIL = "user@example.com";
const validToken = generateUnsubscribeToken(EMAIL, SECRET);

const upsertMock = vi.fn();

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({ upsert: upsertMock })),
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getQuery: vi.fn(),
    setResponseStatus: vi.fn(),
    setResponseHeader: vi.fn(),
  };
});

const mockEvent = {
  context: {},
  node: { req: { headers: {} }, res: {} },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  upsertMock.mockResolvedValue({ error: null });
  vi.stubGlobal("useRuntimeConfig", () => ({ unsubscribeSecret: SECRET }));
});

describe("GET /api/email/unsubscribe", () => {
  it("upserts the opt-out and returns an HTML confirmation for a valid token", async () => {
    const h3 = await import("h3");
    vi.mocked(h3.getQuery).mockReturnValue({ email: EMAIL, token: validToken });

    const { default: handler } = await import(
      "~/server/api/email/unsubscribe.get"
    );
    const result = await handler(mockEvent);

    expect(upsertMock).toHaveBeenCalledWith(
      { email: EMAIL },
      { onConflict: "email" },
    );
    expect(typeof result).toBe("string");
    expect(result).toContain("unsubscribed");
  });

  it("returns 400 and does not upsert for an invalid token", async () => {
    const h3 = await import("h3");
    vi.mocked(h3.getQuery).mockReturnValue({ email: EMAIL, token: "bad" });

    const { default: handler } = await import(
      "~/server/api/email/unsubscribe.get"
    );
    await handler(mockEvent);

    expect(upsertMock).not.toHaveBeenCalled();
    expect(h3.setResponseStatus).toHaveBeenCalledWith(mockEvent, 400);
  });
});

describe("POST /api/email/unsubscribe (one-click)", () => {
  it("upserts and returns 202 for a valid token", async () => {
    const h3 = await import("h3");
    vi.mocked(h3.getQuery).mockReturnValue({ email: EMAIL, token: validToken });

    const { default: handler } = await import(
      "~/server/api/email/unsubscribe.post"
    );
    const result = await handler(mockEvent);

    expect(upsertMock).toHaveBeenCalledWith(
      { email: EMAIL },
      { onConflict: "email" },
    );
    expect(h3.setResponseStatus).toHaveBeenCalledWith(mockEvent, 202);
    expect(result).toEqual({ success: true });
  });

  it("returns 400 and does not upsert for an invalid token", async () => {
    const h3 = await import("h3");
    vi.mocked(h3.getQuery).mockReturnValue({ email: EMAIL, token: "bad" });

    const { default: handler } = await import(
      "~/server/api/email/unsubscribe.post"
    );
    const result = await handler(mockEvent);

    expect(upsertMock).not.toHaveBeenCalled();
    expect(h3.setResponseStatus).toHaveBeenCalledWith(mockEvent, 400);
    expect(result).toEqual({ success: false });
  });
});
