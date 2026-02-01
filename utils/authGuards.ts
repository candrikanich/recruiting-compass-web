import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Assert that user is authenticated
 * @throws Error if userId is null or undefined
 * @example
 * requireAuth(userId);
 * // TypeScript now knows userId is string, not string | null
 */
export const requireAuth = (
  userId: string | null,
): asserts userId is string => {
  if (!userId) {
    throw new Error("User is not authenticated");
  }
};

/**
 * Type guard to check if user is authenticated
 * @returns true if userId is a string (authenticated), false if null
 * @example
 * if (isAuthenticated(userId)) {
 *   // userId is narrowed to string here
 * }
 */
export const isAuthenticated = (userId: string | null): userId is string => {
  return userId !== null && userId !== undefined;
};

/**
 * Check if Supabase session exists
 * @param supabase SupabaseClient instance
 * @returns true if session exists, false otherwise
 * @example
 * const hasSession = await checkSession(supabase);
 * if (hasSession) { // user is authenticated
 *   // proceed with authenticated logic
 * }
 */
export const checkSession = async (
  supabase: SupabaseClient,
): Promise<boolean> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
};
