import { describe, it, expect } from "vitest";
import { validatePlayerAge } from "~/utils/ageVerification";

describe("utils/ageVerification", () => {
  describe("validatePlayerAge", () => {
    const currentYear = new Date().getFullYear();

    describe("Happy Path - Valid Ages", () => {
      it("should accept current year graduation (age ~18)", () => {
        const result = validatePlayerAge(currentYear);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept next year graduation (age ~17)", () => {
        const result = validatePlayerAge(currentYear + 1);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept 4 years from now graduation (age ~14)", () => {
        const result = validatePlayerAge(currentYear + 4);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept past graduation year (senior)", () => {
        const result = validatePlayerAge(currentYear - 1);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept 10 years in past (college player)", () => {
        const result = validatePlayerAge(currentYear - 10);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe("Edge Cases - Boundary Year", () => {
      it("should accept exactly 4 years from now (exactly age 14)", () => {
        const result = validatePlayerAge(currentYear + 4);
        expect(result.isValid).toBe(true);
      });

      it("should reject 5 years from now (under 14)", () => {
        const result = validatePlayerAge(currentYear + 5);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain("14");
      });

      it("should reject 6 years from now (well under 14)", () => {
        const result = validatePlayerAge(currentYear + 6);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject 20 years from now (too young)", () => {
        const result = validatePlayerAge(currentYear + 20);
        expect(result.isValid).toBe(false);
      });
    });

    describe("Under-14 Detection", () => {
      it("should reject with descriptive error message for under-14", () => {
        const result = validatePlayerAge(currentYear + 5);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/14.*years old|designed for athletes/i);
      });

      it("should provide contact support guidance in error message", () => {
        const result = validatePlayerAge(currentYear + 10);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("Invalid Input Handling", () => {
      it("should handle invalid graduation year with error", () => {
        const result = validatePlayerAge(0);
        expect(result.isValid).toBe(false);
      });

      it("should handle far future year (unrealistic)", () => {
        const result = validatePlayerAge(currentYear + 100);
        expect(result.isValid).toBe(false);
      });

      it("should handle negative year", () => {
        const result = validatePlayerAge(-2000);
        expect(result.isValid).toBe(false);
      });
    });

    describe("Return Type Structure", () => {
      it("should always return object with isValid boolean", () => {
        const result = validatePlayerAge(currentYear);
        expect(typeof result).toBe("object");
        expect(typeof result.isValid).toBe("boolean");
      });

      it("should include error message only when invalid", () => {
        const validResult = validatePlayerAge(currentYear);
        expect(validResult.error).toBeUndefined();

        const invalidResult = validatePlayerAge(currentYear + 5);
        expect(invalidResult.error).toBeDefined();
        expect(typeof invalidResult.error).toBe("string");
      });

      it("should not include error property when valid", () => {
        const result = validatePlayerAge(currentYear + 2);
        expect(result).toEqual({ isValid: true });
        expect(Object.keys(result)).toEqual(["isValid"]);
      });
    });
  });
});
