import { describe, it, expect, vi, beforeEach } from "vitest";

const VALID_NUX_PROGRESS = {
  version: 1,
  checklist: {
    items: {
      sport: { completed: true, completedAt: "2026-09-01T00:00:00.000Z" },
    },
    dismissedAt: null,
    allCompleteAt: null,
  },
  profileCompletion: { completedAt: null },
  firstVisits: { dashboard: "2026-09-01T00:00:00.000Z" },
  dismissals: {},
};

const mockState = {
  body: { nux_progress: VALID_NUX_PROGRESS } as Record<string, unknown>,
  updateError: null as object | null,
};

const mockEq = vi.fn(() => Promise.resolve({ error: mockState.updateError }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-id" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => mockState.body),
    createError: (opts: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(opts.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = opts.statusCode;
      return err;
    },
  };
});

import handler from "~/server/api/user/nux-progress.patch";

const mockEvent = {} as any;

describe("PATCH /api/user/nux-progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.body = { nux_progress: VALID_NUX_PROGRESS };
    mockState.updateError = null;
    mockEq.mockResolvedValue({ error: null });
  });

  it("saves a valid nux_progress object", async () => {
    const result = await handler(mockEvent);

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      nux_progress: VALID_NUX_PROGRESS,
    });
  });

  it("400s when nux_progress is missing", async () => {
    mockState.body = {};

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("400s when nux_progress is not an object", async () => {
    mockState.body = { nux_progress: "not-an-object" };

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("400s when a checklist item key isn't a real NuxChecklistKey", async () => {
    mockState.body = {
      nux_progress: {
        ...VALID_NUX_PROGRESS,
        checklist: {
          ...VALID_NUX_PROGRESS.checklist,
          items: { not_a_real_key: { completed: true, completedAt: null } },
        },
      },
    };

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("400s when version is missing", async () => {
    const { version: _version, ...rest } = VALID_NUX_PROGRESS;
    mockState.body = { nux_progress: rest };

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("returns 500 when the update fails", async () => {
    mockState.updateError = { message: "db error" };
    mockEq.mockResolvedValue({ error: mockState.updateError });

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
