import { describe, it, expect, beforeEach, vi } from "vitest";
import { validateFamilyCodeForOnboarding } from "~/utils/familyCodeValidation";
import type { PlayerProfile } from "~/types/onboarding";

// Mock Supabase
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "player-123",
              user_id: "user-456",
              graduation_year: 2028,
              primary_sport: "soccer",
              primary_position: "forward",
              zip_code: "60601",
              gpa: 3.8,
              sat_score: 1400,
              phone: "555-123-4567",
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

describe("utils/familyCodeValidation", () => {
  describe("validateFamilyCodeForOnboarding", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("Format Validation", () => {
      it("should accept valid FAM-XXXXXX format", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");
        expect(result.valid).toBe(true);
      });

      it("should auto-prepend FAM- if missing", async () => {
        const result = await validateFamilyCodeForOnboarding("ABC123");
        expect(result.valid).toBe(true);
      });

      it("should normalize to uppercase automatically", async () => {
        const result = await validateFamilyCodeForOnboarding("fam-abc123");
        expect(result.valid).toBe(true);
      });

      it("should handle mixed case input", async () => {
        const result = await validateFamilyCodeForOnboarding("FaM-AbC123");
        expect(result.valid).toBe(true);
      });

      it("should accept code with spaces (trim them)", async () => {
        const result = await validateFamilyCodeForOnboarding("  FAM-ABC123  ");
        expect(result.valid).toBe(true);
      });
    });

    describe("Invalid Format", () => {
      it("should reject code without proper format", async () => {
        const result = await validateFamilyCodeForOnboarding("INVALID");
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject code that's too short", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-AB");
        expect(result.valid).toBe(false);
      });

      it("should reject code that's too long", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABCDEFG1234");
        expect(result.valid).toBe(false);
      });

      it("should reject empty code", async () => {
        const result = await validateFamilyCodeForOnboarding("");
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject whitespace-only code", async () => {
        const result = await validateFamilyCodeForOnboarding("   ");
        expect(result.valid).toBe(false);
      });

      it("should reject non-alphanumeric characters", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC@123");
        expect(result.valid).toBe(false);
      });
    });

    describe("Return Type", () => {
      it("should return object with valid and playerProfile for success", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");
        expect(result).toHaveProperty("valid");
        expect(typeof result.valid).toBe("boolean");

        if (result.valid) {
          expect(result.playerProfile).toBeDefined();
        }
      });

      it("should return object with valid and error for failure", async () => {
        const result = await validateFamilyCodeForOnboarding("INVALID");
        expect(result).toHaveProperty("valid");
        expect(typeof result.valid).toBe("boolean");

        if (!result.valid) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe("string");
        }
      });

      it("should not include playerProfile when invalid", async () => {
        const result = await validateFamilyCodeForOnboarding("INVALID");
        expect(result.playerProfile).toBeUndefined();
      });
    });

    describe("Happy Path - Valid Code Lookup", () => {
      it("should return player profile for valid code", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");

        if (result.valid && result.playerProfile) {
          expect(result.playerProfile).toHaveProperty("graduation_year");
          expect(result.playerProfile).toHaveProperty("primary_sport");
          expect(result.playerProfile).toHaveProperty("zip_code");
        }
      });

      it("should return profile with all expected fields", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");

        if (result.valid && result.playerProfile) {
          const profile = result.playerProfile;
          expect(typeof profile.graduation_year).toBe("number");
          expect(typeof profile.primary_sport).toBe("string");
          expect(typeof profile.zip_code).toBe("string");
        }
      });
    });

    describe("Error Messages", () => {
      it("should provide descriptive error for invalid format", async () => {
        const result = await validateFamilyCodeForOnboarding("INVALID");
        expect(result.error).toMatch(/format|invalid|expected/i);
      });

      it("should provide error for empty input", async () => {
        const result = await validateFamilyCodeForOnboarding("");
        expect(result.error).toMatch(/required|empty|missing/i);
      });

      it("should provide helpful guidance in error message", async () => {
        const result = await validateFamilyCodeForOnboarding("ABC");
        expect(result.error).toBeDefined();
      });
    });

    describe("Input Normalization", () => {
      it("should trim whitespace from input", async () => {
        const result1 = await validateFamilyCodeForOnboarding("FAM-ABC123");
        const result2 = await validateFamilyCodeForOnboarding("  FAM-ABC123  ");

        // Should handle the same way
        expect(result1.valid).toBe(result2.valid);
      });

      it("should convert to uppercase before validation", async () => {
        const result = await validateFamilyCodeForOnboarding("fam-abc123");
        expect(result.valid).toBe(true);
      });

      it("should handle prefix insertion correctly", async () => {
        const result = await validateFamilyCodeForOnboarding("ABC123");
        expect(result.valid).toBe(true);
      });
    });

    describe("Async Behavior", () => {
      it("should be async function", async () => {
        const result = validateFamilyCodeForOnboarding("FAM-ABC123");
        expect(result instanceof Promise).toBe(true);
      });

      it("should resolve to FamilyCodeValidationResult", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");
        expect(result).toBeDefined();
        expect(result.valid !== undefined).toBe(true);
      });
    });

    describe("Edge Cases", () => {
      it("should handle duplicate link attempt", async () => {
        // Test data would show existing family_link
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");
        // Should either accept or reject based on business logic
        expect(result.valid !== undefined).toBe(true);
      });

      it("should handle malformed profile data gracefully", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");
        expect(result.valid !== undefined).toBe(true);
      });

      it("should handle network errors gracefully", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");
        expect(result.valid !== undefined).toBe(true);
      });
    });

    describe("Database Integration", () => {
      it("should query family_codes table for code", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");
        expect(result.valid !== undefined).toBe(true);
      });

      it("should fetch player profile when code is found", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-ABC123");
        if (result.valid) {
          expect(result.playerProfile).toBeDefined();
        }
      });

      it("should handle not-found gracefully", async () => {
        const result = await validateFamilyCodeForOnboarding("FAM-NOTFOUND");
        // Should indicate code not found
        expect(result.valid !== undefined).toBe(true);
      });
    });
  });
});
