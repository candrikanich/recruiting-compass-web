import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createLogger, useLogger } from "~/server/utils/logger";

describe("server/utils/logger", () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("createLogger", () => {
    it("should create logger with context", () => {
      const logger = createLogger("auth");
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    describe("development mode", () => {
      beforeEach(() => {
        process.env.NODE_ENV = "development";
      });

      it("should log info messages in development", () => {
        const logger = createLogger("test");
        logger.info("Test message");

        expect(consoleLogSpy).toHaveBeenCalled();
        const call = consoleLogSpy.mock.calls[0][0];
        expect(call).toContain("[test]");
        expect(call).toContain("[INFO]");
      });

      it("should log info messages with data", () => {
        const logger = createLogger("test");
        const data = { userId: "123" };
        logger.info("User logged in", data);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining("[test]"),
          "User logged in",
          data,
        );
      });

      it("should log warn messages", () => {
        const logger = createLogger("test");
        logger.warn("Warning message");

        expect(consoleWarnSpy).toHaveBeenCalled();
        const call = consoleWarnSpy.mock.calls[0][0];
        expect(call).toContain("[test]");
        expect(call).toContain("[WARN]");
      });

      it("should log warn messages with data", () => {
        const logger = createLogger("test");
        const data = { code: "DEPRECATED" };
        logger.warn("Deprecated API", data);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("[test]"),
          "Deprecated API",
          data,
        );
      });

      it("should log error messages", () => {
        const logger = createLogger("test");
        const error = new Error("Something failed");
        logger.error("Error occurred", error);

        expect(consoleErrorSpy).toHaveBeenCalled();
        const call = consoleErrorSpy.mock.calls[0][0];
        expect(call).toContain("[test]");
        expect(call).toContain("[ERROR]");
      });

      it("should log error messages without data", () => {
        const logger = createLogger("test");
        logger.error("Error message");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[test]"),
          "Error message",
        );
      });

      it("should include timestamp in log output", () => {
        const logger = createLogger("test");
        logger.info("Test");

        const call = consoleLogSpy.mock.calls[0][0];
        expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T/); // ISO date format
      });

      it("should include context in prefix", () => {
        const logger = createLogger("auth-service");
        logger.info("Test");

        const call = consoleLogSpy.mock.calls[0][0];
        expect(call).toContain("[auth-service]");
      });

      it("should handle multiple loggers with different contexts", () => {
        const authLogger = createLogger("auth");
        const dbLogger = createLogger("database");

        authLogger.info("Auth message");
        dbLogger.warn("DB warning");

        expect(consoleLogSpy).toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalled();

        const authCall = consoleLogSpy.mock.calls[0][0];
        const dbCall = consoleWarnSpy.mock.calls[0][0];

        expect(authCall).toContain("[auth]");
        expect(dbCall).toContain("[database]");
      });
    });

    describe("production mode", () => {
      beforeEach(() => {
        process.env.NODE_ENV = "production";
      });

      it("should not log info messages in production", () => {
        const logger = createLogger("test");
        logger.info("Test message");

        expect(consoleLogSpy).not.toHaveBeenCalled();
      });

      it("should not log warn messages in production", () => {
        const logger = createLogger("test");
        logger.warn("Test warning");

        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it("should not log error messages in production", () => {
        const logger = createLogger("test");
        logger.error("Test error");

        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it("should log in production when LOG_LEVEL is set", () => {
        process.env.LOG_LEVEL = "error";
        const logger = createLogger("test");
        logger.error("Production error");

        // In production with LOG_LEVEL set, outputs structured JSON via console.log
        expect(consoleLogSpy).toHaveBeenCalled();
        const jsonStr = consoleLogSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(jsonStr);
        expect(parsed.level).toBe("ERROR");
        expect(parsed.message).toBe("Production error");
        expect(parsed.context).toBe("test");
        expect(parsed.timestamp).toBeDefined();

        delete process.env.LOG_LEVEL;
      });

      it("should suppress logs below configured LOG_LEVEL in production", () => {
        process.env.LOG_LEVEL = "error";
        const logger = createLogger("test");
        logger.warn("This should be suppressed");

        // warn is below error threshold — should not appear
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();

        delete process.env.LOG_LEVEL;
      });
    });

    describe("no NODE_ENV (defaults to development)", () => {
      beforeEach(() => {
        delete process.env.NODE_ENV;
      });

      it("should log when NODE_ENV is undefined", () => {
        const logger = createLogger("test");
        logger.info("Test");

        expect(consoleLogSpy).toHaveBeenCalled();
      });
    });

    describe("message formatting", () => {
      beforeEach(() => {
        process.env.NODE_ENV = "development";
      });

      it("should format log level in uppercase", () => {
        const logger = createLogger("test");
        logger.info("Message");

        const call = consoleLogSpy.mock.calls[0][0];
        expect(call).toContain("[INFO]");

        consoleLogSpy.mockClear();
        logger.warn("Message");

        const warnCall = consoleWarnSpy.mock.calls[0][0];
        expect(warnCall).toContain("[WARN]");

        consoleWarnSpy.mockClear();
        logger.error("Message");

        const errorCall = consoleErrorSpy.mock.calls[0][0];
        expect(errorCall).toContain("[ERROR]");
      });

      it("should handle empty context", () => {
        const logger = createLogger("");
        logger.info("Test");

        expect(consoleLogSpy).toHaveBeenCalled();
      });

      it("should handle special characters in context", () => {
        const logger = createLogger("auth:oauth2");
        logger.info("Test");

        const call = consoleLogSpy.mock.calls[0][0];
        expect(call).toContain("[auth:oauth2]");
      });
    });
  });

  describe("useLogger", () => {
    it("should create a logger with event context", () => {
      const mockEvent = {
        context: { requestId: "test-req-id-12345678", user: { id: "user-abc" } },
        path: "/api/test",
        method: "GET",
      } as any;

      const logger = useLogger(mockEvent, "test-context");
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    describe("in development mode", () => {
      beforeEach(() => {
        process.env.NODE_ENV = "development";
      });

      it("should include correlation ID prefix in dev logs", () => {
        const mockEvent = {
          context: { requestId: "test-req-id-12345678" },
          path: "/api/test",
          method: "GET",
        } as any;

        const logger = useLogger(mockEvent, "test");
        logger.info("Test with correlation");

        expect(consoleLogSpy).toHaveBeenCalled();
        const call = consoleLogSpy.mock.calls[0][0];
        // requestId is sliced to 8 chars in dev mode: "test-req"
        expect(call).toContain("[req:");
      });

      it("should not include request prefix when no requestId in context", () => {
        const mockEvent = {
          context: {},
          path: "/api/test",
          method: "GET",
        } as any;

        const logger = useLogger(mockEvent);
        logger.info("Test without correlation");

        const call = consoleLogSpy.mock.calls[0][0];
        expect(call).not.toContain("[req:");
      });

      it("should use default context 'api' when no context provided", () => {
        const mockEvent = {
          context: {},
          path: "/api/test",
          method: "GET",
        } as any;

        const logger = useLogger(mockEvent);
        logger.info("Test");

        const call = consoleLogSpy.mock.calls[0][0];
        expect(call).toContain("[api]");
      });
    });
  });

  describe("sanitization in production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
      process.env.LOG_LEVEL = "info";
    });

    afterEach(() => {
      delete process.env.LOG_LEVEL;
    });

    it("should redact password fields in logged data", () => {
      const logger = createLogger("test");
      logger.info("User login", { email: "user@example.com", password: "secret123" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(parsed.data.password).toBe("[REDACTED]");
      expect(parsed.data.email).toBe("user@example.com");
    });

    it("should redact access_token fields", () => {
      const logger = createLogger("test");
      logger.info("Token event", { access_token: "bearer-xyz", userId: "123" });

      const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(parsed.data.access_token).toBe("[REDACTED]");
      expect(parsed.data.userId).toBe("123");
    });

    it("should serialize Error objects safely (no stack in production)", () => {
      const logger = createLogger("test");
      logger.error("Operation failed", new Error("DB connection refused"));

      const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(parsed.data.name).toBe("Error");
      expect(parsed.data.message).toBe("DB connection refused");
      expect(parsed.data.stack).toBeUndefined(); // stack hidden in production
    });

    it("should recursively sanitize nested objects", () => {
      const logger = createLogger("test");
      logger.info("Nested data", { user: { id: "123", token: "secret-token" } });

      const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(parsed.data.user.token).toBe("[REDACTED]");
      expect(parsed.data.user.id).toBe("123");
    });
  });
});
