import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";
import { z } from "zod";

// readBody and getQuery are Nitro auto-imports (globals) in server context.
// Stub them as globals so validation.ts can call them without importing.
const mockReadBody = vi.fn();
const mockGetQuery = vi.fn();
vi.stubGlobal("readBody", mockReadBody);
vi.stubGlobal("getQuery", mockGetQuery);

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getRouterParam: vi.fn(),
    createError: vi.fn((opts) =>
      Object.assign(new Error(opts.statusMessage), opts),
    ),
  };
});

import { getRouterParam, createError } from "h3";
import {
  requireUuidParam,
  validateBody,
  validateQuery,
  validateParams,
} from "~/server/utils/validation";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const nameSchema = z.object({ name: z.string() });
const mockEvent = {} as H3Event;

describe("server/utils/validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireUuidParam", () => {
    it("returns the UUID when router param is valid", () => {
      vi.mocked(getRouterParam).mockReturnValue(VALID_UUID);
      const result = requireUuidParam(mockEvent, "id");
      expect(result).toBe(VALID_UUID);
    });

    it("throws 400 when router param is undefined", () => {
      vi.mocked(getRouterParam).mockReturnValue(undefined);
      expect(() => requireUuidParam(mockEvent, "id")).toThrow();
      expect(vi.mocked(createError)).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 }),
      );
    });

    it("throws 400 when router param is not a valid UUID", () => {
      vi.mocked(getRouterParam).mockReturnValue("not-a-uuid");
      expect(() => requireUuidParam(mockEvent, "schoolId")).toThrow();
      expect(vi.mocked(createError)).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: "Invalid schoolId: must be a valid UUID",
        }),
      );
    });
  });

  describe("validateBody", () => {
    it("returns parsed data when body matches schema", async () => {
      mockReadBody.mockResolvedValue({ name: "Test School" });
      const result = await validateBody(mockEvent, nameSchema);
      expect(result).toEqual({ name: "Test School" });
    });

    it("throws 400 with ZodError details when body is invalid", async () => {
      mockReadBody.mockResolvedValue({ name: 123 });
      await expect(validateBody(mockEvent, nameSchema)).rejects.toThrow();
      expect(vi.mocked(createError)).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: "Validation failed",
        }),
      );
    });

    it("throws 400 with 'Invalid request body' when readBody throws non-Zod error", async () => {
      mockReadBody.mockRejectedValue(new Error("parse failed"));
      await expect(validateBody(mockEvent, nameSchema)).rejects.toThrow();
      expect(vi.mocked(createError)).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: "Invalid request body",
        }),
      );
    });
  });

  describe("validateQuery", () => {
    it("returns parsed data when query params match schema", () => {
      mockGetQuery.mockReturnValue({ name: "Coach Bob" });
      const result = validateQuery(mockEvent, nameSchema);
      expect(result).toEqual({ name: "Coach Bob" });
    });

    it("throws 400 with ZodError details when query params are invalid", () => {
      mockGetQuery.mockReturnValue({ name: 99 });
      expect(() => validateQuery(mockEvent, nameSchema)).toThrow();
      expect(vi.mocked(createError)).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: "Invalid query parameters",
        }),
      );
    });

    it("throws 400 when getQuery throws a non-ZodError", () => {
      mockGetQuery.mockImplementation(() => {
        throw new Error("query parse error");
      });
      expect(() => validateQuery(mockEvent, nameSchema)).toThrow();
      expect(vi.mocked(createError)).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: "Invalid query parameters",
        }),
      );
    });
  });

  describe("validateParams", () => {
    it("returns parsed data when context params match schema", () => {
      const event = { context: { params: { name: "My School" } } } as any;
      const result = validateParams(event, nameSchema);
      expect(result).toEqual({ name: "My School" });
    });

    it("throws 400 with ZodError details when params are invalid", () => {
      const event = { context: { params: { name: 42 } } } as any;
      expect(() => validateParams(event, nameSchema)).toThrow();
      expect(vi.mocked(createError)).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: "Invalid URL parameters",
        }),
      );
    });

    it("uses empty object fallback when context.params is undefined", () => {
      const event = { context: {} } as any;
      expect(() => validateParams(event, nameSchema)).toThrow();
      expect(vi.mocked(createError)).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 }),
      );
    });
  });
});
