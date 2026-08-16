/**
 * withCronRun / requireCronAuth — the shared cron auth gate + cron_runs
 * recording wrapper. Covers: 401 before any row is written, success/partial/
 * error status mapping with duration + row counts, rethrow on failure, and the
 * critical guarantee that a failure to RECORD the run never breaks or masks the
 * job itself.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

process.env.CRON_SECRET = "test-cron-secret";

interface UpdateCapture {
  status: string;
  duration_ms: number | null;
  rows_processed: number | null;
  rows_failed: number | null;
  error: string | null;
  finished_at: string;
}

let insertCalls: Array<{ job_name: string; status: string }>;
let updateCalls: UpdateCapture[];
let insertShouldFail: boolean;

const supabaseMock = {
  from: vi.fn((table: string) => {
    expect(table).toBe("cron_runs");
    return {
      insert: (row: { job_name: string; status: string }) => {
        insertCalls.push(row);
        return {
          select: () => ({
            single: () =>
              Promise.resolve(
                insertShouldFail
                  ? { data: null, error: { message: "insert boom" } }
                  : { data: { id: "run-1" }, error: null },
              ),
          }),
        };
      },
      update: (fields: UpdateCapture) => ({
        eq: () => {
          updateCalls.push(fields);
          return Promise.resolve({ error: null });
        },
      }),
    };
  }),
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => supabaseMock,
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { withCronRun, requireCronAuth } from "~/server/utils/cronRunner";

function fakeEvent(headers: Record<string, string> = {}): H3Event {
  return { node: { req: { headers }, res: {} } } as unknown as H3Event;
}

const authed = () => fakeEvent({ authorization: "Bearer test-cron-secret" });

describe("requireCronAuth", () => {
  it("throws 401 with no secret", () => {
    expect(() => requireCronAuth(fakeEvent())).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("throws 401 with the wrong secret", () => {
    expect(() =>
      requireCronAuth(fakeEvent({ authorization: "Bearer nope" })),
    ).toThrowError(expect.objectContaining({ statusCode: 401 }));
  });

  it("accepts the legacy x-cron-secret header", () => {
    expect(() =>
      requireCronAuth(fakeEvent({ "x-cron-secret": "test-cron-secret" })),
    ).not.toThrow();
  });
});

describe("withCronRun", () => {
  beforeEach(() => {
    insertCalls = [];
    updateCalls = [];
    insertShouldFail = false;
    vi.clearAllMocks();
  });

  it("rejects unauthorized before writing any row", async () => {
    await expect(
      withCronRun(fakeEvent(), "job-x", async () => ({ ok: true })),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(insertCalls).toHaveLength(0);
  });

  it("records a successful run and returns fn's value unchanged", async () => {
    const result = await withCronRun(authed(), "job-x", async (ctx) => {
      ctx.setProcessed(5);
      return { hello: "world" };
    });

    expect(result).toEqual({ hello: "world" });
    expect(insertCalls).toEqual([{ job_name: "job-x", status: "running" }]);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].status).toBe("success");
    expect(updateCalls[0].rows_processed).toBe(5);
    expect(updateCalls[0].rows_failed).toBeNull();
    expect(updateCalls[0].duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("records 'partial' when the job reports failed rows", async () => {
    await withCronRun(authed(), "job-x", async (ctx) => {
      ctx.setProcessed(10);
      ctx.setFailed(2);
      return {};
    });
    expect(updateCalls[0].status).toBe("partial");
    expect(updateCalls[0].rows_failed).toBe(2);
  });

  it("records 'error' with the message and rethrows when fn throws", async () => {
    await expect(
      withCronRun(authed(), "job-x", async () => {
        throw new Error("kaboom");
      }),
    ).rejects.toThrow("kaboom");
    expect(updateCalls[0].status).toBe("error");
    expect(updateCalls[0].error).toBe("kaboom");
  });

  it("does not break the job when the cron_runs insert fails", async () => {
    insertShouldFail = true;
    const result = await withCronRun(authed(), "job-x", async () => ({
      ok: true,
    }));
    expect(result).toEqual({ ok: true });
    // insert failed → no runId → no update attempted, but fn still ran + returned.
    expect(updateCalls).toHaveLength(0);
  });
});
