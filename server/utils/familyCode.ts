import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generates a unique family code in format FAM-XXXXXX
 * Checks for collisions and retries up to 5 times
 */
export const generateFamilyCode = async (
  supabase: SupabaseClient
): Promise<string> => {
  const maxRetries = 5;

  for (let i = 0; i < maxRetries; i++) {
    const code = `FAM-${generateRandomString(6)}`;

    // Check for collision
    const { data } = await supabase
      .from("family_units")
      .select("id")
      .eq("family_code", code)
      .single();

    if (!data) return code; // No collision
  }

  throw new Error("Failed to generate unique family code after 5 retries");
};

/**
 * Generates random alphanumeric string (uppercase, no ambiguous chars)
 * Excludes: O, 0 (zero), I, 1, L to avoid confusion
 */
const generateRandomString = (length: number): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
};

/**
 * Validates family code format
 */
export const isValidFamilyCodeFormat = (code: string): boolean => {
  return /^FAM-[A-Z0-9]{6}$/.test(code);
};

/**
 * Rate limit tracking for join code attempts
 * Limits to 5 attempts per IP address per 5 minutes
 */
const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

export const checkRateLimit = (ipAddress: string): boolean => {
  const now = Date.now();
  const key = `join-code:${ipAddress}`;
  const limit = rateLimitStore.get(key);

  // Reset if expired
  if (limit && now > limit.resetAt) {
    rateLimitStore.delete(key);
    return true;
  }

  // Check limit (5 attempts per 5 min)
  if (limit && limit.count >= 5) {
    return false; // Rate limited
  }

  // Increment
  rateLimitStore.set(key, {
    count: (limit?.count || 0) + 1,
    resetAt: limit?.resetAt || now + 5 * 60 * 1000, // 5 min window
  });

  return true;
};
