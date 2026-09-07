import { describe, it, expect, vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getQuery: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});
vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1" }),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

const rows = [
  {
    id: "evt-1",
    message_id: "msg-1",
    event_type: "delivered",
    recipient_email: "a@b.com",
    subject: "hi",
    occurred_at: "2026-09-06T00:00:00Z",
    created_at: "2026-09-06T00:00:00Z",
  },
];

function buildQueryChain(finalResult: {
  data: unknown;
  error: unknown;
  count: number;
}) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.ilike = vi.fn(() => chain);
  chain.range = vi.fn(async () => finalResult);
  return chain;
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: () => buildQueryChain({ data: rows, error: null, count: 1 }),
  }),
}));

import { getQuery } from "h3";

describe("GET /api/admin/email-events", () => {
  it("returns rows and total", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const { default: handler } =
      await import("~/server/api/admin/email-events.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ rows, total: 1 });
  });

  it("clamps limit to 200", async () => {
    vi.mocked(getQuery).mockReturnValue({ limit: "9999" });
    const { default: handler } =
      await import("~/server/api/admin/email-events.get");
    await expect(handler({} as Parameters<typeof handler>[0])).resolves.toEqual(
      { rows, total: 1 },
    );
  });

  it("clamps negative limit to 1", async () => {
    vi.mocked(getQuery).mockReturnValue({ limit: "-5" });
    const { default: handler } =
      await import("~/server/api/admin/email-events.get");
    await expect(handler({} as Parameters<typeof handler>[0])).resolves.toEqual(
      { rows, total: 1 },
    );
  });
});
