import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable state — read at call time by mock factories
const mockState = {
  interactionCount: 0,
  interactionError: null as object | null,
  offerCount: 0,
  offerError: null as object | null,
  postCount: 0,
  postError: null as object | null,
  authToken: "Bearer valid-token",
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-id",
    email: "user@example.com",
  })),
}));

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => "test-coach-id"),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

function buildSelectChain(
  getCount: () => number | null,
  getError: () => object | null,
) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ count: getCount(), error: getError(), data: [] }),
        ),
    }),
  };
}

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "interactions") {
        return buildSelectChain(
          () => mockState.interactionCount,
          () => mockState.interactionError,
        );
      }
      if (table === "offers") {
        return buildSelectChain(
          () => mockState.offerCount,
          () => mockState.offerError,
        );
      }
      if (table === "social_media_posts") {
        return buildSelectChain(
          () => mockState.postCount,
          () => mockState.postError,
        );
      }
      return buildSelectChain(
        () => 0,
        () => null,
      );
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getHeader: vi.fn(() => mockState.authToken),
    getCookie: vi.fn(() => undefined),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { requireAuth } from "~/server/utils/auth";
import { requireUuidParam } from "~/server/utils/validation";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";

const mockEvent = { context: { params: { id: "test-coach-id" } } } as any;

describe("GET /api/coaches/[id]/deletion-blockers", () => {
  beforeEach(async () => {
    mockState.interactionCount = 0;
    mockState.interactionError = null;
    mockState.offerCount = 0;
    mockState.offerError = null;
    mockState.postCount = 0;
    mockState.postError = null;
    mockState.authToken = "Bearer valid-token";

    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
    });
    vi.mocked(requireUuidParam).mockReturnValue("test-coach-id");

    const h3 = await import("h3");
    vi.mocked(h3.getHeader).mockReturnValue("Bearer valid-token");
    vi.mocked(h3.getCookie).mockReturnValue(undefined);
  });

  const getHandler = async () => {
    const { default: handler } =
      await import("~/server/api/coaches/[id]/deletion-blockers.get");
    return handler;
  };

  describe("no blockers", () => {
    it("returns canDelete:true and empty blockers when all counts are 0", async () => {
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.coachId).toBe("test-coach-id");
      expect(result.message).toBe("Coach can be deleted successfully.");
    });
  });

  describe("single blocker", () => {
    it("returns canDelete:false with interactions blocker when interaction count > 0", async () => {
      mockState.interactionCount = 3;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toMatchObject({
        table: "interactions",
        count: 3,
        column: "coach_id",
      });
      expect(result.message).toContain("3 interactions");
    });

    it("returns canDelete:false with offers blocker when offer count > 0", async () => {
      mockState.offerCount = 1;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toMatchObject({
        table: "offers",
        count: 1,
        column: "coach_id",
      });
      expect(result.message).toContain("1 offers");
    });

    it("returns canDelete:false with social_media_posts blocker when post count > 0", async () => {
      mockState.postCount = 5;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toMatchObject({
        table: "social_media_posts",
        count: 5,
        column: "coach_id",
      });
    });
  });

  describe("multiple blockers", () => {
    it("returns all blocking entities when multiple tables have records", async () => {
      mockState.interactionCount = 2;
      mockState.offerCount = 1;
      mockState.postCount = 4;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(3);
      expect(result.blockers).toContainEqual(
        expect.objectContaining({ table: "interactions", count: 2 }),
      );
      expect(result.blockers).toContainEqual(
        expect.objectContaining({ table: "offers", count: 1 }),
      );
      expect(result.blockers).toContainEqual(
        expect.objectContaining({ table: "social_media_posts", count: 4 }),
      );
      expect(result.message).toContain("Cannot delete this coach");
    });
  });

  describe("auth failure", () => {
    it("re-throws H3Error from requireAuth", async () => {
      const h3Error = Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      });
      vi.mocked(requireAuth).mockRejectedValue(h3Error);

      const handler = await getHandler();
      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
        message: "Unauthorized",
      });
      expect(createServerSupabaseUserClient).not.toHaveBeenCalled();
    });
  });

  describe("missing token", () => {
    it("throws 401 when no authorization token is present", async () => {
      mockState.authToken = "";
      const { getHeader } = await import("h3");
      vi.mocked(getHeader).mockReturnValue("");

      const handler = await getHandler();
      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  describe("DB errors are logged but do not throw", () => {
    it("does not block deletion when interaction query returns an error (warns and skips)", async () => {
      mockState.interactionError = { message: "DB connection failed" };
      const handler = await getHandler();
      const result = await handler(mockEvent);

      // Error is logged via logger.warn, count stays 0 so no blocker added
      expect(result.canDelete).toBe(true);
      expect(result.blockers).toEqual([]);
    });
  });
});
