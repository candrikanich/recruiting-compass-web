import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  parentExists: true,
  parentError: null as object | null,
  authToken: "Bearer valid-token",
};

const INTERACTION_ID = "33333333-3333-3333-3333-333333333333";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-id",
    email: "user@example.com",
  })),
}));

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => INTERACTION_ID),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({ from: mockFrom })),
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

const mockEvent = { context: { params: { id: INTERACTION_ID } } } as any;

const getHandler = async () => {
  const { default: handler } =
    await import("~/server/api/interactions/[id]/deletion-blockers.get");
  return handler;
};

describe("GET /api/interactions/[id]/deletion-blockers", () => {
  beforeEach(async () => {
    mockState.parentExists = true;
    mockState.parentError = null;
    mockState.authToken = "Bearer valid-token";
    vi.clearAllMocks();

    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
    });
    vi.mocked(requireUuidParam).mockReturnValue(INTERACTION_ID);
    mockMaybeSingle.mockImplementation(async () => ({
      data: mockState.parentExists ? { id: INTERACTION_ID } : null,
      error: mockState.parentError,
    }));

    const h3 = await import("h3");
    vi.mocked(h3.getHeader).mockReturnValue("Bearer valid-token");
    vi.mocked(h3.getCookie).mockReturnValue(undefined);
  });

  // ── Parent existence / ownership (regression: was 200 for any id) ──────────

  describe("nonexistent or non-owned interaction", () => {
    it("throws 404 when the interaction row is not visible to the caller", async () => {
      mockState.parentExists = false;
      const handler = await getHandler();

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 404,
        message: "Interaction not found",
      });
    });

    it("throws 500 when the existence probe errors", async () => {
      mockState.parentError = { message: "db down" };
      const handler = await getHandler();

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it("verifies existence against the interactions table by id", async () => {
      const handler = await getHandler();
      await handler(mockEvent);

      expect(mockFrom).toHaveBeenCalledWith("interactions");
      expect(mockSelect).toHaveBeenCalledWith("id");
      expect(mockEq).toHaveBeenCalledWith("id", INTERACTION_ID);
    });
  });

  describe("happy path — no blockers", () => {
    it("returns canDelete:true and empty blockers when the interaction exists", async () => {
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.interactionId).toBe(INTERACTION_ID);
      expect(result.message).toBe("Interaction can be deleted successfully.");
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

    it("re-throws 403 Forbidden from requireAuth", async () => {
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

  describe("response shape", () => {
    it("always returns interactionId, canDelete, blockers, and message fields", async () => {
      const handler = await getHandler();
      const result = await handler(mockEvent);

      expect(result).toHaveProperty("interactionId");
      expect(result).toHaveProperty("canDelete");
      expect(result).toHaveProperty("blockers");
      expect(result).toHaveProperty("message");
      expect(Array.isArray(result.blockers)).toBe(true);
    });
  });
});
