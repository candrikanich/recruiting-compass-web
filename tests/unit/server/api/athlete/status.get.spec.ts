import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-abc",
  role: "player" as "player" | "parent",
  familyMembership: { data: null as { family_unit_id: string } | null },
  playerMember: { data: null as { user_id: string } | null },
  rpcData: [
    {
      task_completion_rate: 50,
      interaction_frequency_score: 20,
      coach_interest_score: 10,
      academic_standing_score: 50,
      last_interaction_date: null,
      school_count: 2,
      completed_task_count: 3,
    },
  ] as unknown[] | null,
  rpcError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
  getUserRole: vi.fn(async () => mockState.role),
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
      if (table === "family_members") {
        let call = 0;
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => {
                  call += 1;
                  return Promise.resolve(
                    call === 1 ? mockState.familyMembership : mockState.playerMember,
                  );
                },
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: (fn: string) => {
      if (fn !== "get_athlete_status") throw new Error(`unexpected rpc ${fn}`);
      return Promise.resolve({ data: mockState.rpcData, error: mockState.rpcError });
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
  };
});

// createError is a Nuxt auto-import (unimported global) in status.get.ts.
(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => Error & { statusCode: number };
  }
).createError = (config: {
  statusCode: number;
  statusMessage?: string;
  message?: string;
}) => {
  const err = new Error(config.statusMessage ?? config.message) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

const { default: handler } = await import("~/server/api/athlete/status.get");

describe("GET /api/athlete/status", () => {
  beforeEach(() => {
    mockState.userId = "user-abc";
    mockState.role = "player";
    mockState.rpcData = [
      {
        task_completion_rate: 50,
        interaction_frequency_score: 20,
        coach_interest_score: 10,
        academic_standing_score: 50,
        last_interaction_date: null,
        school_count: 2,
        completed_task_count: 3,
      },
    ];
    mockState.rpcError = null;
  });

  it("returns a computed status score for the athlete's own data", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toHaveProperty("score");
  });

  it("resolves a parent's call to their linked player before calling the RPC", async () => {
    mockState.role = "parent";
    mockState.familyMembership = { data: { family_unit_id: "fam-1" } };
    mockState.playerMember = { data: { user_id: "player-1" } };
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toHaveProperty("score");
  });

  it("returns 500 when the RPC errors", async () => {
    mockState.rpcError = { message: "not authorized" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 500 when the RPC returns no rows", async () => {
    mockState.rpcData = [];
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
