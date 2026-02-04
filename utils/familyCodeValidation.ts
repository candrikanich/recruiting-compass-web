/**
 * Client-side validation for family code input
 */
export const validateFamilyCodeInput = (
  code: string,
): {
  isValid: boolean;
  error?: string;
} => {
  if (!code || code.trim().length === 0) {
    return { isValid: false, error: "Family code is required" };
  }

  // Remove spaces and convert to uppercase
  const normalized = code.trim().toUpperCase();

  // Check if it already has the prefix
  if (normalized.startsWith("FAM-")) {
    // Must be exactly FAM-XXXXXX (10 chars)
    if (!/^FAM-[A-Z0-9]{6}$/.test(normalized)) {
      return {
        isValid: false,
        error: "Invalid format. Expected: FAM-XXXXXX",
      };
    }
  } else {
    // If no prefix, the code must be 6 alphanumeric chars (will add FAM- prefix)
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      return {
        isValid: false,
        error: "Invalid format. Expected: FAM-XXXXXX or XXXXXX",
      };
    }
  }

  return { isValid: true };
};

/**
 * Formats user input to FAM-XXXXXX automatically
 * Removes spaces, converts to uppercase, adds prefix if needed
 */
export const formatFamilyCodeInput = (input: string): string => {
  // Remove spaces, convert to uppercase
  let cleaned = input.replace(/\s/g, "").toUpperCase();

  // Add FAM- prefix if missing and length is correct
  if (!cleaned.startsWith("FAM-") && cleaned.length <= 6) {
    cleaned = `FAM-${cleaned}`;
  }

  // Limit to 10 chars (FAM-XXXXXX)
  return cleaned.substring(0, 10);
};

/**
 * Validates a family code for onboarding and fetches player profile
 *
 * Used during parent signup to link with a player's account.
 * Normalizes the code (auto-prepends FAM- prefix), validates format,
 * and retrieves the associated player profile from the database.
 *
 * @param code - The family code entered by the parent
 * @returns Promise resolving to validation result with optional player profile
 *
 * @example
 * const result = await validateFamilyCodeForOnboarding("ABC123");
 * if (result.valid) {
 *   console.log("Player:", result.playerProfile?.primary_sport);
 * } else {
 *   console.error("Error:", result.error);
 * }
 */
export const validateFamilyCodeForOnboarding = async (
  code: string,
): Promise<{
  valid: boolean;
  playerProfile?: Record<string, unknown>;
  error?: string;
}> => {
  // Normalize and validate input format
  const validation = validateFamilyCodeInput(code);
  if (!validation.isValid) {
    return {
      valid: false,
      error: validation.error || "Invalid family code format",
    };
  }

  // Format the code to ensure consistency
  const formattedCode = formatFamilyCodeInput(code);

  try {
    const supabase = useSupabase();

    // Query family_codes table to find the code
    const { data: familyCodeRecord, error: codeError } = (await supabase
      .from("family_codes")
      .select("player_id")
      .eq("code", formattedCode)
      .single()) as { data: { player_id: string } | null; error: unknown };

    if (codeError || !familyCodeRecord) {
      return {
        valid: false,
        error:
          "Family code not found. Please check and try again, or contact support.",
      };
    }

    // Fetch the player profile
    const { data: playerProfile, error: profileError } = (await supabase
      .from("player_profiles")
      .select("*")
      .eq("id", familyCodeRecord.player_id)
      .single()) as { data: Record<string, unknown> | null; error: unknown };

    if (profileError || !playerProfile) {
      return {
        valid: false,
        error: "Unable to load player profile. Please contact support.",
      };
    }

    return {
      valid: true,
      playerProfile,
    };
  } catch (error) {
    console.error("Family code validation error:", error);
    return {
      valid: false,
      error:
        "An error occurred while validating the family code. Please try again.",
    };
  }
};

/**
 * Import useSupabase for database operations
 */
import { useSupabase } from "~/composables/useSupabase";
