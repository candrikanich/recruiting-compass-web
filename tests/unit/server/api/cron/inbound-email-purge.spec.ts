import { describe, it, expect, vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
});
vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));
vi.mock("~/server/utils/cronRunner", () => ({
  withCronRun: async (
    _event: unknown,
    _name: string,
    fn: (ctx: unknown) => unknown,
  ) => fn({ setProcessed: vi.fn(), setFailed: vi.fn() }),
}));

const deletedRows = [{ id: "raw-1" }, { id: "raw-2" }];
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: () => ({
      delete: () => ({
        lt: () => ({
          select: async () => ({ data: deletedRows, error: null }),
        }),
      }),
    }),
  }),
}));

describe("GET /api/cron/inbound-email-purge", () => {
  it("purges raw_inbound_emails older than 7 days and reports the count", async () => {
    const { default: handler } =
      await import("~/server/api/cron/inbound-email-purge.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ deletedRawEmails: 2 });
  });
});
