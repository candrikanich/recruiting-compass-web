import { useCookie } from "#app";
import type { Ref } from "vue";
import { createClientLogger } from "~/utils/logger";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Memoized csrf-token cookie ref.
 *
 * `useCsrf()` is invoked per request all over the app — frequently from inside
 * async actions (task fetches, athlete switches) that have no active Vue effect
 * scope. Nuxt's `useCookie` registers a `cookieStore` "change" listener on every
 * call and only cleans it up via `onScopeDispose`; called scope-less, that
 * listener leaks forever. On a long-lived tab this climbed ~2 listeners per
 * athlete switch (soak-caught) until the tab degraded.
 *
 * The app is SPA-only (`ssr: false`), so a module-scoped ref is one-per-browser
 * (never shared across users the way an SSR singleton would be). Creating the
 * cookie ref exactly once means `useCookie`'s listener is registered once, not
 * per call — killing the leak at its source for every caller.
 */
let csrfCookieRef: Ref<string | null | undefined> | null = null;
export function getCsrfCookie(): Ref<string | null | undefined> {
  return (csrfCookieRef ??= useCookie<string | null>(CSRF_COOKIE_NAME));
}

interface _CsrfTokenResponse {
  token: string;
}

interface FetchOptions {
  headers?: Record<string, string>;
  [key: string]: unknown;
}

const logger = createClientLogger("useCsrf");

/**
 * Composable for CSRF token management.
 * Provides methods to get and use CSRF tokens in API requests.
 *
 * @returns Object with methods to manage CSRF tokens
 *
 * @example
 * const { getCsrfToken, addCsrfHeader } = useCsrf()
 * const token = await getCsrfToken()
 * const headers = await addCsrfHeader({ 'Content-Type': 'application/json' })
 */
export function useCsrf(): {
  getCsrfToken: () => Promise<string>;
  addCsrfHeader: (
    headers?: Record<string, string>,
  ) => Promise<Record<string, string>>;
  post: (
    url: string,
    body?: Record<string, unknown>,
    options?: FetchOptions,
  ) => Promise<unknown>;
  put: (
    url: string,
    body?: Record<string, unknown>,
    options?: FetchOptions,
  ) => Promise<unknown>;
  patch: (
    url: string,
    body?: Record<string, unknown>,
    options?: FetchOptions,
  ) => Promise<unknown>;
  delete: (url: string, options?: FetchOptions) => Promise<unknown>;
} {
  const token = getCsrfCookie();

  /**
   * Fetches or retrieves cached CSRF token from cookie.
   * If no token exists, fetches one from the server.
   */
  const getCsrfToken = async (): Promise<string> => {
    if (token.value) {
      return token.value;
    }

    try {
      const response = await $fetch("/api/csrf-token", {
        method: "GET",
      });

      if (response && typeof response === "object" && "token" in response) {
        const responseToken = (response as Record<string, unknown>).token;
        if (typeof responseToken === "string") {
          token.value = responseToken;
          return responseToken;
        }
      }

      throw new Error("No token in response");
    } catch (error) {
      logger.error("Failed to fetch CSRF token:", error);
      throw new Error("Failed to initialize CSRF protection");
    }
  };

  /**
   * Adds CSRF token to request headers.
   * Automatically fetches token if not already cached.
   */
  const addCsrfHeader = async (
    headers: Record<string, string> = {},
  ): Promise<Record<string, string>> => {
    const csrfToken = await getCsrfToken();

    return {
      ...headers,
      [CSRF_HEADER_NAME]: csrfToken,
    };
  };

  /**
   * Makes a POST request with CSRF protection.
   * Automatically includes CSRF token in headers.
   */
  const post = async (
    url: string,
    body?: Record<string, unknown>,
    options?: FetchOptions,
  ) => {
    const headers = await addCsrfHeader(options?.headers);

    return $fetch(url, {
      ...options,
      method: "POST",
      body,
      headers,
    });
  };

  /**
   * Makes a PUT request with CSRF protection.
   */
  const put = async (
    url: string,
    body?: Record<string, unknown>,
    options?: FetchOptions,
  ) => {
    const headers = await addCsrfHeader(options?.headers);

    return $fetch(url, {
      ...options,
      method: "PUT",
      body,
      headers,
    });
  };

  /**
   * Makes a PATCH request with CSRF protection.
   */
  const patch = async (
    url: string,
    body?: Record<string, unknown>,
    options?: FetchOptions,
  ) => {
    const headers = await addCsrfHeader(options?.headers);

    return $fetch(url, {
      ...options,
      method: "PATCH",
      body,
      headers,
    });
  };

  /**
   * Makes a DELETE request with CSRF protection.
   */
  const deleteRequest = async (url: string, options?: FetchOptions) => {
    const headers = await addCsrfHeader(options?.headers);

    return $fetch(url, {
      ...options,
      method: "DELETE",
      headers,
    });
  };

  return {
    getCsrfToken,
    addCsrfHeader,
    post,
    put,
    patch,
    delete: deleteRequest,
  };
}
