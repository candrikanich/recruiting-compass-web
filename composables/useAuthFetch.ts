/**
 * useAuthFetch Composable
 * Wraps $fetch to automatically include Supabase auth token and CSRF token
 */

import { useSupabase } from "~/composables/useSupabase";
import { useCsrf } from "~/composables/useCsrf";

const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export const useAuthFetch = () => {
  const { addCsrfHeader } = useCsrf();

  /**
   * Make authenticated fetch call with auto-injected auth and CSRF headers
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
      let headers = (options?.headers ?? {}) as Record<string, string>;
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      // Add CSRF token for state-changing methods
      const method = ((options?.method as string) ?? "GET").toUpperCase();
      if (STATE_CHANGING_METHODS.includes(method)) {
        headers = await addCsrfHeader(headers);
      }

      // Make fetch call with auth + CSRF headers
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
