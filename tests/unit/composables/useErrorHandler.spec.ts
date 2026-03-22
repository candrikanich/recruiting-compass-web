import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { error: vi.fn() },
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => mockLogger,
}));

import { useErrorHandler } from "~/composables/useErrorHandler";

describe("composables/useErrorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getErrorMessage", () => {
    it("returns err.message when err is an Error instance", () => {
      const { getErrorMessage } = useErrorHandler();
      expect(getErrorMessage(new Error("oops"))).toBe("oops");
    });

    it("returns the string directly when err is a string", () => {
      const { getErrorMessage } = useErrorHandler();
      expect(getErrorMessage("string error")).toBe("string error");
    });

    it("returns err.message when err is a plain object with a string message", () => {
      const { getErrorMessage } = useErrorHandler();
      expect(getErrorMessage({ message: "obj msg" })).toBe("obj msg");
    });

    it("returns err.statusMessage when object has no message but has statusMessage", () => {
      const { getErrorMessage } = useErrorHandler();
      expect(getErrorMessage({ statusMessage: "status msg" })).toBe(
        "status msg",
      );
    });

    it("returns fallback message when object has neither message nor statusMessage", () => {
      const { getErrorMessage } = useErrorHandler();
      const result = getErrorMessage({ code: 500 });
      expect(result).toContain("unexpected error");
    });

    it("returns fallback when object.message is non-string", () => {
      const { getErrorMessage } = useErrorHandler();
      const result = getErrorMessage({ message: 123 });
      expect(result).toContain("unexpected error");
    });

    it("includes ctx.context in fallback when context is provided", () => {
      const { getErrorMessage } = useErrorHandler();
      const result = getErrorMessage(null, { context: "MyComponent" });
      expect(result).toContain("MyComponent");
    });

    it("returns generic fallback for null", () => {
      const { getErrorMessage } = useErrorHandler();
      const result = getErrorMessage(null);
      expect(result).toContain("unexpected error");
    });
  });

  describe("logError", () => {
    it("calls logger.error with the extracted message", () => {
      const { logError } = useErrorHandler();
      logError(new Error("boom"));
      expect(mockLogger.error).toHaveBeenCalledWith("boom", undefined);
    });

    it("passes ctx.details to logger.error as second argument", () => {
      const { logError } = useErrorHandler();
      const details = { userId: "abc" };
      logError(new Error("fail"), { details });
      expect(mockLogger.error).toHaveBeenCalledWith("fail", details);
    });

    it("logs fallback message for unknown error types", () => {
      const { logError } = useErrorHandler();
      logError(42);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("unexpected error"),
        undefined,
      );
    });
  });
});
