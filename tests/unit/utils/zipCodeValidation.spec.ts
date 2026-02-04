import { describe, it, expect } from "vitest";
import { validateZipCode } from "~/utils/zipCodeValidation";

describe("utils/zipCodeValidation", () => {
  describe("validateZipCode", () => {
    describe("Happy Path - Valid Zip Codes", () => {
      it("should accept valid 5-digit zip code", () => {
        expect(validateZipCode("12345")).toBe(true);
      });

      it("should accept various valid zip codes", () => {
        expect(validateZipCode("00000")).toBe(true);
        expect(validateZipCode("99999")).toBe(true);
        expect(validateZipCode("10001")).toBe(true);
        expect(validateZipCode("60601")).toBe(true);
      });

      it("should accept zip codes with leading zeros", () => {
        expect(validateZipCode("00001")).toBe(true);
        expect(validateZipCode("01234")).toBe(true);
      });
    });

    describe("Invalid Length", () => {
      it("should reject zip code shorter than 5 digits", () => {
        expect(validateZipCode("1234")).toBe(false);
        expect(validateZipCode("123")).toBe(false);
        expect(validateZipCode("12")).toBe(false);
        expect(validateZipCode("1")).toBe(false);
      });

      it("should reject zip code longer than 5 digits", () => {
        expect(validateZipCode("123456")).toBe(false);
        expect(validateZipCode("1234567")).toBe(false);
        expect(validateZipCode("1234567890")).toBe(false);
      });

      it("should reject empty string", () => {
        expect(validateZipCode("")).toBe(false);
      });
    });

    describe("Non-Numeric Characters", () => {
      it("should reject zip code with letters", () => {
        expect(validateZipCode("1234a")).toBe(false);
        expect(validateZipCode("a1234")).toBe(false);
        expect(validateZipCode("1a3a5")).toBe(false);
      });

      it("should reject zip code with spaces", () => {
        expect(validateZipCode("1234 5")).toBe(false);
        expect(validateZipCode("12345 ")).toBe(false);
        expect(validateZipCode(" 12345")).toBe(false);
        expect(validateZipCode("1 2 3 4 5")).toBe(false);
      });

      it("should reject zip code with special characters", () => {
        expect(validateZipCode("1234-5")).toBe(false);
        expect(validateZipCode("1234.5")).toBe(false);
        expect(validateZipCode("12345!")).toBe(false);
        expect(validateZipCode("(12345)")).toBe(false);
        expect(validateZipCode("12345+")).toBe(false);
      });
    });

    describe("Edge Cases", () => {
      it("should reject null-like strings", () => {
        expect(validateZipCode("null")).toBe(false);
        expect(validateZipCode("undefined")).toBe(false);
        expect(validateZipCode("NaN")).toBe(false);
      });

      it("should be case-sensitive for letters", () => {
        expect(validateZipCode("ABCDE")).toBe(false);
        expect(validateZipCode("abcde")).toBe(false);
      });

      it("should not accept numeric-looking but non-numeric strings", () => {
        expect(validateZipCode("①②③④⑤")).toBe(false);
      });
    });

    describe("Return Type", () => {
      it("should return boolean true for valid zip", () => {
        const result = validateZipCode("12345");
        expect(typeof result).toBe("boolean");
        expect(result).toBe(true);
      });

      it("should return boolean false for invalid zip", () => {
        const result = validateZipCode("invalid");
        expect(typeof result).toBe("boolean");
        expect(result).toBe(false);
      });
    });
  });
});
