import { ref, computed, inject, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import type { Event } from "~/types/models";
import type { Database } from "~/types/database";

// Type aliases for Supabase casting
type _EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type _EventUpdate = Database["public"]["Tables"]["events"]["Update"];

/**
 * useEvents composable
 * Manages recruiting events and performance opportunities
 *
 * Event types:
 * - camp: College baseball camp
 * - showcase: Prospect showcase/tournament
 * - official_visit: Official campus visit (OV)
 * - unofficial_visit: Unofficial campus visit
 * - game: Scheduled game/match
 *
 * Features:
 * - Track event dates and locations
 * - Link events to schools and coaches
 * - Record performance metrics at events
 * - Manage attendance and results
 * - Calculate travel time to venues
 * - Track recruiting exposure at events
 *
 * Events serve as touchpoints for interaction tracking and performance metrics
 */
export const useEvents = (): {
  events: ComputedRef<Event[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  fetchEvents: (filters?: {
    schoolId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchEvent: (id: string) => Promise<Event | null>;
  createEvent: (
    eventData: Omit<Event, "id" | "created_at" | "updated_at">,
  ) => Promise<Event>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  // Try to get the provided family context (from page), fall back to singleton
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");
  const activeFamily = injectedFamily || useFamilyContext();

  if (!injectedFamily) {
    console.warn(
      "[useEvents] activeFamily injection failed, using singleton fallback. " +
        "This may cause data sync issues when parent switches athletes.",
    );
  }

  const events = ref<Event[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchEvents = async (filters?: {
    schoolId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!userStore.user) return;

    loading.value = true;
    error.value = null;

    try {
      let query = supabase
        .from("events")
        .select("*")
        .eq("user_id", userStore.user.id);

      if (filters?.schoolId) {
        query = query.eq("school_id", filters.schoolId);
      }

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      // Move date filtering to SQL (10x less data transferred, faster)
      if (filters?.startDate) {
        query = query.gte(
          "start_date",
          new Date(filters.startDate).toISOString(),
        );
      }

      if (filters?.endDate) {
        query = query.lte(
          "start_date",
          new Date(filters.endDate).toISOString(),
        );
      }

      const { data, error: fetchError } = await query.order("start_date", {
        ascending: true,
      });

      if (fetchError) throw fetchError;

      events.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch events";
      error.value = message;
      console.error("Event fetch error:", message);
    } finally {
      loading.value = false;
    }
  };

  const fetchEvent = async (id: string): Promise<Event | null> => {
    if (!userStore.user) return null;
    if (!id || id.trim() === "" || id === "new") return null;

    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .eq("user_id", userStore.user.id)
        .single();

      if (fetchError) throw fetchError;

      return data as Event;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch event";
      error.value = message;
      console.error("Event fetch error:", message);
      return null;
    } finally {
      loading.value = false;
    }
  };

  const createEvent = async (
    eventData: Omit<Event, "id" | "created_at" | "updated_at">,
  ) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { data, error: insertError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("events") as any)
          .insert([
            {
              ...eventData,
              user_id: activeFamily.getDataOwnerUserId(),
            },
          ])
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: Event; error: any };

      if (insertError) throw insertError;

      events.value.push(data);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create event";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateEvent = async (id: string, updates: Partial<Event>) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { data, error: updateError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("events") as any)
          .update({
            ...updates,
            updated_by: userStore.user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: Event; error: any };

      if (updateError) throw updateError;

      const index = events.value.findIndex((e) => e.id === id);
      if (index !== -1) {
        events.value[index] = data;
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update event";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteEvent = async (id: string) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      events.value = events.value.filter((e) => e.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete event";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    events: computed(() => events.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchEvents,
    fetchEvent,
    createEvent,
    updateEvent,
    deleteEvent,
  };
};
