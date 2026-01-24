import { useCookie } from "#app";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

interface _CsrfTokenResponse {
  token: string;
}

interface FetchOptions {
  headers?: Record<string, string>;
  [key: string]: unknown;
}

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
  const token = useCookie(CSRF_COOKIE_NAME);

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
      console.error("Failed to fetch CSRF token:", error);
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
