import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable state — read at call time by mock factories
const mockState = {
  coachCount: 0,
  coachError: null as object | null,
  interactionCount: 0,
  interactionError: null as object | null,
  offerCount: 0,
  offerError: null as object | null,
  historyCount: 0,
  historyError: null as object | null,
  postCount: 0,
  postError: null as object | null,
  docCount: 0,
  docError: null as object | null,
  eventCount: 0,
  eventError: null as object | null,
  suggestionCount: 0,
  suggestionError: null as object | null,
  authToken: "Bearer valid-token",
  schoolId: "test-school-id",
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-id", email: "user@example.com" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

function buildSelectChain(getCount: () => number | null, getError: () => object | null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation(() =>
        Promise.resolve({ count: getCount(), error: getError(), data: [] })
      ),
    }),
  };
}

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "coaches") {
        return buildSelectChain(() => mockState.coachCount, () => mockState.coachError);
      }
      if (table === "interactions") {
        return buildSelectChain(
          () => mockState.interactionCount,
          () => mockState.interactionError
        );
      }
      if (table === "offers") {
        return buildSelectChain(() => mockState.offerCount, () => mockState.offerError);
      }
      if (table === "school_status_history") {
        return buildSelectChain(
          () => mockState.historyCount,
          () => mockState.historyError
        );
      }
      if (table === "social_media_posts") {
        return buildSelectChain(() => mockState.postCount, () => mockState.postError);
      }
      if (table === "documents") {
        return buildSelectChain(() => mockState.docCount, () => mockState.docError);
      }
      if (table === "events") {
        return buildSelectChain(() => mockState.eventCount, () => mockState.eventError);
      }
      if (table === "suggestion") {
        return buildSelectChain(
          () => mockState.suggestionCount,
          () => mockState.suggestionError
        );
      }
      return buildSelectChain(() => 0, () => null);
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => mockState.schoolId),
    getHeader: vi.fn(() => mockState.authToken),
    getCookie: vi.fn(() => undefined),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";

const mockEvent = { context: { params: { id: "test-school-id" } } } as any;

describe("GET /api/schools/[id]/deletion-blockers", () => {
  beforeEach(async () => {
    mockState.coachCount = 0;
    mockState.coachError = null;
    mockState.interactionCount = 0;
    mockState.interactionError = null;
    mockState.offerCount = 0;
    mockState.offerError = null;
    mockState.historyCount = 0;
    mockState.historyError = null;
    mockState.postCount = 0;
    mockState.postError = null;
    mockState.docCount = 0;
    mockState.docError = null;
    mockState.eventCount = 0;
    mockState.eventError = null;
    mockState.suggestionCount = 0;
    mockState.suggestionError = null;
    mockState.authToken = "Bearer valid-token";
    mockState.schoolId = "test-school-id";

    vi.mocked(requireAuth).mockResolvedValue({ id: "user-id", email: "user@example.com" });

    const h3 = await import("h3");
    vi.mocked(h3.getRouterParam).mockReturnValue("test-school-id");
    vi.mocked(h3.getHeader).mockReturnValue("Bearer valid-token");
    vi.mocked(h3.getCookie).mockReturnValue(undefined);
  });

  const getHandler = async () => {
    const { default: handler } = await import(
      "~/server/api/schools/[id]/deletion-blockers.get"
    );
    return handler;
  };

  describe("missing school ID", () => {
    it("throws 400 when school ID is missing", async () => {
      mockState.schoolId = "";
      const { getRouterParam } = await import("h3");
      vi.mocked(getRouterParam).mockReturnValue(undefined);

      const handler = await getHandler();
      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
        message: "School ID is required",
      });
    });
  });

  describe("no blockers", () => {
    it("returns canDelete:true and empty blockers when all counts are 0", async () => {
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.schoolId).toBe("test-school-id");
      expect(result.message).toBe("School can be deleted successfully.");
    });
  });

  describe("single blocker", () => {
    it("returns coaches blocker when coach count > 0", async () => {
      mockState.coachCount = 2;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toMatchObject({
        table: "coaches",
        count: 2,
        column: "school_id",
      });
      expect(result.message).toContain("2 coaches");
    });

    it("returns interactions blocker when interaction count > 0", async () => {
      mockState.interactionCount = 5;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers[0]).toMatchObject({
        table: "interactions",
        count: 5,
        column: "school_id",
      });
    });

    it("returns offers blocker when offer count > 0", async () => {
      mockState.offerCount = 1;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers[0]).toMatchObject({
        table: "offers",
        count: 1,
        column: "school_id",
      });
    });

    it("returns school_status_history blocker when history count > 0", async () => {
      mockState.historyCount = 3;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers[0]).toMatchObject({
        table: "school_status_history",
        count: 3,
        column: "school_id",
      });
    });

    it("returns social_media_posts blocker when post count > 0", async () => {
      mockState.postCount = 7;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers[0]).toMatchObject({
        table: "social_media_posts",
        count: 7,
        column: "school_id",
      });
    });

    it("returns documents blocker when document count > 0", async () => {
      mockState.docCount = 4;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers[0]).toMatchObject({
        table: "documents",
        count: 4,
        column: "school_id",
      });
    });

    it("returns events blocker when event count > 0", async () => {
      mockState.eventCount = 2;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers[0]).toMatchObject({
        table: "events",
        count: 2,
        column: "school_id",
      });
    });

    it("returns suggestion blocker when suggestion count > 0", async () => {
      mockState.suggestionCount = 1;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers[0]).toMatchObject({
        table: "suggestion",
        count: 1,
        column: "related_school_id",
      });
    });
  });

  describe("multiple blockers", () => {
    it("collects all blocking entities when multiple tables have records", async () => {
      mockState.coachCount = 1;
      mockState.interactionCount = 3;
      mockState.offerCount = 2;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(3);
      expect(result.blockers).toContainEqual(
        expect.objectContaining({ table: "coaches", count: 1 })
      );
      expect(result.blockers).toContainEqual(
        expect.objectContaining({ table: "interactions", count: 3 })
      );
      expect(result.blockers).toContainEqual(
        expect.objectContaining({ table: "offers", count: 2 })
      );
      expect(result.message).toContain("Cannot delete this school");
    });

    it("lists all 8 tables as blockers when all have records", async () => {
      mockState.coachCount = 1;
      mockState.interactionCount = 1;
      mockState.offerCount = 1;
      mockState.historyCount = 1;
      mockState.postCount = 1;
      mockState.docCount = 1;
      mockState.eventCount = 1;
      mockState.suggestionCount = 1;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(8);
    });
  });

  describe("auth failure", () => {
    it("re-throws H3Error from requireAuth without wrapping", async () => {
      const h3Error = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
      vi.mocked(requireAuth).mockRejectedValue(h3Error);

      const handler = await getHandler();
      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
        message: "Unauthorized",
      });
      expect(createServerSupabaseUserClient).not.toHaveBeenCalled();
    });

    it("re-throws 403 from requireAuth", async () => {
      const h3Error = Object.assign(new Error("Forbidden"), { statusCode: 403 });
      vi.mocked(requireAuth).mockRejectedValue(h3Error);

      const handler = await getHandler();
      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
        message: "Forbidden",
      });
    });
  });

  describe("missing token", () => {
    it("throws 401 when authorization header is absent and no cookie", async () => {
      mockState.authToken = "";
      const { getHeader } = await import("h3");
      vi.mocked(getHeader).mockReturnValue("");

      const handler = await getHandler();
      await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe("DB errors are logged but do not throw", () => {
    it("does not add a blocker when a query returns an error (warns and skips)", async () => {
      mockState.coachError = { message: "timeout" };
      mockState.interactionError = { message: "timeout" };
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toEqual([]);
    });
  });
});
