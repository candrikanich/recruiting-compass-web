/**
 * Type-safe wrappers for Supabase query responses.
 *
 * These helpers eliminate the need for `as any` casts when destructuring
 * Supabase responses, which don't cleanly expose the error property type.
 *
 * @example
 * // Before (common anti-pattern):
 * const { data } = response as { data: School[] | null; error: any };
 *
 * // After:
 * const data = extractQueryResult<School[]>(response);
 */

export interface SupabaseQueryError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseQueryResponse<T> {
  data: T | null;
  error: SupabaseQueryError | null;
}

/**
 * Extracts data from a Supabase response or throws if there was an error.
 * Returns null when data is null and no error occurred (e.g. empty single() result).
 */
export function extractQueryResult<T>(
  response: SupabaseQueryResponse<T>,
): T | null {
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data;
}

/**
 * Extracts data from a Supabase response and throws if data is null.
 * Use for queries where the absence of data is an error condition.
 */
export function requireQueryResult<T>(
  response: SupabaseQueryResponse<T>,
  entityName = "record",
): T {
  const data = extractQueryResult(response);
  if (data === null) {
    throw new Error(`${entityName} not found`);
  }
  return data;
}
