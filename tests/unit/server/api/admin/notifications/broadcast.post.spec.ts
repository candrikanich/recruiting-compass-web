import { describe, it, expect, vi, beforeEach } from "vitest";

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => loggerMock,
  createLogger: () => loggerMock,
}));

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(async () => ({
    id: "admin-1",
    email: "admin@test",
    is_admin: true,
  })),
}));
vi.mock("~/server/utils/auth", () => ({ requireAdmin: requireAdminMock }));

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    usersResult: {
      data: [{ id: "u-1" }, { id: "u-2" }] as { id: string }[] | null,
      error: null as unknown,
    },
    notificationsInsertError: null as unknown,
    insertedRows: [] as unknown[],
  },
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () =>
            Promise.resolve({
              data: supabaseState.usersResult.data,
              error: supabaseState.usersResult.error,
            }),
        };
      }
      if (table === "notifications") {
        return {
          insert: async (rows: unknown[]) => {
            supabaseState.insertedRows.push(...rows);
            return { error: supabaseState.notificationsInsertError };
          },
        };
      }
      throw new Error("unexpected table: " + table);
    },
  }),
}));

const { readBodyMock } = vi.hoisted(() => ({
  readBodyMock: vi.fn(),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: readBodyMock,
    createError: (opts: { statusCode: number; statusMessage: string }) => {
      const e = new Error(opts.statusMessage) as Error & { statusCode: number };
      e.statusCode = opts.statusCode;
      return e;
    },
  };
});

async function loadHandler() {
  vi.resetModules();
  const mod = await import("~/server/api/admin/notifications/broadcast.post");
  return mod.default;
}

const event = {
  context: {},
  node: { req: { headers: {} }, res: {} },
} as never;

describe("POST /api/admin/notifications/broadcast", () => {
  beforeEach(() => {
    Object.values(loggerMock).forEach((fn) => fn.mockClear());
    requireAdminMock.mockClear();
    requireAdminMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test",
      is_admin: true,
    });
    readBodyMock.mockReset();
    supabaseState.usersResult = {
      data: [{ id: "u-1" }, { id: "u-2" }],
      error: null,
    };
    supabaseState.notificationsInsertError = null;
    supabaseState.insertedRows = [];
  });

  it("rejects when requireAdmin throws", async () => {
    requireAdminMock.mockRejectedValueOnce(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );
    readBodyMock.mockResolvedValue({
      target: "all",
      type: "event",
      title: "x",
    });
    const handler = await loadHandler();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns 422 on schema validation failure", async () => {
    readBodyMock.mockResolvedValue({ target: "everyone", type: "event" });
    const handler = await loadHandler();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 422 });
    expect(loggerMock.error).toHaveBeenCalledWith(
      "Broadcast validation failed",
      expect.objectContaining({ issues: expect.any(Array) }),
    );
  });

  it("returns 422 when target=user without user_id (schema would allow optional)", async () => {
    // user_id is .optional() so schema passes; the explicit guard kicks in
    readBodyMock.mockResolvedValue({
      target: "user",
      type: "event",
      title: "hello",
    });
    const handler = await loadHandler();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("returns 422 on too-long title", async () => {
    readBodyMock.mockResolvedValue({
      target: "all",
      type: "event",
      title: "x".repeat(201),
    });
    const handler = await loadHandler();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("sends to all users on target=all", async () => {
    readBodyMock.mockResolvedValue({
      target: "all",
      type: "event",
      title: "Hi",
      message: "msg",
    });
    const handler = await loadHandler();
    const res = await handler(event);
    expect(res).toEqual({ success: true, sent: 2 });
    expect(supabaseState.insertedRows).toHaveLength(2);
    expect(supabaseState.insertedRows[0]).toMatchObject({
      user_id: "u-1",
      type: "event",
      title: "Hi",
      message: "msg",
      priority: "normal",
    });
  });

  it("sends to single user on target=user", async () => {
    readBodyMock.mockResolvedValue({
      target: "user",
      user_id: "00000000-0000-4000-8000-000000000000",
      type: "deadline_alert",
      title: "Heads up",
    });
    const handler = await loadHandler();
    const res = await handler(event);
    expect(res).toEqual({ success: true, sent: 1 });
    expect(supabaseState.insertedRows).toHaveLength(1);
    expect(supabaseState.insertedRows[0]).toMatchObject({
      user_id: "00000000-0000-4000-8000-000000000000",
      type: "deadline_alert",
      title: "Heads up",
      message: null,
    });
  });

  it("returns 500 when users fetch fails", async () => {
    supabaseState.usersResult = { data: null, error: { message: "db boom" } };
    readBodyMock.mockResolvedValue({
      target: "all",
      type: "event",
      title: "x",
    });
    const handler = await loadHandler();
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch users",
    });
  });

  it("returns 500 when batch insert fails", async () => {
    supabaseState.notificationsInsertError = { message: "insert boom" };
    readBodyMock.mockResolvedValue({
      target: "all",
      type: "event",
      title: "x",
    });
    const handler = await loadHandler();
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to send broadcast",
    });
  });

  it("batches inserts of 500 rows when there are more than 500 users", async () => {
    const big = Array.from({ length: 1234 }, (_, i) => ({ id: `u-${i}` }));
    supabaseState.usersResult = { data: big, error: null };
    readBodyMock.mockResolvedValue({
      target: "all",
      type: "event",
      title: "blast",
    });
    const handler = await loadHandler();
    const res = await handler(event);
    expect(res).toEqual({ success: true, sent: 1234 });
    expect(supabaseState.insertedRows).toHaveLength(1234);
  });

  it("treats empty user list as a no-op success", async () => {
    supabaseState.usersResult = { data: [], error: null };
    readBodyMock.mockResolvedValue({
      target: "all",
      type: "event",
      title: "x",
    });
    const handler = await loadHandler();
    const res = await handler(event);
    expect(res).toEqual({ success: true, sent: 0 });
    expect(supabaseState.insertedRows).toHaveLength(0);
  });

  it("accepts message=undefined and stores null", async () => {
    readBodyMock.mockResolvedValue({
      target: "all",
      type: "weekly_digest",
      title: "digest",
    });
    const handler = await loadHandler();
    await handler(event);
    expect(supabaseState.insertedRows[0]).toMatchObject({ message: null });
  });
});
