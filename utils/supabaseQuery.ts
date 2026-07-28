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
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("supabaseQuery");

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
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 *   },
 *   { context: 'fetchCoaches' }
 * )
 */
/**
 * Escape a raw search term for safe use inside a PostgREST `ilike` pattern:
 * backslash/`%`/`_` are LIKE wildcard metacharacters and must be escaped so
 * user input can't inject unintended wildcard matches.
 */
function escapeIlikeWildcards(term: string): string {
  return term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Escape a value for embedding inside a PostgREST `.or()` filter list, where
 * commas and parentheses are syntactically significant. Wrapping in double
 * quotes and escaping backslash/quote characters lets arbitrary user input
 * (including commas) pass through as a literal value instead of being
 * parsed as filter syntax.
 */
function escapeForOrFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Build a `column1.ilike.%term%,column2.ilike.%term%,...` fragment for
 * Supabase's `.or()`, safely escaping the term for both LIKE wildcards and
 * PostgREST or-filter syntax.
 */
export function buildIlikeOrFilter(
  columns: string[],
  term: string,
  pattern: "contains" | "startsWith" = "contains",
): string {
  const escaped = escapeIlikeWildcards(term);
  const wildcarded = pattern === "startsWith" ? `${escaped}%` : `%${escaped}%`;
  const quoted = escapeForOrFilterValue(wildcarded);
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",");
}

export async function querySelect<T>(
  table: string,
  options?: {
    select?: string;
    filters?: Record<string, unknown>;
    /**
     * Push a text search term into the DB query via `.or(col.ilike...)`
     * BEFORE `limit` is applied, instead of fetching `limit` rows and
     * filtering client-side afterward (which silently misses matches
     * outside the first `limit` rows returned in arbitrary DB order).
     */
    search?: { columns: string[]; term: string; pattern?: "contains" | "startsWith" };
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

    // Apply text search (must run before `limit` — see search option docs)
    if (options?.search && options.search.term.trim()) {
      query = query.or(
        buildIlikeOrFilter(
          options.search.columns,
          options.search.term,
          options.search.pattern,
        ),
      );
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
      logger.debug(
        `[querySelect] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
        `returned ${Array.isArray(data) ? data.length : 0} records`,
      );
    }

    return { data: data as T[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      logger.error(
        `[querySelect] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
        { message: error.message, metadata: ctx?.metadata },
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
      logger.debug(
        `[querySingle] ${table}${ctx?.context ? ` (${ctx.context})` : ""} found`,
      );
    }

    return { data: data as T, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      logger.error(
        `[querySingle] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = (await (supabase.from(table) as any)
      .insert(payload as unknown as Record<string, unknown>[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select()) as { data: T[]; error: any };

    if (error) {
      throw new Error(`[${table}] ${error.message}`);
    }

    if (!ctx?.silent) {
      logger.debug(
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
      logger.error(
        `[queryInsert] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      logger.debug(
        `[queryUpdate] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
        `updated ${Array.isArray(data) ? data.length : 0} record(s)`,
      );
    }

    return { data: data as T[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      logger.error(
        `[queryUpdate] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
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
      logger.debug(
        `[queryDelete] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
        "deleted",
      );
    }

    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      logger.error(
        `[queryDelete] ${table}${ctx?.context ? ` (${ctx.context})` : ""}`,
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
