import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-1",
  athleteId: "user-1",
  athlete: { graduation_year: 2028 } as { graduation_year: number | null } | null,
  tasks: [] as {
    id: string;
    grade_level: number;
    dependency_task_ids: string[] | null;
    deadline_offset_months: number | null;
  }[],
  tasksError: null as object | null,
  athleteTasks: [] as { task_id: string; status: string }[],
  athleteTasksError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/athleteAccess", () => ({
  resolveTargetAthleteId: vi.fn(async () => mockState.athleteId),
}));

vi.mock("~/server/utils/taskDeadlines", () => ({
  computeTaskDeadline: vi.fn(() => null),
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
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.athlete, error: null }),
            }),
          }),
        };
      }
      if (table === "task") {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          order: () =>
            Promise.resolve({ data: mockState.tasks, error: mockState.tasksError }),
        };
        return chain;
      }
      if (table === "athlete_task") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: mockState.athleteTasks,
                error: mockState.athleteTasksError,
              }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  })),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getQuery: vi.fn(() => ({})),
  };
});

// createError is a Nuxt auto-import (unimported global) in with-status.get.ts.
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

const { default: handler } = await import("~/server/api/tasks/with-status.get");

describe("GET /api/tasks/with-status", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.athleteId = "user-1";
    mockState.athlete = { graduation_year: 2028 };
    mockState.tasks = [
      {
        id: "task-1",
        grade_level: 9,
        dependency_task_ids: [],
        deadline_offset_months: null,
      },
    ];
    mockState.tasksError = null;
    mockState.athleteTasks = [{ task_id: "task-1", status: "completed" }];
    mockState.athleteTasksError = null;
  });

  it("returns tasks merged with the athlete's completion status", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].athlete_task).toMatchObject({ status: "completed" });
  });

  it("resolves a parent's ?athleteId to the linked athlete's tasks", async () => {
    mockState.athleteId = "player-1";
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result.success).toBe(true);
  });

  it("returns 500 when the task fetch fails", async () => {
    mockState.tasksError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 500 when the athlete_task fetch fails", async () => {
    mockState.athleteTasksError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
