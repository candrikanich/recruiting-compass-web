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

// A prior validateFamilyCodeForOnboarding() here queried a `family_codes`
// table that exists in no migration — deleted as dead ghost-schema code
// (it had zero real callers; utils/onboarding/index.ts only re-exported it).
// The real family-code join flow is useFamilyCode + /api/family/code/join
// (family_units/family_members tables). See
// planning/audit-2026-07-27-findings.md.
