import { describe, it, expect, vi } from "vitest";
import type { H3Event } from "h3";
import {
  generateCsrfToken,
  setCsrfToken,
  validateCsrfToken,
  requireCsrfToken,
} from "~/server/utils/csrf";

function makeEvent(headers: Record<string, string | undefined> = {}, cookies: Record<string, string | undefined> = {}) {
  return {
    node: { req: {}, res: {} },
    __headers: headers,
    __cookies: cookies,
  } as unknown as H3Event;
}

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getHeader: (event: any, name: string) => event.__headers?.[name],
    getCookie: (event: any, name: string) => event.__cookies?.[name],
    setCookie: vi.fn(),
  };
});

describe("server/utils/csrf", () => {
  describe("generateCsrfToken", () => {
    it("returns a 64-char hex string (32 bytes)", () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("returns a different token on each call", () => {
      expect(generateCsrfToken()).not.toBe(generateCsrfToken());
    });
  });

  describe("setCsrfToken", () => {
    it("uses the provided token when given", () => {
      const event = makeEvent();
      const token = setCsrfToken(event, "provided-token");
      expect(token).toBe("provided-token");
    });

    it("generates a token when none is provided", () => {
      const event = makeEvent();
      const token = setCsrfToken(event);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("validateCsrfToken", () => {
    it("returns true when header and cookie tokens match", () => {
      const event = makeEvent(
        { "x-csrf-token": "match-me" },
        { "csrf-token": "match-me" },
      );
      expect(validateCsrfToken(event)).toBe(true);
    });

    it("returns false when header and cookie tokens differ", () => {
      const event = makeEvent(
        { "x-csrf-token": "aaaa" },
        { "csrf-token": "bbbb" },
      );
      expect(validateCsrfToken(event)).toBe(false);
    });

    it("returns false when header token is missing", () => {
      const event = makeEvent({}, { "csrf-token": "bbbb" });
      expect(validateCsrfToken(event)).toBe(false);
    });

    it("returns false when cookie token is missing", () => {
      const event = makeEvent({ "x-csrf-token": "aaaa" }, {});
      expect(validateCsrfToken(event)).toBe(false);
    });

    it("returns false (not throw) when tokens have different lengths", () => {
      const event = makeEvent(
        { "x-csrf-token": "short" },
        { "csrf-token": "a-much-longer-token-value" },
      );
      expect(validateCsrfToken(event)).toBe(false);
    });
  });

  describe("requireCsrfToken", () => {
    it("does not throw when tokens match", () => {
      const event = makeEvent(
        { "x-csrf-token": "match-me" },
        { "csrf-token": "match-me" },
      );
      expect(() => requireCsrfToken(event)).not.toThrow();
    });

    it("throws a 403 when tokens do not match", () => {
      const event = makeEvent(
        { "x-csrf-token": "aaaa" },
        { "csrf-token": "bbbb" },
      );
      expect(() => requireCsrfToken(event)).toThrow(
        expect.objectContaining({ statusCode: 403 }),
      );
    });
  });
});
