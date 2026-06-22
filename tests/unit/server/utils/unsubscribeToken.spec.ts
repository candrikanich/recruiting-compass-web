import { describe, it, expect } from "vitest";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  normalizeEmail,
} from "~/server/utils/unsubscribeToken";

const SECRET = "test-unsubscribe-secret";

describe("unsubscribeToken", () => {
  describe("normalizeEmail", () => {
    it("lowercases and trims", () => {
      expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
    });
  });

  describe("generate + verify", () => {
    it("round-trips a valid token", () => {
      const token = generateUnsubscribeToken("user@example.com", SECRET);
      expect(verifyUnsubscribeToken("user@example.com", token, SECRET)).toBe(
        true,
      );
    });

    it("rejects a wrong token", () => {
      expect(
        verifyUnsubscribeToken("user@example.com", "deadbeef", SECRET),
      ).toBe(false);
    });

    it("rejects when the email is tampered", () => {
      const token = generateUnsubscribeToken("user@example.com", SECRET);
      expect(
        verifyUnsubscribeToken("attacker@example.com", token, SECRET),
      ).toBe(false);
    });

    it("verifies regardless of email casing/whitespace (normalized)", () => {
      const token = generateUnsubscribeToken("user@example.com", SECRET);
      expect(
        verifyUnsubscribeToken("  USER@Example.COM ", token, SECRET),
      ).toBe(true);
    });

    it("returns false when secret is empty", () => {
      const token = generateUnsubscribeToken("user@example.com", SECRET);
      expect(verifyUnsubscribeToken("user@example.com", token, "")).toBe(false);
    });
  });
});
