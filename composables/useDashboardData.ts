/**
 * useDashboardData Composable
 * Centralized data fetching for dashboard metrics and entities
 * Handles parallel fetching and family context
 */

import { ref, shallowRef } from "vue";
import { useSupabase } from "./useSupabase";
import { createClientLogger } from "~/utils/logger";
import type {
  Coach,
  School,
  Interaction,
  Offer,
  Event,
  PerformanceMetric,
} from "~/types/models";

const logger = createClientLogger("useDashboardData");

/**
 * Dashboard widgets only need recent interaction metadata (trend chart is
 * 30d, contact frequency is 7–30d, last-contact is the newest row). Cap the
 * payload so a family with years of email bodies cannot blow the dashboard
 * heap. `count: "exact"` still reports the true total for the stats tile.
 */
export const DASHBOARD_INTERACTION_LIMIT = 500;

/** Top-metrics widget only displays 3 rows; keep a small recency window. */
export const DASHBOARD_METRIC_LIMIT = 20;

/**
 * List/map/pipeline widgets never render notes, philosophy, or social
 * handles. Pulling those text columns for every school is wasted bytes on
 * the hottest authenticated route.
 */
const DASHBOARD_SCHOOL_COLUMNS = [
  "id",
  "name",
  "location",
  "city",
  "state",
  "division",
  "conference",
  "is_favorite",
  "status",
  "status_changed_at",
  "website",
  "favicon_url",
  "fit_tier",
  "user_id",
  "family_unit_id",
  "created_at",
  "updated_at",
  "academic_info",
].join(", ");

const DASHBOARD_INTERACTION_COLUMNS = [
  "id",
  "school_id",
  "type",
  "direction",
  "occurred_at",
  "created_at",
].join(", ");

export interface DashboardCounts {
  coaches: number;
  schools: number;
  interactions: number;
}

export const useDashboardData = () => {
  const supabase = useSupabase();

  // Entity state — shallowRef: dashboard always replaces the whole array,
  // so deep reactive proxies on every school/interaction row are wasted
  // memory and a source of cascading re-renders on nested field writes.
  const allSchools = shallowRef<School[]>([]);
  const allCoaches = shallowRef<Coach[]>([]);
  const allInteractions = shallowRef<Interaction[]>([]);
  const allOffers = shallowRef<Offer[]>([]);
  const allEvents = shallowRef<Event[]>([]);
  const allMetrics = shallowRef<PerformanceMetric[]>([]);

  // Count state
  const coachCount = ref(0);
  const schoolCount = ref(0);
  const interactionCount = ref(0);

  // Loading state
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Sequence token: guards against an older, slower fetchAll() call (e.g.
  // rapid parent athlete-switching firing overlapping loads) continuing to
  // apply results/loading state after a newer fetchAll() has superseded it.
  let dashboardSequence = 0;

  // fetchSchools writes directly to allSchools regardless of caller
  // (fetchAll or a standalone call) — it needs its own token so an older,
  // slower fetchSchools() call can't clobber a newer one's write even when
  // fetchAll's own outer guard has already moved past this step.
  let schoolsSequence = 0;

  /**
   * Fetch schools for a family unit
   */
  const fetchSchools = async (familyId: string): Promise<void> => {
    const requestSequence = ++schoolsSequence;
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("schools")
      .select(DASHBOARD_SCHOOL_COLUMNS)
      .eq("family_unit_id", familyId);

    if (schoolsError) {
      logger.error("Error fetching schools:", schoolsError);
      throw schoolsError;
    }

    // Discard this result if a newer fetchSchools() call has since started
    // — an older, slower response must never clobber fresher data.
    if (requestSequence !== schoolsSequence) return;

    if (schoolsData) {
      allSchools.value = schoolsData;
      schoolCount.value = schoolsData.length;
    }
  };

  /**
   * Fetch coaches for given school IDs
   */
  const fetchCoaches = async (schoolIds: string[]): Promise<void> => {
    if (schoolIds.length === 0) {
      allCoaches.value = [];
      coachCount.value = 0;
      return;
    }

    // Chunk the school IDs: a single `.in()` with hundreds of UUIDs builds an
    // over-long request URL that the server rejects (HTTP 400 / fetch failure),
    // breaking the entire dashboard load for families with many schools.
    const CHUNK_SIZE = 150;
    const chunks: string[][] = [];
    for (let i = 0; i < schoolIds.length; i += CHUNK_SIZE) {
      chunks.push(schoolIds.slice(i, i + CHUNK_SIZE));
    }

    // Degrade gracefully: one failing chunk must not blank the whole dashboard.
    // allSettled keeps the chunks that succeeded; a partial failure is a warning,
    // not a thrown error (which previously took down the entire dashboard load
    // and logged console errors under heavy/bloated school lists).
    const settled = await Promise.allSettled(
      chunks.map((chunk) =>
        supabase
          .from("coaches")
          .select(
            "id, first_name, last_name, role, email, phone, school_id, twitter_handle, instagram_handle, last_contact_date, created_at, updated_at",
          )
          .in("school_id", chunk),
      ),
    );

    const coachesData: Coach[] = [];
    let failedChunks = 0;
    for (const outcome of settled) {
      if (outcome.status === "rejected") {
        failedChunks++;
        logger.warn("Coaches chunk request failed:", outcome.reason);
        continue;
      }
      const { data, error: coachesError } = outcome.value;
      if (coachesError) {
        failedChunks++;
        logger.warn("Coaches chunk returned an error:", coachesError);
        continue;
      }
      if (data) coachesData.push(...(data as Coach[]));
    }

    if (failedChunks > 0) {
      logger.warn(
        `Dashboard coaches: ${failedChunks}/${chunks.length} chunk(s) failed; showing partial results.`,
      );
    }

    allCoaches.value = coachesData;
    coachCount.value = coachesData.length;
  };

  /**
   * Fetch interactions for a user
   */
  const fetchInteractions = async (familyId: string): Promise<void> => {
    const {
      data: interactionsData,
      count: interactionsCount,
      error: interactionsError,
    } = await supabase
      .from("interactions")
      .select(DASHBOARD_INTERACTION_COLUMNS, { count: "exact" })
      .eq("family_unit_id", familyId)
      .order("occurred_at", { ascending: false })
      .limit(DASHBOARD_INTERACTION_LIMIT);

    if (interactionsError) {
      logger.error("Error fetching interactions:", interactionsError);
      throw interactionsError;
    }

    if (interactionsData) {
      allInteractions.value = interactionsData;
      interactionCount.value = interactionsCount || 0;
    }
  };

  /**
   * Fetch offers for a user
   */
  const fetchOffers = async (userId: string): Promise<void> => {
    try {
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select(
          "id, user_id, school_id, offer_type, status, scholarship_amount, scholarship_percentage, deadline_date, notes, created_at",
        )
        .eq("user_id", userId);

      if (!offersError && offersData) {
        allOffers.value = offersData;
      }
    } catch (err) {
      logger.error("Error fetching offers:", err);
      allOffers.value = [];
    }
  };

  /**
   * Fetch events for a user
   */
  const fetchEvents = async (userId: string): Promise<void> => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(
          "id, user_id, school_id, type, name, start_date, end_date, registered, attended, location, created_at",
        )
        .eq("user_id", userId);

      if (!eventsError && eventsData) {
        allEvents.value = eventsData;
      }
    } catch (err) {
      logger.error("Error fetching events:", err);
      allEvents.value = [];
    }
  };

  /**
   * Fetch performance metrics for a user
   */
  const fetchMetrics = async (userId: string): Promise<void> => {
    try {
      const { data: metricsData, error: metricsError } = await supabase
        .from("performance_metrics")
        .select(
          "id, user_id, metric_type, value, unit, recorded_date, notes, verified, created_at",
        )
        .eq("user_id", userId)
        .order("recorded_date", { ascending: false })
        .limit(DASHBOARD_METRIC_LIMIT);

      if (!metricsError && metricsData) {
        allMetrics.value = metricsData;
      }
    } catch (err) {
      logger.error("Error fetching metrics:", err);
      allMetrics.value = [];
    }
  };

  /**
   * Fetch all dashboard data in parallel
   * @param familyId - Family unit ID for schools/coaches
   * @param userId - User ID for interactions, offers, events, metrics
   */
  const fetchAll = async (familyId: string, userId: string): Promise<void> => {
    if (!familyId) {
      logger.warn("No family ID provided, skipping data fetch");
      return;
    }

    const requestSequence = ++dashboardSequence;

    // Clear prior entity data synchronously, before the async fetches start.
    // Previously the old family/athlete's data stayed visible in allSchools/
    // allCoaches/etc. until the new data arrived (a "stale flash" on parent
    // athlete-switch), and a swallowed per-entity fetch error left the old
    // data in place indefinitely with no error surfaced for that entity.
    reset();
    loading.value = true;

    try {
      // Step 1: Fetch schools (needed for coaches)
      await fetchSchools(familyId);

      // A newer fetchAll() call has since superseded this one (e.g. the
      // parent switched athletes again mid-load) — stop before continuing
      // to fetch/apply data for the now-stale family/user.
      if (requestSequence !== dashboardSequence) return;

      // Step 2: Fetch remaining data in parallel
      const schoolIds = allSchools.value.map((s) => s.id);
      await Promise.all([
        fetchCoaches(schoolIds),
        fetchInteractions(familyId),
        fetchOffers(userId),
        fetchEvents(userId),
        fetchMetrics(userId),
      ]);

      if (requestSequence !== dashboardSequence) return;
    } catch (err) {
      if (requestSequence !== dashboardSequence) return;
      error.value =
        err instanceof Error ? err.message : "Failed to fetch dashboard data";
      logger.error("Dashboard data fetch error:", err);
      throw err;
    } finally {
      if (requestSequence === dashboardSequence) {
        loading.value = false;
      }
    }
  };

  /**
   * Reset all data
   */
  const reset = (): void => {
    allSchools.value = [];
    allCoaches.value = [];
    allInteractions.value = [];
    allOffers.value = [];
    allEvents.value = [];
    allMetrics.value = [];
    coachCount.value = 0;
    schoolCount.value = 0;
    interactionCount.value = 0;
    error.value = null;
  };

  return {
    // Entity refs
    allSchools,
    allCoaches,
    allInteractions,
    allOffers,
    allEvents,
    allMetrics,

    // Count refs
    coachCount,
    schoolCount,
    interactionCount,

    // Loading state
    loading,
    error,

    // Methods
    fetchAll,
    fetchSchools,
    fetchCoaches,
    fetchInteractions,
    fetchOffers,
    fetchEvents,
    fetchMetrics,
    reset,
  };
};
