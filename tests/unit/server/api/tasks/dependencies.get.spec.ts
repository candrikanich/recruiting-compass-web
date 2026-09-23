import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-1",
  task: null as
    | { id: string; dependency_task_ids: string[] | null }
    | null,
  taskError: null as object | null,
  prerequisites: [] as { id: string }[],
  athleteTasks: [] as { task_id: string; status: string }[],
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => "11111111-1111-4111-8111-111111111111"),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "task") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: mockState.task,
                  error: mockState.taskError,
                }),
            }),
            in: () =>
              Promise.resolve({ data: mockState.prerequisites, error: null }),
          }),
        };
      }
      if (table === "athlete_task") {
        return {
          select: () => ({
            eq: () => ({
              in: () =>
                Promise.resolve({ data: mockState.athleteTasks, error: null }),
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
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } = await import(
  "~/server/api/tasks/[taskId]/dependencies.get"
);

describe("GET /api/tasks/[taskId]/dependencies", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.task = { id: "task-1", dependency_task_ids: [] };
    mockState.taskError = null;
    mockState.prerequisites = [];
    mockState.athleteTasks = [];
  });

  it("returns complete=true when the task has no dependencies", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      complete: true,
      prerequisites: [],
      incompletePrerequisites: [],
    });
  });

  it("returns incomplete prerequisites for the caller's own athlete_task rows", async () => {
    mockState.task = { id: "task-1", dependency_task_ids: ["dep-1", "dep-2"] };
    mockState.prerequisites = [{ id: "dep-1" }, { id: "dep-2" }];
    mockState.athleteTasks = [{ task_id: "dep-1", status: "completed" }];

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result.complete).toBe(false);
    expect(result.incompletePrerequisites).toEqual([{ id: "dep-2" }]);
  });

  it("returns complete=true when all prerequisites are completed", async () => {
    mockState.task = { id: "task-1", dependency_task_ids: ["dep-1"] };
    mockState.prerequisites = [{ id: "dep-1" }];
    mockState.athleteTasks = [{ task_id: "dep-1", status: "completed" }];

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result.complete).toBe(true);
  });

  it("returns 404 when the task is not found", async () => {
    mockState.taskError = { message: "not found" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
