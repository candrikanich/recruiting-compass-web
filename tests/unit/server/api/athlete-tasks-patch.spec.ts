import { describe, it, expect, vi, beforeEach } from "vitest";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const PREREQ_A = "22222222-2222-4222-8222-222222222222";
const PREREQ_B = "33333333-3333-4333-8333-333333333333";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type Queued = { data: unknown; error: unknown };

const queues: Record<string, Queued[]> = {
  task: [],
  athlete_task: [],
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
  chain.in = record("in");
  chain.update = record("update");
  chain.insert = record("insert");
  chain.upsert = record("upsert");
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

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => TASK_ID),
}));

vi.mock("~/server/utils/auditLog", () => ({
  logCRUD: vi.fn(async () => undefined),
  logError: vi.fn(async () => undefined),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { readBody } from "h3";

describe("PATCH /api/athlete-tasks/[taskId] — prerequisite batching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    queues.task = [];
    queues.athlete_task = [];
    vi.mocked(readBody).mockResolvedValue({ status: "completed" });
  });

  it("loads all prerequisite statuses in one .in() query instead of per-row maybeSingle", async () => {
    queues.task = [
      {
        data: {
          id: TASK_ID,
          title: "Film upload",
          dependency_task_ids: [PREREQ_A, PREREQ_B],
        },
        error: null,
      },
      {
        data: [
          { id: PREREQ_A, title: "Create highlight video" },
          { id: PREREQ_B, title: "Ask coach for feedback" },
        ],
        error: null,
      },
    ];
    queues.athlete_task = [
      {
        data: [
          { task_id: PREREQ_A, status: "completed" },
          { task_id: PREREQ_B, status: "completed" },
        ],
        error: null,
      },
      { data: { id: "existing-row" }, error: null },
      {
        data: {
          id: "existing-row",
          athlete_id: USER_ID,
          task_id: TASK_ID,
          status: "completed",
        },
        error: null,
      },
    ];

    const { default: handler } =
      await import("~/server/api/athlete-tasks/[taskId].patch");
    await handler({} as never);

    const athleteInCalls = calls.filter(
      (c) => c.table === "athlete_task" && c.op === "in",
    );
    expect(athleteInCalls).toHaveLength(1);
    expect(athleteInCalls[0].args[0]).toBe("task_id");
    expect(athleteInCalls[0].args[1]).toEqual([PREREQ_A, PREREQ_B]);

    // The only maybeSingle on athlete_task is the existing-row lookup,
    // not a per-prerequisite status check.
    const maybeSingles = calls.filter(
      (c) => c.table === "athlete_task" && c.op === "maybeSingle",
    );
    expect(maybeSingles).toHaveLength(1);
  });

  it("rejects completion when a batched prerequisite is not completed", async () => {
    queues.task = [
      {
        data: {
          id: TASK_ID,
          title: "Film upload",
          dependency_task_ids: [PREREQ_A, PREREQ_B],
        },
        error: null,
      },
      {
        data: [
          { id: PREREQ_A, title: "Create highlight video" },
          { id: PREREQ_B, title: "Ask coach for feedback" },
        ],
        error: null,
      },
    ];
    queues.athlete_task = [
      {
        data: [{ task_id: PREREQ_A, status: "completed" }],
        error: null,
      },
    ];

    const { default: handler } =
      await import("~/server/api/athlete-tasks/[taskId].patch");

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining("Ask coach for feedback"),
    });
  });

  it("upserts on create so a double-click cannot unique-violate", async () => {
    queues.task = [
      {
        data: { id: TASK_ID, title: "No deps", dependency_task_ids: [] },
        error: null,
      },
    ];
    queues.athlete_task = [
      { data: null, error: null },
      {
        data: {
          id: "new-row",
          athlete_id: USER_ID,
          task_id: TASK_ID,
          status: "completed",
        },
        error: null,
      },
    ];

    const { default: handler } =
      await import("~/server/api/athlete-tasks/[taskId].patch");
    await handler({} as never);

    const upserts = calls.filter(
      (c) => c.table === "athlete_task" && c.op === "upsert",
    );
    expect(upserts).toHaveLength(1);
    expect(upserts[0].args[1]).toEqual({ onConflict: "athlete_id,task_id" });
    expect(
      calls.filter((c) => c.table === "athlete_task" && c.op === "insert"),
    ).toHaveLength(0);
  });
});
