/**
 * Bug: server/api/athlete/status/recalculate.post.ts treated a query error
 * as "0 for that sub-score" instead of failing the request, so a transient
 * DB error could permanently downgrade and PERSIST a wrong status_score to
 * users.status_score (planning/audit-2026-07-27-findings.md, "4.
 * Correctness / bugs": recalculate.post.ts:101-118,196).
 *
 * These tests inject an error at each of the query points the handler reads
 * before persisting (schools, interactions, academic data) and assert:
 *  1. The request fails (500), not a 200 with a zeroed sub-score.
 *  2. users.update() is never called — the stored status_score is left
 *     untouched (AC4: "Transient DB error during recalculation leaves
 *     stored score unchanged").
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/auditLog", () => ({
  logCRUD: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "athlete-1" })),
  assertNotParent: vi.fn(async () => {}),
}));

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage: string;
    }) => Error & { statusCode: number };
  }
).createError = (config: { statusCode: number; statusMessage: string }) => {
  const err = new Error(config.statusMessage) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

type TableResponse = { data: unknown; error: unknown };

function makeQueryBuilder(response: TableResponse) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => builder),
    update: vi.fn(() => builder),
    then: (resolve: (value: TableResponse) => unknown) => resolve(response),
  };
  return builder;
}

const tableQueues: Record<string, TableResponse[]> = {};
const updateSpy = vi.fn();

function queueResponse(table: string, response: TableResponse) {
  tableQueues[table] = tableQueues[table] || [];
  tableQueues[table].push(response);
}

const mockSupabase = {
  from: vi.fn((table: string) => {
    const queue = tableQueues[table];
    const response =
      queue && queue.length ? queue.shift()! : { data: null, error: null };
    const builder = makeQueryBuilder(response);
    if (table === "users") {
      const originalUpdate = builder.update as (...args: unknown[]) => unknown;
      builder.update = vi.fn((...args: unknown[]) => {
        updateSpy(...args);
        return originalUpdate(...args);
      });
    }
    return builder;
  }),
};

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: () => mockSupabase,
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
  };
});

const mockEvent = { context: {}, node: { req: {}, res: {} } } as H3Event;

function seedHappyPath() {
  // 1st users call: getUserRole (from assertNotParent — mocked away, so unused)
  // 2nd users call: current_phase lookup
  queueResponse("users", { data: { current_phase: "freshman" }, error: null });
  queueResponse("task", { data: [{ id: "t1" }, { id: "t2" }], error: null });
  queueResponse("athlete_task", { data: [{ task_id: "t1" }], error: null });
  queueResponse("schools", { data: [{ id: "s1" }], error: null });
  queueResponse("interactions", {
    data: [{ created_at: new Date().toISOString(), sentiment: "positive" }],
    error: null,
  });
  // 3rd users call: academic data
  queueResponse("users", {
    data: { gpa: 3.5, sat_score: 1200, act_score: null },
    error: null,
  });
  // 4th users call: the persisting update
  queueResponse("users", { data: null, error: null });
}

describe("POST /api/athlete/status/recalculate — error propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(tableQueues)) delete tableQueues[key];
  });

  it("regression: persists the computed score on the happy path", async () => {
    seedHappyPath();
    const { default: handler } =
      await import("~/server/api/athlete/status/recalculate.post");
    const result = (await handler(mockEvent)) as { score: number };

    expect(typeof result.score).toBe("number");
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it("fails the request (not 0-scored) when the schools query errors, and does not persist", async () => {
    queueResponse("users", {
      data: { current_phase: "freshman" },
      error: null,
    });
    queueResponse("task", { data: [], error: null });
    queueResponse("athlete_task", { data: [], error: null });
    queueResponse("schools", { data: null, error: { message: "db down" } });

    const { default: handler } =
      await import("~/server/api/athlete/status/recalculate.post");

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("fails the request (not 0-scored) when the interactions query errors, and does not persist", async () => {
    queueResponse("users", {
      data: { current_phase: "freshman" },
      error: null,
    });
    queueResponse("task", { data: [], error: null });
    queueResponse("athlete_task", { data: [], error: null });
    queueResponse("schools", { data: [], error: null });
    queueResponse("interactions", {
      data: null,
      error: { message: "db down" },
    });

    const { default: handler } =
      await import("~/server/api/athlete/status/recalculate.post");

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("fails the request (not 0-scored) when the academic-data query errors, and does not persist", async () => {
    queueResponse("users", {
      data: { current_phase: "freshman" },
      error: null,
    });
    queueResponse("task", { data: [], error: null });
    queueResponse("athlete_task", { data: [], error: null });
    queueResponse("schools", { data: [], error: null });
    queueResponse("interactions", { data: [], error: null });
    queueResponse("users", { data: null, error: { message: "db down" } });

    const { default: handler } =
      await import("~/server/api/athlete/status/recalculate.post");

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
