/**
 * POST /api/admin/cron/trigger — the guarded manual cron trigger. Locks the
 * server-side allowlist gate: only TRIGGERABLE_JOBS run with the caller's
 * dryRun; DRYRUN_ONLY_JOBS always force dryRun=true; BLOCKED_JOBS and any
 * unknown job 403 and never reach $fetch. UI hiding is not the gate — this
 * endpoint is.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// The handler invokes the cron job in-process via useNitroApp().localFetch
// (not a relative $fetch — see trigger.post.ts), so mock that path and have it
// resolve a Response-like { ok, json() }.
const localFetchMock = vi.fn();
vi.stubGlobal("useNitroApp", () => ({ localFetch: localFetchMock }));

const { requireAdmin, logAdminAction } = vi.hoisted(() => ({
  requireAdmin: vi.fn(async (e: any) => {
    e.context.adminUserId = "admin-1";
  }),
  logAdminAction: vi.fn(async () => {}),
}));
vi.mock("~/server/utils/auth", () => ({ requireAdmin }));
vi.mock("~/server/utils/adminAudit", () => ({ logAdminAction }));

// The handler imports readBody explicitly from "h3" (matching sibling
// server/api/admin/*.post.ts files), not the Nitro auto-import global — so
// mock h3's readBody directly to read the fixture's `_body`, keeping every
// other h3 export (defineEventHandler, createError) real.
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return { ...actual, readBody: async (e: any) => e._body };
});

import handler from "~/server/api/admin/cron/trigger.post";

const mkEvent = (body: any) => ({ context: {}, _body: body, node: { req: {} } }) as any;

beforeEach(() => {
  localFetchMock
    .mockReset()
    .mockResolvedValue({ ok: true, json: async () => ({ ran: true }) });
  requireAdmin.mockClear();
  logAdminAction.mockClear();
  process.env.CRON_SECRET = "secret-x";
});

describe("POST /api/admin/cron/trigger", () => {
  it("triggers a safe job with the cron secret and audits it", async () => {
    const res = await handler(mkEvent({ jobName: "health-ping" }));
    expect(res).toMatchObject({ ok: true, jobName: "health-ping", dryRun: false });
    expect(localFetchMock).toHaveBeenCalledWith(
      "/api/cron/health-ping",
      expect.objectContaining({ headers: expect.objectContaining({ "x-cron-secret": "secret-x" }) }),
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "cron.trigger", meta: { jobName: "health-ping", dryRun: false } }),
    );
  });

  it("403s each destructive job, never calls the cron, and audits the block", async () => {
    for (const job of ["process-account-deletions", "notification-prune", "cleanup-expired-invites"]) {
      await expect(handler(mkEvent({ jobName: job }))).rejects.toMatchObject({ statusCode: 403 });
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: "cron.trigger", meta: { jobName: job, blocked: true } }),
      );
    }
    expect(localFetchMock).not.toHaveBeenCalled();
  });

  it("403s an unknown job", async () => {
    await expect(handler(mkEvent({ jobName: "nope" }))).rejects.toMatchObject({ statusCode: 403 });
  });

  it("forces dryRun for orphaned-storage-sweep even if body says false", async () => {
    const res = await handler(mkEvent({ jobName: "orphaned-storage-sweep", dryRun: false }));
    expect(res.dryRun).toBe(true);
    // dryRun is encoded in the URL, not a `query` option.
    expect(localFetchMock).toHaveBeenCalledWith(
      "/api/cron/orphaned-storage-sweep?dryRun=1",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
