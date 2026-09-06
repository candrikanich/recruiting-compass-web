import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
});
vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));
vi.mock("~/server/utils/cronRunner", () => ({
  withCronRun: async (_event: unknown, _name: string, fn: (ctx: unknown) => unknown) =>
    fn({ setProcessed: vi.fn(), setFailed: vi.fn() }),
}));

const mockState = {
  deletedRawEmails: [{ id: "raw-1" }, { id: "raw-2" }] as { id: string }[],
  nonConfirmedDrafts: [] as { id: string }[],
  orphanedAttachments: [] as { id: string; storage_path: string }[],
  removedStoragePaths: [] as string[],
  deletedAttachmentIds: [] as unknown[],
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "raw_inbound_emails") {
        return {
          delete: () => ({
            lt: () => ({
              select: async () => ({ data: mockState.deletedRawEmails, error: null }),
            }),
          }),
        };
      }
      if (table === "inbound_email_drafts") {
        return {
          select: () => ({
            neq: async () => ({ data: mockState.nonConfirmedDrafts, error: null }),
          }),
        };
      }
      if (table === "raw_inbound_attachments") {
        return {
          select: () => ({
            in: () => ({
              lt: async () => ({ data: mockState.orphanedAttachments, error: null }),
            }),
          }),
          delete: () => ({
            in: (_column: string, ids: unknown[]) => {
              mockState.deletedAttachmentIds = ids;
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    storage: {
      from: (_bucket: string) => ({
        remove: (paths: string[]) => {
          mockState.removedStoragePaths = paths;
          return Promise.resolve({ error: null });
        },
      }),
    },
  }),
}));

describe("GET /api/cron/inbound-email-purge", () => {
  beforeEach(() => {
    mockState.deletedRawEmails = [{ id: "raw-1" }, { id: "raw-2" }];
    mockState.nonConfirmedDrafts = [];
    mockState.orphanedAttachments = [];
    mockState.removedStoragePaths = [];
    mockState.deletedAttachmentIds = [];
  });

  it("purges raw_inbound_emails older than 7 days and reports the count", async () => {
    const { default: handler } = await import("~/server/api/cron/inbound-email-purge.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ deletedRawEmails: 2, deletedOrphanedAttachments: 0 });
  });

  it("purges orphaned raw_inbound_attachments (discarded/never-confirmed) + their storage objects", async () => {
    mockState.nonConfirmedDrafts = [{ id: "draft-discarded" }, { id: "draft-stale-pending" }];
    mockState.orphanedAttachments = [
      { id: "att-1", storage_path: "family-1/inbound/draft-discarded-camp.pdf" },
      { id: "att-2", storage_path: "family-1/inbound/draft-stale-pending-roster.pdf" },
    ];

    const { default: handler } = await import("~/server/api/cron/inbound-email-purge.get");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ deletedRawEmails: 2, deletedOrphanedAttachments: 2 });
    expect(mockState.removedStoragePaths).toEqual([
      "family-1/inbound/draft-discarded-camp.pdf",
      "family-1/inbound/draft-stale-pending-roster.pdf",
    ]);
    expect(mockState.deletedAttachmentIds).toEqual(["att-1", "att-2"]);
  });

  it("never queries raw_inbound_attachments when there are no non-confirmed drafts", async () => {
    mockState.nonConfirmedDrafts = [];
    const { default: handler } = await import("~/server/api/cron/inbound-email-purge.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ deletedRawEmails: 2, deletedOrphanedAttachments: 0 });
    expect(mockState.removedStoragePaths).toEqual([]);
  });
});
