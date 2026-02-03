/**
 * Supabase Query Service Layer
 *
 * Provides a unified, type-safe abstraction for Supabase queries across composables.
 * Eliminates duplicate error handling, logging, and query patterns.
 *
 * Goals:
 * - DRY: Single source of truth for Supabase error handling
 * - Type-safe: Full TypeScript support for queries and results
 * - Consistent: Uniform logging, error messages, retry logic
 * - Testable: Easy to mock for unit tests
 */

import { getErrorMessage } from "./errorHandling";
import { useSupabase } from "~/composables/useSupabase";

/**
 * Standard response type for all queries
 * Follows Go-style error handling pattern
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Context for logging and debugging
 */
export interface QueryContext {
  /** Name of the composable or context making the query */
  context?: string;
  /** Additional metadata for debugging */
  metadata?: Record<string, unknown>;
  /** Whether to log the query */
  silent?: boolean;
}

/**
 * Supabase query builder type (for type inference)
 */
export type SupabaseQueryBuilder = ReturnType<
  ReturnType<typeof useSupabase>["from"]
>;

/**
 * Generic select query with flexible filtering
 *
 * @example
 * const { data, error } = await querySelect<Coach>(
 *   'coaches',
 *   {
 *     select: 'id, first_name, last_name, email',
 *     filters: { school_id: schoolId },
 *     order: { column: 'last_name', ascending: true }
 *   },
 *   { context: 'fetchCoaches' }
 * )
 */
export async function querySelect<T>(
  table: string,
  options?: {
    select?: string;
    filters?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  },
  ctx?: QueryContext,
): Promise<QueryResult<T[]>> {
  try {
    const supabase = useSupabase();
    let query = supabase.from(table).select(options?.select || "*");

    // Apply filters
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value === null) {
          query = query.is(key, null);
        } else {
          query = query.eq(key, value as string | number | boolean);
        }
      }
    }

    // Apply ordering
    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending !== false,
      });
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`[${table}] ${error.message}`);
    }

    if (!ctx?.silent) {
      console.log(
        `[querySelect] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
        `returned ${Array.isArray(data) ? data.length : 0} records`,
      );
    }

    return { data: data as T[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      console.error(
        `[querySelect] ${table}${ctx?.context ? ` (${ctx.context})` : ""}:`,
        error.message,
        ctx?.metadata,
      );
    }
    return { data: null, error };
  }
}

/**
 * Get a single record by ID or first matching filter
 *
 * @example
 * const { data, error } = await querySingle<Coach>(
 *   'coaches',
 *   { id: coachId },
 *   { context: 'fetchCoach' }
 * )
 */
export async function querySingle<T>(
  table: string,
  filters: Record<string, unknown>,
  ctx?: QueryContext,
): Promise<QueryResult<T>> {
  try {
    const supabase = useSupabase();
    let query = supabase.from(table).select("*");

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        query = query.is(key, null);
      } else {
        query = query.eq(key, value as string | number | boolean);
      }
    }

    const { data, error } = await query.single();

    if (error) {
      // 406 = no rows, 409 = multiple rows
      if (error.code === "PGRST116") {
        throw new Error(`No record found in ${table}`);
      }
      throw new Error(`[${table}] ${error.message}`);
    }

    if (!ctx?.silent) {
      console.log(
        `[querySingle] ${table}${ctx?.context ? ` (${ctx.context})` : ""} found`,
      );
    }

    return { data: data as T, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      console.error(
        `[querySingle] ${table}${ctx?.context ? ` (${ctx.context})` : ""}:`,
        error.message,
      );
    }
    return { data: null, error };
  }
}

/**
 * Insert one or more records
 *
 * @example
 * const { data, error } = await queryInsert<Coach>(
 *   'coaches',
 *   { first_name: 'John', last_name: 'Smith', school_id: 'school-1' },
 *   { context: 'createCoach' }
 * )
 */
export async function queryInsert<T>(
  table: string,
  records: Record<string, unknown> | Record<string, unknown>[],
  ctx?: QueryContext,
): Promise<QueryResult<T | T[]>> {
  try {
    const supabase = useSupabase();
    const payload = Array.isArray(records) ? records : [records];

    const { data, error } = (await (supabase.from(table) as any)
      .insert(payload as unknown as Record<string, unknown>[])
      .select()) as { data: T[]; error: any };

    if (error) {
      throw new Error(`[${table}] ${error.message}`);
    }

    if (!ctx?.silent) {
      console.log(
        `[queryInsert] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
        `inserted ${Array.isArray(records) ? records.length : 1} record(s)`,
      );
    }

    return {
      data: (Array.isArray(records) ? data : data?.[0]) as T | T[],
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      console.error(
        `[queryInsert] ${table}${ctx?.context ? ` (${ctx.context})` : ""}:`,
        error.message,
      );
    }
    return { data: null, error };
  }
}

/**
 * Update records matching filters
 *
 * @example
 * const { data, error } = await queryUpdate<Coach>(
 *   'coaches',
 *   { responsiveness_score: 8.5 },
 *   { id: coachId },
 *   { context: 'updateCoach' }
 * )
 */
export async function queryUpdate<T>(
  table: string,
  updates: Record<string, unknown>,
  filters: Record<string, unknown>,
  ctx?: QueryContext,
): Promise<QueryResult<T[]>> {
  try {
    const supabase = useSupabase();
    let query = (supabase.from(table) as any).update(updates as unknown);

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        query = query.is(key, null);
      } else {
        query = query.eq(key, value as string | number | boolean);
      }
    }

    const { data, error } = await query.select();

    if (error) {
      throw new Error(`[${table}] ${error.message}`);
    }

    if (!ctx?.silent) {
      console.log(
        `[queryUpdate] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
        `updated ${Array.isArray(data) ? data.length : 0} record(s)`,
      );
    }

    return { data: data as T[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      console.error(
        `[queryUpdate] ${table}${ctx?.context ? ` (${ctx.context})` : ""}:`,
        error.message,
      );
    }
    return { data: null, error };
  }
}

/**
 * Delete records matching filters
 *
 * @example
 * const { error } = await queryDelete(
 *   'coaches',
 *   { id: coachId },
 *   { context: 'deleteCoach' }
 * )
 */
export async function queryDelete(
  table: string,
  filters: Record<string, unknown>,
  ctx?: QueryContext,
): Promise<QueryResult<null>> {
  try {
    const supabase = useSupabase();
    let query = supabase.from(table).delete();

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        query = query.is(key, null);
      } else {
        query = query.eq(key, value as string | number | boolean);
      }
    }

    const { error } = await query;

    if (error) {
      throw new Error(`[${table}] ${error.message}`);
    }

    if (!ctx?.silent) {
      console.log(
        `[queryDelete] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
        "deleted",
      );
    }

    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      console.error(
        `[queryDelete] ${table}${ctx?.context ? ` (${ctx.context})` : ""}:`,
        error.message,
      );
    }
    return { data: null, error };
  }
}

/**
 * Helper to extract error message from query result
 *
 * @example
 * const { data, error } = await querySelect(...)
 * if (error) {
 *   const message = getQueryErrorMessage(error)
 *   // Display to user or log
 * }
 */
export function getQueryErrorMessage(
  error: Error,
  defaultMessage = "Operation failed",
): string {
  return getErrorMessage(error, defaultMessage);
}

/**
 * Check if query was successful
 *
 * @example
 * const result = await querySelect(...)
 * if (isQuerySuccess(result)) {
 *   // Use result.data safely
 * }
 */
export function isQuerySuccess<T>(
  result: QueryResult<T>,
): result is { data: T; error: null } {
  return result.error === null && result.data !== null;
}

/**
 * Check if query failed
 */
export function isQueryError<T>(
  result: QueryResult<T>,
): result is { data: null; error: Error } {
  return result.error !== null;
}
