import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getErrorMessage,
  handleError,
  asyncErrorHandler,
  validateResponse,
  formatUserError,
  safeJsonParse,
} from "~/utils/errorHandling";

describe("errorHandling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getErrorMessage", () => {
    it("should extract message from string error", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    it("should extract message from Error object", () => {
      const error = new Error("Error message");
      expect(getErrorMessage(error)).toBe("Error message");
    });

    it("should handle Error without message", () => {
      const error = new Error();
      expect(getErrorMessage(error, "fallback")).toBe("fallback");
    });

    it("should extract message from object.message", () => {
      expect(getErrorMessage({ message: "Object message" })).toBe(
        "Object message",
      );
    });

    it("should extract message from object.error.message", () => {
      expect(
        getErrorMessage({
          error: { message: "Nested error message" },
        }),
      ).toBe("Nested error message");
    });

    it("should extract message from object.data.message", () => {
      expect(
        getErrorMessage({
          data: { message: "Data error message" },
        }),
      ).toBe("Data error message");
    });

    it("should return default message for unknown error", () => {
      expect(getErrorMessage(null)).toBe("An error occurred");
      expect(getErrorMessage(undefined, "custom")).toBe("custom");
      expect(getErrorMessage(123)).toBe("An error occurred");
    });
  });

  describe("handleError", () => {
    it("should create AppError with message", () => {
      const error = handleError("Test error");
      expect(error.message).toBe("Test error");
    });

    it("should extract statusCode from error object", () => {
      const error = handleError({
        message: "Error",
        statusCode: 404,
      });
      expect(error.statusCode).toBe(404);
    });

    it("should extract status code from status property", () => {
      const error = handleError({
        message: "Error",
        status: 500,
      });
      expect(error.statusCode).toBe(500);
    });

    it("should extract code from error object", () => {
      const error = handleError({
        message: "Error",
        code: "CUSTOM_ERROR",
      });
      expect(error.code).toBe("CUSTOM_ERROR");
    });

    it("should attach context to error from object", () => {
      const context = { userId: "123" };
      const error = handleError({ message: "Error" }, context);
      expect(error.context).toEqual(context);
    });

    it("should log error to console", () => {
      const consoleSpy = vi.spyOn(console, "error");
      handleError("Test error");
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("asyncErrorHandler", () => {
    it("should return result on success", async () => {
      const fn = async () => "success";
      const wrapped = asyncErrorHandler(fn);
      const result = await wrapped();
      expect(result).toBe("success");
    });

    it("should return null on error", async () => {
      const fn = async () => {
        throw new Error("Failed");
      };
      const wrapped = asyncErrorHandler(fn);
      const result = await wrapped();
      expect(result).toBeNull();
    });

    it("should call onError callback on error", async () => {
      const onError = vi.fn();
      const fn = async () => {
        throw new Error("Failed");
      };
      const wrapped = asyncErrorHandler(fn, onError);
      await wrapped();
      expect(onError).toHaveBeenCalled();
    });

    it("should not call onError if no error", async () => {
      const onError = vi.fn();
      const fn = async () => "success";
      const wrapped = asyncErrorHandler(fn, onError);
      await wrapped();
      expect(onError).not.toHaveBeenCalled();
    });

    it("should pass arguments to wrapped function", async () => {
      const fn = vi.fn(async (a: number, b: number) => a + b);
      const wrapped = asyncErrorHandler(fn);
      await wrapped(2, 3);
      expect(fn).toHaveBeenCalledWith(2, 3);
    });
  });

  describe("validateResponse", () => {
    it("should return true when all required fields exist", () => {
      const data = { id: 1, name: "John", email: "john@example.com" };
      expect(validateResponse(data, ["id", "name", "email"])).toBe(true);
    });

    it("should return false when field is undefined", () => {
      const data = { id: 1, name: "John" };
      expect(validateResponse(data, ["id", "name", "email"])).toBe(false);
    });

    it("should return false when field is null", () => {
      const data = { id: 1, name: null };
      expect(validateResponse(data, ["id", "name"])).toBe(false);
    });

    it("should return true for empty required fields", () => {
      expect(validateResponse({ id: 1 }, [])).toBe(true);
    });

    it("should return false for null data", () => {
      expect(validateResponse(null, ["id"])).toBe(false);
    });

    it("should return false for undefined data", () => {
      expect(validateResponse(undefined, ["id"])).toBe(false);
    });

    it("should return false for non-object data", () => {
      expect(validateResponse("string", ["id"])).toBe(false);
    });
  });

  describe("formatUserError", () => {
    it("should return original message if user-friendly", () => {
      expect(formatUserError("Invalid email format")).toBe(
        "Invalid email format",
      );
    });

    it("should format API errors", () => {
      expect(formatUserError("API Error: Request failed")).toContain(
        "Connection error",
      );
    });

    it("should format network errors", () => {
      expect(formatUserError("API network error")).toContain(
        "Connection error",
      );
    });

    it("should format 401 errors", () => {
      expect(formatUserError("401 Unauthorized")).toContain("session");
    });

    it("should format 403 errors", () => {
      expect(formatUserError("403 Forbidden")).toContain("permission");
    });

    it("should format 404 errors", () => {
      expect(formatUserError("404 not found")).toContain("not found");
    });

    it("should format 500 errors", () => {
      expect(formatUserError("500 Internal Server Error")).toContain(
        "Server error",
      );
    });

    it("should return fallback for undefined/null messages", () => {
      expect(formatUserError("undefined is not defined")).toContain(
        "went wrong",
      );
      expect(formatUserError("null reference")).toContain("went wrong");
    });

    it("should use custom fallback message", () => {
      const fallback = "Custom fallback";
      expect(formatUserError("null error", fallback)).toBe(fallback);
    });
  });

  describe("safeJsonParse", () => {
    it("should parse valid JSON", () => {
      expect(safeJsonParse('{"key":"value"}')).toEqual({ key: "value" });
      expect(safeJsonParse("[1,2,3]")).toEqual([1, 2, 3]);
    });

    it("should return fallback for invalid JSON", () => {
      expect(safeJsonParse("invalid json")).toBeNull();
    });

    it("should use custom fallback", () => {
      const fallback = { default: true };
      expect(safeJsonParse("invalid", fallback)).toEqual(fallback);
    });

    it("should parse JSON strings", () => {
      expect(safeJsonParse('"hello"')).toBe("hello");
    });

    it("should parse JSON numbers", () => {
      expect(safeJsonParse("42")).toBe(42);
    });

    it("should parse JSON booleans", () => {
      expect(safeJsonParse("true")).toBe(true);
      expect(safeJsonParse("false")).toBe(false);
    });

    it("should parse JSON null", () => {
      expect(safeJsonParse("null")).toBeNull();
    });
  });
});
