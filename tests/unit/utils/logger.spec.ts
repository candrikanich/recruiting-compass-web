import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClientLogger } from "~/utils/logger";

describe("createClientLogger", () => {
  let consoleSpy: { log: any; warn: any; error: any };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (import.meta as any).env.VITE_LOG_LEVEL;
  });

  it("returns an object with debug/info/warn/error methods", () => {
    const logger = createClientLogger("test");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("includes context and level in log output", () => {
    const logger = createClientLogger("my-composable");
    logger.info("something happened");
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining("[my-composable]"),
      "something happened",
    );
  });

  it("logs data when provided", () => {
    const logger = createClientLogger("test");
    logger.error("fetch failed", { code: 42 });
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.any(String),
      "fetch failed",
      expect.objectContaining({ code: 42 }),
    );
  });

  it("redacts sensitive fields from data", () => {
    const logger = createClientLogger("test");
    logger.info("user loaded", { id: "1", password: "secret", token: "abc" });
    const call = consoleSpy.log.mock.calls[0];
    const data = call[2];
    expect(data.password).toBe("[REDACTED]");
    expect(data.token).toBe("[REDACTED]");
    expect(data.id).toBe("1");
  });

  it("uses console.warn for warn level", () => {
    const logger = createClientLogger("test");
    logger.warn("low disk");
    expect(consoleSpy.warn).toHaveBeenCalled();
  });

  it("uses console.error for error level", () => {
    const logger = createClientLogger("test");
    logger.error("boom");
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it("extracts safe properties from Error objects", () => {
    const logger = createClientLogger("test");
    const err = new Error("oops");
    logger.error("caught", err);
    const call = consoleSpy.error.mock.calls[0];
    const data = call[2];
    expect(data).toEqual(expect.objectContaining({ message: "oops" }));
    expect(data.stack).toBeUndefined(); // no stack in production-like env
  });
});
