/**
 * useAuthFetch Composable
 * Wraps $fetch to automatically include Supabase auth token and CSRF token.
 * Handles expired sessions with user-friendly messaging and login redirect.
 */

import { useSupabase } from "~/composables/useSupabase";
import { useCsrf } from "~/composables/useCsrf";
import { useToast } from "~/composables/useToast";
import { FetchError } from "ofetch";

const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Please sign in again.");
    this.name = "SessionExpiredError";
  }
}

export const useAuthFetch = () => {
  const { addCsrfHeader } = useCsrf();
  const { showToast } = useToast();

  const handleSessionExpired = async () => {
    showToast(
      "Your session has expired. Redirecting to sign in...",
      "warning",
      4000,
    );

    // Brief delay so the user sees the toast before redirect
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await navigateTo("/login?reason=session_expired");
  };

  /**
   * Make authenticated fetch call with auto-injected auth and CSRF headers
   */
  const $fetchAuth = async (
    url: string,
    options?: Record<string, unknown>,
  ): Promise<unknown> => {
    const supabase = useSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      await handleSessionExpired();
      throw new SessionExpiredError();
    }

    // Build headers with auth token
    let headers = (options?.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${session.access_token}`;

    // Add CSRF token for state-changing methods
    const method = ((options?.method as string) ?? "GET").toUpperCase();
    if (STATE_CHANGING_METHODS.includes(method)) {
      headers = await addCsrfHeader(headers);
    }

    // Add correlation ID for end-to-end request tracing
    if (typeof window !== "undefined") {
      const correlationId = sessionStorage.getItem("correlation-id");
      if (correlationId) {
        headers["x-request-id"] = correlationId;
      }
    }

    try {
      return await $fetch(url, {
        ...options,
        headers,
      });
    } catch (err) {
      // Handle 401 responses (token expired between getSession and API call)
      if (err instanceof FetchError && err.statusCode === 401) {
        await handleSessionExpired();
        throw new SessionExpiredError();
      }

      throw err;
    }
  };

  return {
    $fetchAuth,
  };
};
