import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
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
    getRouterParam: vi.fn().mockReturnValue("test-interaction-id"),
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

const mockEvent = { context: { params: { id: "test-interaction-id" } } } as any;

describe("GET /api/interactions/[id]/deletion-blockers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("happy path — no blockers", () => {
    it("returns canDelete:true and empty blockers array when no FK references exist", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: "user-id",
        email: "user@example.com",
      });

      const { getRouterParam } = await import("h3");
      vi.mocked(getRouterParam).mockReturnValue("test-interaction-id");

      const { default: handler } =
        await import("~/server/api/interactions/[id]/deletion-blockers.get");

      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.interactionId).toBe("test-interaction-id");
      expect(result.message).toBe("Interaction can be deleted successfully.");
    });
  });

  describe("missing ID", () => {
    it("throws 400 when interaction ID is missing from router params", async () => {
      const { getRouterParam } = await import("h3");
      vi.mocked(getRouterParam).mockReturnValue(undefined);

      const { default: handler } =
        await import("~/server/api/interactions/[id]/deletion-blockers.get");

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
        message: "Interaction ID is required",
      });
    });
  });

  describe("auth failure", () => {
    it("re-throws H3Error from requireAuth without wrapping", async () => {
      const { getRouterParam } = await import("h3");
      vi.mocked(getRouterParam).mockReturnValue("test-interaction-id");

      const h3Error = Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      });
      vi.mocked(requireAuth).mockRejectedValue(h3Error);

      const { default: handler } =
        await import("~/server/api/interactions/[id]/deletion-blockers.get");

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
        message: "Unauthorized",
      });
    });

    it("re-throws 403 Forbidden from requireAuth", async () => {
      const { getRouterParam } = await import("h3");
      vi.mocked(getRouterParam).mockReturnValue("test-interaction-id");

      const h3Error = Object.assign(new Error("Forbidden"), {
        statusCode: 403,
      });
      vi.mocked(requireAuth).mockRejectedValue(h3Error);

      const { default: handler } =
        await import("~/server/api/interactions/[id]/deletion-blockers.get");

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
        message: "Forbidden",
      });
    });
  });

  describe("response shape", () => {
    it("always returns interactionId, canDelete, blockers, and message fields", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: "user-id",
        email: "user@example.com",
      });

      const { getRouterParam } = await import("h3");
      vi.mocked(getRouterParam).mockReturnValue("abc-123");

      const { default: handler } =
        await import("~/server/api/interactions/[id]/deletion-blockers.get");

      const mockEventWithId = { context: { params: { id: "abc-123" } } } as any;
      const result = await handler(mockEventWithId);

      expect(result).toHaveProperty("interactionId");
      expect(result).toHaveProperty("canDelete");
      expect(result).toHaveProperty("blockers");
      expect(result).toHaveProperty("message");
      expect(Array.isArray(result.blockers)).toBe(true);
    });
  });
});
