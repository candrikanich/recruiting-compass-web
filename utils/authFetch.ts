/**
 * Authenticated Fetch Utility
 * Makes HTTP requests with Supabase auth token automatically included
 * Replaces useAuthFetch composable (which was a simple wrapper)
 */

import { useSupabase } from "~/composables/useSupabase";

/**
 * Make authenticated fetch call with auto-injected auth header
 * @param url - The URL to fetch
 * @param options - Fetch options (headers will be merged with auth header)
 * @returns Promise with the fetch response
 */
export const fetchAuth = async (
  url: string,
  options?: Record<string, unknown>,
): Promise<unknown> => {
  try {
    const supabase = useSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Build headers with auth token
    const headers = (options?.headers ?? {}) as Record<string, string>;
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    // Make fetch call with auth header
    return await $fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    console.error(`Auth fetch error for ${url}:`, err);
    throw err;
  }
};
