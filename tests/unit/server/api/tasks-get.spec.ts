import { describe, it, expect, vi, beforeEach } from "vitest";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ATHLETE_ID = USER_ID;

type Queued = { data: unknown; error: unknown };

const queues: Record<string, Queued[]> = {
  task: [],
  users: [],
};
const calls: Array<{ table: string; op: string; args: unknown[] }> = [];

function take(table: string): Queued {
  return queues[table]?.shift() ?? { data: null, error: null };
}

function makeChain(table: string) {
  const result = Promise.resolve(take(table));
  const chain: Record<string, unknown> = {};
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ table, op, args });
      return chain;
    };
  chain.select = record("select");
  chain.eq = record("eq");
  chain.contains = record("contains");
  chain.order = record("order");
  chain.range = record("range");
  chain.single = () => {
    calls.push({ table, op: "single", args: [] });
    return result;
  };
  chain.maybeSingle = () => {
    calls.push({ table, op: "maybeSingle", args: [] });
    return result;
  };
  chain.then = (onFulfilled: unknown, onRejected: unknown) =>
    result.then(onFulfilled as never, onRejected as never);
  return chain;
}

let mockQuery: Record<string, string> = {};

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getQuery: vi.fn(() => mockQuery),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: USER_ID })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: (table: string) => makeChain(table),
  })),
}));

vi.mock("~/server/utils/athleteAccess", () => ({
  resolveTargetAthleteId: vi.fn(async () => ATHLETE_ID),
}));

vi.mock("~/server/utils/cache", () => ({
  getCached: vi.fn(() => null),
  setCached: vi.fn(),
}));

vi.mock("~/server/utils/taskDeadlines", () => ({
  computeTaskDeadline: vi.fn(() => "2027-01-01"),
}));

import { requireAuth } from "~/server/utils/auth";
import { getCached } from "~/server/utils/cache";

// createError is a Nuxt auto-import (not explicitly imported from h3 in the handler)
const createErrorImpl = (config: {
  statusCode: number;
  statusMessage: string;
}) => {
  const err = new Error(config.statusMessage) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};
vi.stubGlobal("createError", createErrorImpl);

function seedDefaults() {
  queues.task = [
    {
      data: [
        {
          id: "t1",
          category: "academic",
          grade_level: 10,
          title: "Register for SAT",
          description: "Sign up",
          required: true,
          dependency_task_ids: [],
          why_it_matters: "Scores matter",
          failure_risk: "Late registration",
          division_applicability: ["D1", "D2"],
          deadline_offset_months: 18,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      ],
      error: null,
    },
  ];
  queues.users = [
    { data: { graduation_year: 2028 }, error: null },
  ];
}

describe("GET /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    queues.task = [];
    queues.users = [];
    mockQuery = {};
  });

  // ──────────── Grade-level filtering ────────────

  it("filters by gradeLevel when provided", async () => {
    mockQuery = { gradeLevel: "10" };
    seedDefaults();

    const { default: handler } = await import("~/server/api/tasks/index.get");
    await handler({} as never);

    const eqCalls = calls.filter(
      (c) => c.table === "task" && c.op === "eq" && c.args[0] === "grade_level",
    );
    expect(eqCalls).toHaveLength(1);
    expect(eqCalls[0].args[1]).toBe(10);
  });

  it("skips grade filter when gradeLevel is absent", async () => {
    mockQuery = {};
    seedDefaults();

    const { default: handler } = await import("~/server/api/tasks/index.get");
    await handler({} as never);

    const eqCalls = calls.filter(
      (c) => c.table === "task" && c.op === "eq" && c.args[0] === "grade_level",
    );
    expect(eqCalls).toHaveLength(0);
  });

  it("skips grade filter when gradeLevel is NaN (e.g. 'abc')", async () => {
    mockQuery = { gradeLevel: "abc" };
    seedDefaults();

    const { default: handler } = await import("~/server/api/tasks/index.get");
    await handler({} as never);

    const eqCalls = calls.filter(
      (c) => c.table === "task" && c.op === "eq" && c.args[0] === "grade_level",
    );
    expect(eqCalls).toHaveLength(0);
  });

  // ──────────── Category + division filters ────────────

  it("filters by category when provided", async () => {
    mockQuery = { category: "academic" };
    seedDefaults();

    const { default: handler } = await import("~/server/api/tasks/index.get");
    await handler({} as never);

    const eqCalls = calls.filter(
      (c) => c.table === "task" && c.op === "eq" && c.args[0] === "category",
    );
    expect(eqCalls).toHaveLength(1);
    expect(eqCalls[0].args[1]).toBe("academic");
  });

  it("filters by division using .contains()", async () => {
    mockQuery = { division: "D1" };
    seedDefaults();

    const { default: handler } = await import("~/server/api/tasks/index.get");
    await handler({} as never);

    const containsCalls = calls.filter(
      (c) =>
        c.table === "task" &&
        c.op === "contains" &&
        c.args[0] === "division_applicability",
    );
    expect(containsCalls).toHaveLength(1);
    expect(containsCalls[0].args[1]).toEqual(["D1"]);
  });

  it("applies combined grade + category + division filters", async () => {
    mockQuery = { gradeLevel: "11", category: "recruiting", division: "D2" };
    seedDefaults();

    const { default: handler } = await import("~/server/api/tasks/index.get");
    await handler({} as never);

    const gradeEq = calls.filter(
      (c) => c.table === "task" && c.op === "eq" && c.args[0] === "grade_level",
    );
    const catEq = calls.filter(
      (c) => c.table === "task" && c.op === "eq" && c.args[0] === "category",
    );
    const divContains = calls.filter(
      (c) => c.table === "task" && c.op === "contains",
    );

    expect(gradeEq).toHaveLength(1);
    expect(gradeEq[0].args[1]).toBe(11);
    expect(catEq).toHaveLength(1);
    expect(catEq[0].args[1]).toBe("recruiting");
    expect(divContains).toHaveLength(1);
    expect(divContains[0].args[1]).toEqual(["D2"]);
  });

  // ──────────── Error handling ────────────

  it("throws 500 when Supabase returns an error", async () => {
    mockQuery = {};
    queues.task = [{ data: null, error: { message: "DB down" } }];
    queues.users = [{ data: null, error: null }];

    const { default: handler } = await import("~/server/api/tasks/index.get");

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch tasks",
    });
  });

  it("propagates auth errors from requireAuth", async () => {
    const authErr = new Error("Unauthorized") as Error & { statusCode: number };
    authErr.statusCode = 401;
    vi.mocked(requireAuth).mockRejectedValueOnce(authErr);

    const { default: handler } = await import("~/server/api/tasks/index.get");

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  // ──────────── Response shape ────────────

  it("returns tasks with deadline_date computed from graduation_year + offset", async () => {
    mockQuery = {};
    seedDefaults();

    const { default: handler } = await import("~/server/api/tasks/index.get");
    const result = await handler({} as never);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "t1",
      title: "Register for SAT",
      deadline_date: "2027-01-01",
    });
    expect(result[0]).not.toHaveProperty("deadline_offset_months");
  });

  it("serves from cache on cache hit and skips DB query for templates", async () => {
    mockQuery = {};
    const cachedTemplates = [
      {
        id: "cached-1",
        category: "athletic",
        grade_level: 9,
        title: "Cached task",
        description: "From cache",
        required: false,
        dependency_task_ids: [],
        why_it_matters: null,
        failure_risk: null,
        division_applicability: ["D1"],
        deadline_offset_months: 12,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ];
    vi.mocked(getCached).mockReturnValueOnce(cachedTemplates);
    // Still need users query for graduation_year
    queues.users = [{ data: { graduation_year: 2028 }, error: null }];

    const { default: handler } = await import("~/server/api/tasks/index.get");
    const result = await handler({} as never);

    const taskCalls = calls.filter((c) => c.table === "task");
    expect(taskCalls).toHaveLength(0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("cached-1");
    expect(result[0].deadline_date).toBe("2027-01-01");
  });
});
