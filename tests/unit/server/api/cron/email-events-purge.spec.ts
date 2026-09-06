import { describe, it, expect } from "vitest";
import { vi } from "vitest";

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

const deletedRows = [{ id: "evt-1" }, { id: "evt-2" }, { id: "evt-3" }];
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

describe("GET /api/cron/email-events-purge", () => {
  it("purges email_events older than 30 days and reports the count", async () => {
    const { default: handler } =
      await import("~/server/api/cron/email-events-purge.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ deletedEmailEvents: 3 });
  });
});
