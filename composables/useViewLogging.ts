import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";

/**
 * Composable for logging parent views of athlete data
 *
 * Provides functions to:
 * - Log when parents view athlete pages
 * - Retrieve view logs
 * - Check if specific items have been viewed
 *
 * Only logs when user is a parent viewing a linked athlete's data
 */
export const useViewLogging = () => {
  const supabase = useSupabase();
  let userStore: ReturnType<typeof useUserStore> | undefined;
  const getUserStore = () => {
    if (!userStore) {
      userStore = useUserStore();
    }
    return userStore;
  };

  /**
   * Log parent view of athlete data
   *
   * Only logs when:
   * 1. Current user is a parent
   * 2. Viewing a different user's data (athleteId differs from current user)
   * 3. Parent has accepted link to the athlete
   *
   * Failures are silent to avoid breaking navigation
   */
  const logParentView = async (
    itemType: string,
    athleteId: string,
    itemId?: string,
  ): Promise<void> => {
    const store = getUserStore();
    // Only log if user is a parent
    if (store.user?.role !== "parent") return;

    // Only log if viewing different user's data
    if (store.user.id === athleteId) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = (await (supabase.from("parent_view_log") as any).insert(
        {
          parent_user_id: store.user.id,
          athlete_id: athleteId,
          viewed_item_type: itemType,
          viewed_item_id: itemId || null,
          viewed_at: new Date().toISOString(),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as { error: any };

      if (error) {
        console.debug("View logging error:", error.message);
      }
    } catch (err) {
      // Silent fail - logging is non-critical and shouldn't break navigation
      console.debug(
        "View logging failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  };

  /**
   * Get view logs for current user (when viewed as athlete)
   *
   * Returns logs of when parents have viewed the athlete's data
   */
  const getViewLogs = async (limit = 50) => {
    const store = getUserStore();
    if (!store.user) return [];

    try {
      const { data, error } = await supabase
        .from("parent_view_log")
        .select("*, parent:users!parent_user_id(id, full_name, email)")
        .eq("athlete_id", store.user.id)
        .order("viewed_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.debug("Failed to fetch view logs:", error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.debug(
        "Error fetching view logs:",
        err instanceof Error ? err.message : "Unknown error",
      );
      return [];
    }
  };

  /**
   * Check if parent has viewed specific item
   */
  const hasParentViewed = async (
    itemType: string,
    itemId?: string,
  ): Promise<boolean> => {
    const store = getUserStore();
    if (!store.user) return false;

    try {
      let query = supabase
        .from("parent_view_log")
        .select("id", { count: "exact", head: true })
        .eq("athlete_id", store.user.id)
        .eq("viewed_item_type", itemType);

      if (itemId) {
        query = query.eq("viewed_item_id", itemId);
      }

      const { count, error } = await query;

      if (error) {
        console.debug("Failed to check view status:", error.message);
        return false;
      }

      return count ? count > 0 : false;
    } catch (err) {
      console.debug(
        "Error checking view status:",
        err instanceof Error ? err.message : "Unknown error",
      );
      return false;
    }
  };

  /**
   * Get count of total views by parents for the current athlete
   */
  const getViewCount = async (): Promise<number> => {
    const store = getUserStore();
    if (!store.user) return 0;

    try {
      const { count, error } = await supabase
        .from("parent_view_log")
        .select("id", { count: "exact", head: true })
        .eq("athlete_id", store.user.id);

      if (error) {
        console.debug("Failed to get view count:", error.message);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.debug(
        "Error getting view count:",
        err instanceof Error ? err.message : "Unknown error",
      );
      return 0;
    }
  };

  /**
   * Get most recent parent view for current athlete
   */
  const getLastParentView = async () => {
    const store = getUserStore();
    if (!store.user) return null;

    try {
      const { data, error } = await supabase
        .from("parent_view_log")
        .select("*, parent:users!parent_user_id(id, full_name, email)")
        .eq("athlete_id", store.user.id)
        .order("viewed_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned - normal case
          return null;
        }
        console.debug("Failed to get last view:", error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.debug(
        "Error getting last view:",
        err instanceof Error ? err.message : "Unknown error",
      );
      return null;
    }
  };

  return {
    logParentView,
    getViewLogs,
    hasParentViewed,
    getViewCount,
    getLastParentView,
  };
};
