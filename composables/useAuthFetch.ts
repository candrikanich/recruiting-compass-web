/**
 * useAuthFetch Composable
 * Wraps $fetch to automatically include Supabase auth token and CSRF token.
 * Handles expired sessions with user-friendly messaging and login redirect.
 */

import type { FetchOptions } from "ofetch";
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
  const supabase = useSupabase();

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
  const $fetchAuth = async <T = unknown>(
    url: string,
    options?: FetchOptions,
  ): Promise<T> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      await handleSessionExpired();
      throw new SessionExpiredError();
    }

    // Build headers with auth token — spread to avoid mutating the caller's object
    const authHeaders: Record<string, string> = {
      ...((options?.headers ?? {}) as Record<string, string>),
      Authorization: `Bearer ${session.access_token}`,
    };

    // Add CSRF token for state-changing methods
    const method = ((options?.method as string) ?? "GET").toUpperCase();
    const headers = STATE_CHANGING_METHODS.includes(method)
      ? await addCsrfHeader(authHeaders)
      : authHeaders;

    // Add correlation ID for end-to-end request tracing
    if (typeof window !== "undefined") {
      const correlationId = sessionStorage.getItem("correlation-id");
      if (correlationId) {
        headers["x-request-id"] = correlationId;
      }
    }

    try {
      // Nuxt's global $fetch uses NitroFetchRequest for its URL parameter and
      // NitroFetchOptions for options — resolving those types against ofetch's
      // FetchOptions causes excessive stack depth. Casting to `any` here is the
      // minimal escape hatch; callers still get full type safety via <T>.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await ($fetch as any)(url, { ...options, headers })) as T;
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
