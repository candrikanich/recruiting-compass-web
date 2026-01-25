/**
 * useAuthFetch Composable
 * Wraps $fetch to automatically include Supabase auth token
 */

import { useSupabase } from "~/composables/useSupabase";

export const useAuthFetch = () => {
  /**
   * Make authenticated fetch call with auto-injected auth header
   */
  const $fetchAuth = async (
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

  return {
    $fetchAuth,
  };
};
