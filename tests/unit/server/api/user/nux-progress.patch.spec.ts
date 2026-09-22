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
  createServerSupabaseUserClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
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

  describe("legacy/malformed nested data is normalized, not rejected (qodo review, #913)", () => {
    it("drops a checklist item under an unrecognized key instead of rejecting the whole save", async () => {
      mockState.body = {
        nux_progress: {
          ...VALID_NUX_PROGRESS,
          checklist: {
            ...VALID_NUX_PROGRESS.checklist,
            items: {
              sport: { completed: true, completedAt: null },
              not_a_real_key: { completed: true, completedAt: null },
            },
          },
        },
      };

      const result = await handler(mockEvent);

      expect(result).toEqual({ success: true });
      const saved = mockUpdate.mock.calls[0][0].nux_progress;
      expect(Object.keys(saved.checklist.items)).toEqual(["sport"]);
    });

    it("drops a malformed checklist item instead of rejecting the whole save", async () => {
      mockState.body = {
        nux_progress: {
          ...VALID_NUX_PROGRESS,
          checklist: {
            ...VALID_NUX_PROGRESS.checklist,
            items: { sport: { completed: "not-a-boolean" } },
          },
        },
      };

      const result = await handler(mockEvent);

      expect(result).toEqual({ success: true });
      const saved = mockUpdate.mock.calls[0][0].nux_progress;
      expect(saved.checklist.items).toEqual({});
    });

    it("normalizes an invalid allCompleteAt string to null instead of rejecting (prevents NaN in hasNuxCompletionExpired)", async () => {
      mockState.body = {
        nux_progress: {
          ...VALID_NUX_PROGRESS,
          checklist: {
            ...VALID_NUX_PROGRESS.checklist,
            allCompleteAt: "not-a-real-date",
          },
        },
      };

      const result = await handler(mockEvent);

      expect(result).toEqual({ success: true });
      const saved = mockUpdate.mock.calls[0][0].nux_progress;
      expect(saved.checklist.allCompleteAt).toBeNull();
    });

    it("drops a firstVisits entry with an invalid timestamp instead of rejecting the whole save", async () => {
      mockState.body = {
        nux_progress: {
          ...VALID_NUX_PROGRESS,
          firstVisits: { dashboard: "not-a-real-date" },
        },
      };

      const result = await handler(mockEvent);

      expect(result).toEqual({ success: true });
      const saved = mockUpdate.mock.calls[0][0].nux_progress;
      expect(saved.firstVisits).toEqual({});
    });

    // Regression: iOS's JSONEncoder uses default synthesized encoding for
    // Date? fields -- nil optionals are OMITTED from the JSON body, not
    // sent as null. Every timestamp key here is entirely absent, matching
    // NuxProgressServiceImpl.saveNuxProgress()'s real wire shape for an
    // athlete who hasn't completed anything yet.
    it("accepts an iOS-shaped payload with all timestamp keys omitted", async () => {
      mockState.body = {
        nux_progress: {
          version: 1,
          checklist: { items: {} },
          profileCompletion: {},
          firstVisits: {},
          dismissals: {},
        },
      };

      const result = await handler(mockEvent);

      expect(result).toEqual({ success: true });
      const saved = mockUpdate.mock.calls[0][0].nux_progress;
      expect(saved.checklist.dismissedAt).toBeNull();
      expect(saved.checklist.allCompleteAt).toBeNull();
      expect(saved.profileCompletion.completedAt).toBeNull();
    });

    it("accepts a checklist item with completedAt omitted (iOS shape)", async () => {
      mockState.body = {
        nux_progress: {
          ...VALID_NUX_PROGRESS,
          checklist: {
            ...VALID_NUX_PROGRESS.checklist,
            items: { sport: { completed: true } },
          },
        },
      };

      const result = await handler(mockEvent);

      expect(result).toEqual({ success: true });
      const saved = mockUpdate.mock.calls[0][0].nux_progress;
      expect(saved.checklist.items.sport).toEqual({
        completed: true,
        completedAt: null,
      });
    });

    it("accepts iOS's non-fractional-second ISO datetime format", async () => {
      mockState.body = {
        nux_progress: {
          ...VALID_NUX_PROGRESS,
          checklist: {
            ...VALID_NUX_PROGRESS.checklist,
            items: {
              sport: { completed: true, completedAt: "2026-09-21T16:51:00Z" },
            },
          },
        },
      };

      const result = await handler(mockEvent);

      expect(result).toEqual({ success: true });
      const saved = mockUpdate.mock.calls[0][0].nux_progress;
      expect(saved.checklist.items.sport.completedAt).toBe(
        "2026-09-21T16:51:00Z",
      );
    });
  });
});
