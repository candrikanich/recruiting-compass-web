import { ref, computed, type Ref } from "vue";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useCursorPagination");

/**
 * Cursor-based pagination helper
 *
 * Benefits over OFFSET pagination:
 * - Consistent performance (O(1) vs O(n) as offset grows)
 * - No missing/duplicate records when data changes
 * - 10-100x faster for large datasets
 *
 * Reference: Supabase Postgres Best Practices (Rule 6.3)
 *
 * @example
 * ```typescript
 * const { items, hasMore, loadMore, reset } = useCursorPagination(
 *   supabase.from("interactions"),
 *   "occurred_at",
 *   20
 * );
 *
 * // Load first page
 * await loadMore();
 *
 * // Load next page
 * if (hasMore.value) {
 *   await loadMore();
 * }
 * ```
 */
export const useCursorPagination = <T extends Record<string, unknown>>(
  queryBuilder: ReturnType<SupabaseClient["from"]>,
  cursorColumn: keyof T,
  pageSize = 20,
  order: "asc" | "desc" = "desc",
) => {
  const items: Ref<T[]> = ref([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastCursor: Ref<string | number | null> = ref(null);
  const hasMore = ref(true);

  /**
   * Load the next page of results
   */
  const loadMore = async (): Promise<void> => {
    if (loading.value || !hasMore.value) return;

    loading.value = true;
    error.value = null;

    try {
      let query = queryBuilder.select("*").limit(pageSize + 1); // Fetch one extra to check if more exist

      // Apply cursor filter
      if (lastCursor.value !== null) {
        if (order === "desc") {
          query = query.lt(
            cursorColumn as string,
            lastCursor.value as string | number,
          );
        } else {
          query = query.gt(
            cursorColumn as string,
            lastCursor.value as string | number,
          );
        }
      }

      // Apply ordering
      query = query.order(cursorColumn as string, { ascending: order === "asc" });

      const { data, error: fetchError } = (await query) as {
        data: T[] | null;
        error: Error | null;
      };

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        hasMore.value = false;
        return;
      }

      // Check if there are more results
      if (data.length > pageSize) {
        hasMore.value = true;
        // Remove the extra item
        data.pop();
      } else {
        hasMore.value = false;
      }

      // Update cursor to the last item's cursor value
      if (data.length > 0) {
        const lastItem = data[data.length - 1];
        lastCursor.value = lastItem[cursorColumn] as string | number;
      }

      // Append to items list
      items.value = [...items.value, ...data];
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load paginated results";
      error.value = message;
      logger.error("[useCursorPagination] Error:", message);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Reset pagination state and load first page
   */
  const reset = async (): Promise<void> => {
    items.value = [];
    lastCursor.value = null;
    hasMore.value = true;
    error.value = null;
    await loadMore();
  };

  /**
   * Total items loaded so far
   */
  const count = computed(() => items.value.length);

  return {
    items: computed(() => items.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    hasMore: computed(() => hasMore.value),
    count,
    loadMore,
    reset,
  };
};

/**
 * Type-safe cursor pagination with specific column selection
 *
 * @example
 * ```typescript
 * const { items, loadMore } = useTypedCursorPagination<Interaction>(
 *   supabase,
 *   "interactions",
 *   "id, occurred_at, type, subject",
 *   "occurred_at",
 *   { familyUnitId: "abc-123" },
 *   20
 * );
 * ```
 */
export const useTypedCursorPagination = <T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  cursorColumn: keyof T,
  filters?: Record<string, string | number | boolean>,
  pageSize = 20,
  order: "asc" | "desc" = "desc",
) => {
  const items: Ref<T[]> = ref([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastCursor: Ref<string | number | null> = ref(null);
  const hasMore = ref(true);

  const loadMore = async (): Promise<void> => {
    if (loading.value || !hasMore.value) return;

    loading.value = true;
    error.value = null;

    try {
      let query = supabase
        .from(table)
        .select(columns)
        .limit(pageSize + 1);

      // Apply filters
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }
      }

      // Apply cursor filter
      if (lastCursor.value !== null) {
        if (order === "desc") {
          query = query.lt(
            cursorColumn as string,
            lastCursor.value as string | number,
          );
        } else {
          query = query.gt(
            cursorColumn as string,
            lastCursor.value as string | number,
          );
        }
      }

      // Apply ordering
      query = query.order(cursorColumn as string, { ascending: order === "asc" });

      const { data, error: fetchError } = (await query) as {
        data: T[] | null;
        error: Error | null;
      };

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        hasMore.value = false;
        return;
      }

      // Check if there are more results
      if (data.length > pageSize) {
        hasMore.value = true;
        data.pop();
      } else {
        hasMore.value = false;
      }

      // Update cursor
      if (data.length > 0) {
        const lastItem = data[data.length - 1];
        lastCursor.value = lastItem[cursorColumn] as string | number;
      }

      items.value = [...items.value, ...data];
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load paginated results";
      error.value = message;
      logger.error("[useTypedCursorPagination] Error:", message);
    } finally {
      loading.value = false;
    }
  };

  const reset = async (): Promise<void> => {
    items.value = [];
    lastCursor.value = null;
    hasMore.value = true;
    error.value = null;
    await loadMore();
  };

  const count = computed(() => items.value.length);

  return {
    items: computed(() => items.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    hasMore: computed(() => hasMore.value),
    count,
    loadMore,
    reset,
  };
};
