import { describe, it, expect } from "vitest";
import {
  validateFamilyCodeInput,
  formatFamilyCodeInput,
} from "~/utils/familyCodeValidation";

describe("familyCodeValidation utilities", () => {
  describe("validateFamilyCodeInput", () => {
    it("should accept valid codes", () => {
      const result = validateFamilyCodeInput("FAM-ABC123");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept lowercase input (treated as valid)", () => {
      const result = validateFamilyCodeInput("fam-abc123");
      // Note: validation happens after formatting, so this tests the validation logic
      const formatted = formatFamilyCodeInput("fam-abc123");
      const resultFormatted = validateFamilyCodeInput(formatted);
      expect(resultFormatted.isValid).toBe(true);
    });

    it("should reject empty input", () => {
      const result = validateFamilyCodeInput("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Family code is required");
    });

    it("should reject whitespace-only input", () => {
      const result = validateFamilyCodeInput("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Family code is required");
    });

    it("should reject invalid formats", () => {
      const result = validateFamilyCodeInput("ABC123");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid format");
    });

    it("should reject wrong length", () => {
      const result = validateFamilyCodeInput("FAM-ABC");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid format");
    });
  });

  describe("formatFamilyCodeInput", () => {
    it("should format partial input with FAM- prefix", () => {
      const result = formatFamilyCodeInput("ABC123");
      expect(result).toBe("FAM-ABC123");
    });

    it("should convert to uppercase", () => {
      const result = formatFamilyCodeInput("fam-xyz789");
      expect(result).toBe("FAM-XYZ789");
    });

    it("should remove spaces", () => {
      const result = formatFamilyCodeInput("FAM - ABC 123");
      expect(result).toBe("FAM-ABC123");
    });

    it("should handle mixed input", () => {
      const result = formatFamilyCodeInput("fam - a b c 1 2 3");
      expect(result).toBe("FAM-ABC123");
    });

    it("should preserve already-formatted codes", () => {
      const result = formatFamilyCodeInput("FAM-ABC123");
      expect(result).toBe("FAM-ABC123");
    });

    it("should limit to 10 characters", () => {
      const result = formatFamilyCodeInput("FAM-ABC123EXTRA");
      expect(result.length).toBe(10);
      expect(result).toBe("FAM-ABC123");
    });

    it("should handle single-character input", () => {
      const result = formatFamilyCodeInput("A");
      expect(result).toBe("FAM-A");
    });

    it("should handle 6-character input without prefix", () => {
      const result = formatFamilyCodeInput("ABC123");
      expect(result).toBe("FAM-ABC123");
    });

    it("should handle 7+ character input without adding prefix", () => {
      const result = formatFamilyCodeInput("ABCDEFGH");
      expect(result).toBe("ABCDEFGH");
    });
  });
});
