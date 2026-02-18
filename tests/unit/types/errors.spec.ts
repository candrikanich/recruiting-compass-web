import { describe, it, expect } from "vitest";
import { AppError, isAppError, toAppError } from "~/types/errors";

describe("AppError", () => {
  it("creates an error with statusCode, type, and message", () => {
    const err = new AppError(404, "notfound", "School not found");
    expect(err.statusCode).toBe(404);
    expect(err.type).toBe("notfound");
    expect(err.message).toBe("School not found");
    expect(err.name).toBe("AppError");
    expect(err instanceof Error).toBe(true);
  });

  it("accepts optional context object", () => {
    const err = new AppError(400, "validation", "Invalid input", { field: "email" });
    expect(err.context).toEqual({ field: "email" });
  });

  it("has undefined context when not provided", () => {
    const err = new AppError(500, "server", "Internal error");
    expect(err.context).toBeUndefined();
  });
});

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    const err = new AppError(400, "validation", "Bad input");
    expect(isAppError(err)).toBe(true);
  });

  it("returns false for regular Error instances", () => {
    const err = new Error("oops");
    expect(isAppError(err)).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isAppError("string")).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(42)).toBe(false);
  });
});

describe("toAppError", () => {
  it("returns AppError as-is when already AppError", () => {
    const original = new AppError(404, "notfound", "Not found");
    const result = toAppError(original);
    expect(result).toBe(original);
  });

  it("wraps regular Error in AppError(500, 'server')", () => {
    const err = new Error("something broke");
    const result = toAppError(err);
    expect(result.statusCode).toBe(500);
    expect(result.type).toBe("server");
    expect(result.message).toBe("something broke");
  });

  it("wraps unknown values in AppError with stringified message", () => {
    const result = toAppError("raw string error");
    expect(result.statusCode).toBe(500);
    expect(result.type).toBe("server");
    expect(result.message).toBe("raw string error");
  });
});
