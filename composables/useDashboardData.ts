/**
 * useDashboardData Composable
 * Centralized data fetching for dashboard metrics and entities
 * Handles parallel fetching and family context
 */

import { ref } from "vue";
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

export interface DashboardCounts {
  coaches: number;
  schools: number;
  interactions: number;
}

export const useDashboardData = () => {
  const supabase = useSupabase();

  // Entity state
  const allSchools = ref<School[]>([]);
  const allCoaches = ref<Coach[]>([]);
  const allInteractions = ref<Interaction[]>([]);
  const allOffers = ref<Offer[]>([]);
  const allEvents = ref<Event[]>([]);
  const allMetrics = ref<PerformanceMetric[]>([]);

  // Count state
  const coachCount = ref(0);
  const schoolCount = ref(0);
  const interactionCount = ref(0);

  // Loading state
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch schools for a family unit
   */
  const fetchSchools = async (familyId: string): Promise<void> => {
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("schools")
      .select(
        `
        id,
        name,
        location,
        division,
        conference,
        ranking,
        is_favorite,
        status,
        status_changed_at,
        priority_tier,
        website,
        favicon_url,
        twitter_handle,
        instagram_handle,
        notes,
        pros,
        cons,
        fit_score,
        fit_tier,
        user_id,
        family_unit_id,
        created_at,
        updated_at,
        academic_info,
        amenities,
        coaching_philosophy,
        coaching_style,
        recruiting_approach,
        communication_style,
        success_metrics,
        offer_details,
        private_notes,
        fit_score_data,
        created_by,
        updated_by
      `,
      )
      .eq("family_unit_id", familyId);

    if (schoolsError) {
      logger.error("Error fetching schools:", schoolsError);
      throw schoolsError;
    }

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

    const {
      data: coachesData,
      count: coachesCount,
      error: coachesError,
    } = await supabase
      .from("coaches")
      .select(
        "id, first_name, last_name, title, email, phone, school_id, twitter_handle, instagram_handle, last_contact_date, created_at, updated_at",
        { count: "exact" },
      )
      .in("school_id", schoolIds);

    if (coachesError) {
      logger.error("Error fetching coaches:", coachesError);
      throw coachesError;
    }

    allCoaches.value = coachesData || [];
    coachCount.value = coachesCount || 0;
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
      .select("*", { count: "exact" })
      .eq("family_unit_id", familyId);

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
        .select("*")
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
        .select("*")
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
        .select("*")
        .eq("user_id", userId);

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

    loading.value = true;
    error.value = null;

    try {
      // Step 1: Fetch schools (needed for coaches)
      await fetchSchools(familyId);

      // Step 2: Fetch remaining data in parallel
      const schoolIds = allSchools.value.map((s) => s.id);
      await Promise.all([
        fetchCoaches(schoolIds),
        fetchInteractions(familyId),
        fetchOffers(userId),
        fetchEvents(userId),
        fetchMetrics(userId),
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch dashboard data";
      error.value = message;
      logger.error("Dashboard data fetch error:", err);
      throw err;
    } finally {
      loading.value = false;
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
