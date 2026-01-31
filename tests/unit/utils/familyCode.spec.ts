import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isValidFamilyCodeFormat,
  checkRateLimit,
} from "~/server/utils/familyCode";

describe("familyCode utilities", () => {
  describe("isValidFamilyCodeFormat", () => {
    it("should validate correct format", () => {
      expect(isValidFamilyCodeFormat("FAM-ABC123")).toBe(true);
      expect(isValidFamilyCodeFormat("FAM-XYZ789")).toBe(true);
      expect(isValidFamilyCodeFormat("FAM-AAAAAA")).toBe(true);
      expect(isValidFamilyCodeFormat("FAM-999999")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidFamilyCodeFormat("ABC123")).toBe(false);
      expect(isValidFamilyCodeFormat("FAM-ABC")).toBe(false); // Too short
      expect(isValidFamilyCodeFormat("FAM-ABC1234")).toBe(false); // Too long
      expect(isValidFamilyCodeFormat("fam-abc123")).toBe(false); // Lowercase
      expect(isValidFamilyCodeFormat("FAMXYZ789")).toBe(false); // Missing dash
      expect(isValidFamilyCodeFormat("FAM-ABC@DE")).toBe(false); // Invalid chars
      expect(isValidFamilyCodeFormat("")).toBe(false); // Empty
    });

    it("should accept alphanumeric characters (ambiguous chars generated sparingly)", () => {
      // Note: Validation accepts all A-Z0-9. The generateFamilyCode function
      // avoids ambiguous chars at generation time (O, 0, I, 1, L)
      expect(isValidFamilyCodeFormat("FAM-OOO000")).toBe(true); // Valid format
      expect(isValidFamilyCodeFormat("FAM-III111")).toBe(true); // Valid format
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests by default", () => {
      const ip = `test-ip-${Date.now()}`;
      expect(checkRateLimit(ip)).toBe(true);
    });

    it("should track attempts per IP", () => {
      const ip1 = `ip-${Math.random()}`;
      const ip2 = `ip-${Math.random()}`;

      // IP1: Make some attempts
      const firstResult = checkRateLimit(ip1);
      expect(firstResult).toBe(true);

      // IP2: Should be independent
      const secondResult = checkRateLimit(ip2);
      expect(secondResult).toBe(true);
    });

    it("should eventually block after too many attempts", () => {
      const ip = `block-test-${Math.random()}`;
      // Try to hit the limit (5 attempts)
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(ip)).toBe(true);
      }
      // 6th attempt should be blocked
      expect(checkRateLimit(ip)).toBe(false);
    });
  });
});
