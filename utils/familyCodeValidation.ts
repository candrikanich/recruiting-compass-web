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

  const normalized = code.trim().toUpperCase();

  if (!/^FAM-[A-Z0-9]{6}$/.test(normalized)) {
    return {
      isValid: false,
      error: "Invalid format. Expected: FAM-XXXXXX",
    };
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
