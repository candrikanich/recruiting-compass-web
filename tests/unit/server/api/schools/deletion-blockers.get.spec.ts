import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable state — read at call time by mock factories
const mockState = {
  parentExists: true,
  parentError: null as object | null,
  coachCount: 0,
  coachError: null as object | null,
  interactionCount: 0,
  interactionError: null as object | null,
  offerCount: 0,
  offerError: null as object | null,
  historyCount: 0,
  historyError: null as object | null,
  docCount: 0,
  docError: null as object | null,
  eventCount: 0,
  eventError: null as object | null,
  suggestionCount: 0,
  suggestionError: null as object | null,
  authToken: "Bearer valid-token",
};

const SCHOOL_ID = "11111111-1111-1111-1111-111111111111";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-id",
    email: "user@example.com",
  })),
}));

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => SCHOOL_ID),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Existence probe: from(parent).select("id").eq("id", id).maybeSingle()
function buildExistenceChain() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockState.parentExists ? { id: SCHOOL_ID } : null,
          error: mockState.parentError,
        }),
      }),
    }),
  };
}

// Count query: from(child).select("*", {count,head}).eq(col, id)  (awaited)
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
      if (table === "schools") return buildExistenceChain();
      if (table === "coaches")
        return buildSelectChain(
          () => mockState.coachCount,
          () => mockState.coachError,
        );
      if (table === "interactions")
        return buildSelectChain(
          () => mockState.interactionCount,
          () => mockState.interactionError,
        );
      if (table === "offers")
        return buildSelectChain(
          () => mockState.offerCount,
          () => mockState.offerError,
        );
      if (table === "school_status_history")
        return buildSelectChain(
          () => mockState.historyCount,
          () => mockState.historyError,
        );
      if (table === "documents")
        return buildSelectChain(
          () => mockState.docCount,
          () => mockState.docError,
        );
      if (table === "events")
        return buildSelectChain(
          () => mockState.eventCount,
          () => mockState.eventError,
        );
      if (table === "suggestion")
        return buildSelectChain(
          () => mockState.suggestionCount,
          () => mockState.suggestionError,
        );
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

const mockEvent = { context: { params: { id: SCHOOL_ID } } } as any;

const getHandler = async () => {
  const { default: handler } =
    await import("~/server/api/schools/[id]/deletion-blockers.get");
  return handler;
};

describe("GET /api/schools/[id]/deletion-blockers", () => {
  beforeEach(async () => {
    mockState.parentExists = true;
    mockState.parentError = null;
    mockState.coachCount = 0;
    mockState.coachError = null;
    mockState.interactionCount = 0;
    mockState.interactionError = null;
    mockState.offerCount = 0;
    mockState.offerError = null;
    mockState.historyCount = 0;
    mockState.historyError = null;
    mockState.docCount = 0;
    mockState.docError = null;
    mockState.eventCount = 0;
    mockState.eventError = null;
    mockState.suggestionCount = 0;
    mockState.suggestionError = null;
    mockState.authToken = "Bearer valid-token";

    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
    });
    vi.mocked(requireUuidParam).mockReturnValue(SCHOOL_ID);

    const h3 = await import("h3");
    vi.mocked(h3.getHeader).mockReturnValue("Bearer valid-token");
    vi.mocked(h3.getCookie).mockReturnValue(undefined);
  });

  // ── Parent existence / ownership (regression: was 200 for any id) ──────────

  describe("nonexistent or non-owned school", () => {
    it("throws 404 when the school row is not visible to the caller", async () => {
      mockState.parentExists = false;
      const handler = await getHandler();

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 404,
        message: "School not found",
      });
    });

    it("throws 500 when the existence probe errors", async () => {
      mockState.parentError = { message: "db down" };
      const handler = await getHandler();

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe("invalid id", () => {
    it("propagates the 400 thrown by requireUuidParam", async () => {
      vi.mocked(requireUuidParam).mockImplementation(() => {
        const err = new Error("Invalid id: must be a valid UUID") as Error & {
          statusCode: number;
        };
        err.statusCode = 400;
        throw err;
      });
      const handler = await getHandler();

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe("no blockers", () => {
    it("returns canDelete:true and empty blockers when all counts are 0", async () => {
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.schoolId).toBe(SCHOOL_ID);
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
        expect.objectContaining({ table: "coaches", count: 1 }),
      );
      expect(result.blockers).toContainEqual(
        expect.objectContaining({ table: "interactions", count: 3 }),
      );
      expect(result.blockers).toContainEqual(
        expect.objectContaining({ table: "offers", count: 2 }),
      );
      expect(result.message).toContain("Cannot delete this school");
    });

    it("lists all 7 tables as blockers when all have records", async () => {
      mockState.coachCount = 1;
      mockState.interactionCount = 1;
      mockState.offerCount = 1;
      mockState.historyCount = 1;
      mockState.docCount = 1;
      mockState.eventCount = 1;
      mockState.suggestionCount = 1;
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(7);
    });
  });

  describe("auth failure", () => {
    it("re-throws H3Error from requireAuth without wrapping", async () => {
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

    it("re-throws 403 from requireAuth", async () => {
      const h3Error = Object.assign(new Error("Forbidden"), {
        statusCode: 403,
      });
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
      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  describe("DB errors are logged but do not throw", () => {
    it("does not add a blocker when a count query returns an error (warns and skips)", async () => {
      mockState.coachError = { message: "timeout" };
      mockState.interactionError = { message: "timeout" };
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toEqual([]);
    });
  });
});
