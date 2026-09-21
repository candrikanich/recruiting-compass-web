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
  getUserRole: vi.fn(async () => "player"),
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

// athlete_task's SELECT policy doesn't yet recognize family_members-linked
// parents (#926) -- the route reads completed task ids through the
// get_athlete_completed_task_ids RPC instead of a raw .from() query. Queue
// entries the same way as before (queueResponse("athlete_task", {data: [{
// task_id }], error})); the mock RPC unwraps them to a plain id array to
// match the real function's uuid[] return shape.
const rpcQueues: Record<string, TableResponse[]> = {
  set_athlete_status_score: [],
};

const mockSupabase = {
  from: vi.fn((table: string) => {
    const queue = tableQueues[table];
    const response =
      queue && queue.length ? queue.shift()! : { data: null, error: null };
    return makeQueryBuilder(response);
  }),
  rpc: vi.fn((fnName: string, args: unknown) => {
    if (fnName === "get_athlete_completed_task_ids") {
      const queue = tableQueues.athlete_task;
      const response =
        queue && queue.length ? queue.shift()! : { data: [], error: null };
      const ids = (
        (response.data as Array<{ task_id: string }> | null) ?? []
      ).map((row) => row.task_id);
      return Promise.resolve({
        data: response.error ? null : ids,
        error: response.error,
      });
    }
    if (fnName === "set_athlete_status_score") {
      updateSpy(args);
      const queue = rpcQueues.set_athlete_status_score;
      const response =
        queue && queue.length ? queue.shift()! : { data: null, error: null };
      return Promise.resolve(response);
    }
    return Promise.resolve({ data: null, error: null });
  }),
};

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: () => mockSupabase,
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
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
  // getUserRole is mocked directly (no "users" query) — 1st real users call is
  // the current_phase lookup.
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
}

describe("POST /api/athlete/status/recalculate — error propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(tableQueues)) delete tableQueues[key];
    for (const key of Object.keys(rpcQueues)) rpcQueues[key] = [];
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
