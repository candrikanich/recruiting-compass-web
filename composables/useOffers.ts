import { ref, computed, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { Offer } from "~/types/models";

/**
 * useOffers composable
 * Manages scholarship offers and decision tracking
 *
 * Offer types:
 * - full_ride: 100% scholarship coverage
 * - partial: Partial scholarship (percentage-based)
 * - scholarship: Named scholarship award
 * - recruited_walk_on: Walk-on with recruitment guarantee
 * - preferred_walk_on: Preferred walk-on status
 *
 * Status tracking:
 * - pending: Offer received, decision pending
 * - accepted: Offer accepted by player
 * - declined: Offer declined by player
 * - expired: Deadline passed without response
 *
 * Features:
 * - Track scholarship amounts and percentages
 * - Manage offer deadlines
 * - Compare multiple offers
 * - Calculate total scholarship value
 */
export const useOffers = (): {
  offers: ComputedRef<Offer[]>;
  acceptedOffers: ComputedRef<Offer[]>;
  pendingOffers: ComputedRef<Offer[]>;
  declinedOffers: ComputedRef<Offer[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  fetchOffers: (filters?: {
    status?: string;
    schoolId?: string;
  }) => Promise<void>;
  createOffer: (
    offerData: Omit<Offer, "id" | "created_at" | "updated_at">,
  ) => Promise<Offer>;
  updateOffer: (id: string, updates: Partial<Offer>) => Promise<Offer>;
  deleteOffer: (id: string) => Promise<void>;
  daysUntilDeadline: (offer: Offer) => number | null;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const offers = ref<Offer[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchOffers = async (filters?: {
    status?: string;
    schoolId?: string;
  }) => {
    if (!userStore.user) return;

    loading.value = true;
    error.value = null;

    try {
      let query = supabase
        .from("offers")
        .select("*")
        .eq("user_id", userStore.user.id);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.schoolId) {
        query = query.eq("school_id", filters.schoolId);
      }

      const { data, error: fetchError } = await query.order("offer_date", {
        ascending: false,
      });

      if (fetchError) throw fetchError;

      offers.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch offers";
      error.value = message;
      console.error("Offer fetch error:", message);
    } finally {
      loading.value = false;
    }
  };

  const createOffer = async (
    offerData: Omit<Offer, "id" | "created_at" | "updated_at">,
  ) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { data, error: insertError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("offers") as any)
          .insert([
            {
              ...offerData,
              user_id: userStore.user.id,
            },
          ])
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: Offer; error: any };

      if (insertError) throw insertError;

      offers.value.unshift(data);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create offer";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateOffer = async (id: string, updates: Partial<Offer>) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { data, error: updateError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("offers") as any)
          .update(updates)
          .eq("id", id)
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: Offer; error: any };

      if (updateError) throw updateError;

      const index = offers.value.findIndex((o) => o.id === id);
      if (index !== -1) {
        offers.value[index] = data;
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update offer";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteOffer = async (id: string) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("offers")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      offers.value = offers.value.filter((o) => o.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete offer";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const acceptedOffers = computed(() =>
    offers.value.filter((o) => o.status === "accepted"),
  );
  const pendingOffers = computed(() =>
    offers.value.filter((o) => o.status === "pending"),
  );
  const declinedOffers = computed(() =>
    offers.value.filter((o) => o.status === "declined"),
  );

  const daysUntilDeadline = (offer: Offer): number | null => {
    if (!offer.deadline_date) return null;
    const now = new Date();
    const deadline = new Date(offer.deadline_date);
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return {
    offers: computed(() => offers.value),
    acceptedOffers,
    pendingOffers,
    declinedOffers,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchOffers,
    createOffer,
    updateOffer,
    deleteOffer,
    daysUntilDeadline,
  };
};
