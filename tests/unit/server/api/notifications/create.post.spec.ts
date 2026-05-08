import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-1",
  insertData: { id: "notif-1" } as object | null,
  insertError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: () => ({
      insert: () =>
        Promise.resolve({
          data: mockState.insertData,
          error: mockState.insertError,
        }),
    }),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => mockState.body),
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => {
      const err = new Error(
        config.statusMessage ?? config.message ?? "error",
      ) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mockState as any).body = {};

const { default: handler } =
  await import("~/server/api/notifications/create.post");

const mockEvent = { context: {}, node: { req: {}, res: {} } } as Parameters<
  typeof handler
>[0];

describe("POST /api/notifications/create", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.insertData = { id: "notif-1" };
    mockState.insertError = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockState as any).body = {
      type: "follow_up_reminder",
      title: "Test Notification",
    };
  });

  it("creates a notification with minimal valid input", async () => {
    const result = await handler(mockEvent);
    expect(result).toMatchObject({
      success: true,
      notification: { id: "notif-1" },
    });
  });

  it("creates a notification with all optional fields", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockState as any).body = {
      type: "offer",
      title: "You got an offer!",
      message: "Great news from State University",
      priority: "high",
      action_url: "/schools/123",
    };
    const result = await handler(mockEvent);
    expect(result).toMatchObject({ success: true });
  });

  it("accepts all valid notification types", async () => {
    const types = [
      "follow_up_reminder",
      "deadline_alert",
      "daily_digest",
      "inbound_interaction",
      "offer",
      "event",
    ] as const;

    for (const type of types) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockState as any).body = { type, title: "Title" };
      const result = await handler(mockEvent);
      expect(result.success).toBe(true);
    }
  });

  it("throws 422 when type is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockState as any).body = { title: "Test" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("throws 422 when type is invalid", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockState as any).body = { type: "invalid_type", title: "Test" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("throws 422 when title is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockState as any).body = { type: "follow_up_reminder" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("throws 422 when action_url is an absolute URL", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockState as any).body = {
      type: "follow_up_reminder",
      title: "Test",
      action_url: "https://evil.com/phish",
    };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("accepts an empty string for action_url", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockState as any).body = {
      type: "follow_up_reminder",
      title: "Test",
      action_url: "",
    };
    const result = await handler(mockEvent);
    expect(result.success).toBe(true);
  });

  it("throws 500 when DB insert returns an error", async () => {
    mockState.insertError = { message: "DB write failed" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("propagates H3 error from requireAuth without wrapping", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3Err = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    vi.mocked(requireAuth).mockRejectedValueOnce(h3Err);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });
});
