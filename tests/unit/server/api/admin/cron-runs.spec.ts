/**
 * GET /api/admin/cron-runs — the admin Jobs tab summary. Regression coverage
 * for the staleness classification: a job that has NEVER run must read as
 * "pending" (neverRun, not stale), and a job that ran successfully before but
 * has since lapsed past its cadence must read as stale. Shipping the former as
 * a red STALE badge on a freshly deployed schedule was the bug this locks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

const HOUR = 60 * 60 * 1000;

let rows: unknown[];

vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin-1", is_admin: true })),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: rows, error: null }),
        }),
      }),
    }),
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
});

async function loadHandler() {
  return (await import("~/server/api/admin/cron-runs.get")).default;
}

const event = {} as H3Event;

function run(jobName: string, overrides: Record<string, unknown>) {
  return {
    id: `${jobName}-${Math.random()}`,
    job_name: jobName,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    status: "success",
    rows_processed: 1,
    rows_failed: null,
    duration_ms: 10,
    error: null,
    ...overrides,
  };
}

function findJob(result: { jobs: { jobName: string }[] }, name: string) {
  return result.jobs.find((j) => j.jobName === name)!;
}

describe("GET /api/admin/cron-runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    rows = [];
  });

  it("classifies a never-run job as pending, not stale", async () => {
    rows = []; // no runs recorded for any job
    const handler = await loadHandler();
    const result = (await handler(event)) as {
      jobs: {
        jobName: string;
        neverRun: boolean;
        stale: boolean;
        lastRun: unknown;
      }[];
    };

    const job = findJob(result, "orphaned-storage-sweep");
    expect(job.neverRun).toBe(true);
    expect(job.stale).toBe(false);
    expect(job.lastRun).toBeNull();
  });

  it("does not flag a recently-succeeded job stale", async () => {
    rows = [
      run("daily-suggestions", {
        started_at: new Date(Date.now() - 2 * HOUR).toISOString(),
      }),
    ];
    const handler = await loadHandler();
    const result = (await handler(event)) as {
      jobs: { jobName: string; neverRun: boolean; stale: boolean }[];
    };

    const job = findJob(result, "daily-suggestions");
    expect(job.neverRun).toBe(false);
    expect(job.stale).toBe(false);
  });

  it("flags a job stale once its last success lapses past cadence", async () => {
    // daily-suggestions maxAge is 26h; 40h ago is lapsed.
    rows = [
      run("daily-suggestions", {
        started_at: new Date(Date.now() - 40 * HOUR).toISOString(),
      }),
    ];
    const handler = await loadHandler();
    const result = (await handler(event)) as {
      jobs: { jobName: string; stale: boolean }[];
    };

    expect(findJob(result, "daily-suggestions").stale).toBe(true);
  });

  it("marks a job whose latest run is still running", async () => {
    rows = [run("health-ping", { status: "running", finished_at: null })];
    const handler = await loadHandler();
    const result = (await handler(event)) as {
      jobs: { jobName: string; running: boolean }[];
    };

    expect(findJob(result, "health-ping").running).toBe(true);
  });
});
