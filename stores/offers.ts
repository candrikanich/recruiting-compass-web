import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { Offer } from "~/types/models";
import { createClientLogger } from "~/utils/logger";
import { useSupabase } from "~/composables/useSupabase";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useUserStore } from "./user";
import { offerSchema } from "~/utils/validation/schemas";

const logger = createClientLogger("stores/offers");

export const OFFERS_PAGE_SIZE = 100;
export const OFFERS_SOFT_WARN_THRESHOLD = 25;

export const useOffersStore = defineStore("offers", () => {
  // Capture the family context at store setup so all actions share the
  // same instance the host page is using (via inject from app.vue). Calling
  // useFamilyCtx() from inside an action returns a fresh, uninitialised
  // singleton because Pinia actions don't run in component setup context.
  const activeFamily = useFamilyCtx();

  const offers = ref<Offer[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  const totalCount = ref(0);
  const currentPage = ref(0);

  const acceptedOffers = computed(() =>
    offers.value.filter((o) => o.status === "accepted"),
  );
  const pendingOffers = computed(() =>
    offers.value.filter((o) => o.status === "pending"),
  );
  const declinedOffers = computed(() =>
    offers.value.filter((o) => o.status === "declined"),
  );

  const hasMore = computed(
    () => totalCount.value > offers.value.length,
  );

  const softWarnVisible = computed(
    () => totalCount.value >= OFFERS_SOFT_WARN_THRESHOLD,
  );

  function upsertLocal(offer: Offer) {
    const index = offers.value.findIndex((o) => o.id === offer.id);
    if (index === -1) {
      offers.value.push(offer);
    } else {
      offers.value[index] = offer;
    }
  }

  async function fetchPage(page: number) {
    const userStore = useUserStore();
    if (!userStore.user) return;
    const familyId = activeFamily.activeFamilyId.value;
    if (!familyId) {
      logger.debug("No family context, skipping fetch");
      return;
    }

    const supabase = useSupabase();
    const from = page * OFFERS_PAGE_SIZE;
    const to = from + OFFERS_PAGE_SIZE - 1;

    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError, count } = await supabase
        .from("offers")
        .select("*", { count: "exact" })
        .eq("family_unit_id", familyId)
        .order("offer_date", { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as Offer[];
      if (page === 0) {
        offers.value = rows;
      } else {
        offers.value = [...offers.value, ...rows];
      }
      if (typeof count === "number") {
        totalCount.value = count;
      }
      currentPage.value = page;
      isFetched.value = true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch offers";
      error.value = message;
      logger.error("Offer fetch error", message);
    } finally {
      loading.value = false;
    }
  }

  async function fetchOffers(options: { force?: boolean } = {}) {
    if (isFetched.value && !options.force) return;
    await fetchPage(0);
  }

  async function loadMore() {
    if (!hasMore.value || loading.value) return;
    await fetchPage(currentPage.value + 1);
  }

  async function getOffer(id: string): Promise<Offer | null> {
    const userStore = useUserStore();
    if (!userStore.user) return null;
    const cached = offers.value.find((o) => o.id === id);
    if (cached) return cached;

    const supabase = useSupabase();
    try {
      const { data, error: queryError } = await supabase
        .from("offers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (queryError) throw queryError;
      const offer = (data as Offer | null) ?? null;
      if (offer) upsertLocal(offer);
      return offer;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch offer";
      logger.error("getOffer error", message);
      return null;
    }
  }

  async function createOffer(
    offerData: Omit<Offer, "id" | "created_at" | "updated_at">,
  ): Promise<Offer> {
    const userStore = useUserStore();
    if (!userStore.user) throw new Error("User not authenticated");
    if (!activeFamily.activeFamilyId.value) {
      throw new Error("Family context not loaded");
    }
    const dataOwnerUserId = activeFamily.getDataOwnerUserId();
    if (!dataOwnerUserId) {
      throw new Error("Athlete context not set");
    }

    loading.value = true;
    error.value = null;

    try {
      const validated = await offerSchema.parseAsync(offerData);
      const supabase = useSupabase();

      const { data, error: insertError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("offers") as any)
          .insert([
            {
              ...validated,
              user_id: dataOwnerUserId,
              family_unit_id: activeFamily.activeFamilyId.value,
            },
          ])
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: Offer; error: any };

      if (insertError) throw insertError;

      offers.value.unshift(data);
      totalCount.value += 1;

      const { $posthog } = useNuxtApp();
      $posthog?.capture("offer_added", { status: data.status ?? null });

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create offer";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateOffer(
    id: string,
    updates: Partial<Offer>,
  ): Promise<Offer> {
    const userStore = useUserStore();
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const supabase = useSupabase();
      const { data, error: updateError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("offers") as any)
          .update(updates)
          .eq("id", id)
          .eq("family_unit_id", activeFamily.activeFamilyId.value)
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: Offer; error: any };

      if (updateError) throw updateError;

      const index = offers.value.findIndex((o) => o.id === id);
      if (index !== -1) {
        offers.value[index] = data;
      } else {
        offers.value.push(data);
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
  }

  async function deleteOffer(id: string): Promise<void> {
    const userStore = useUserStore();
    if (!userStore.user) throw new Error("User not authenticated");
    if (!activeFamily.activeFamilyId.value) {
      throw new Error("No active family");
    }

    loading.value = true;
    error.value = null;

    try {
      const supabase = useSupabase();
      const { error: deleteError } = await supabase
        .from("offers")
        .delete()
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value);

      if (deleteError) throw deleteError;

      const before = offers.value.length;
      offers.value = offers.value.filter((o) => o.id !== id);
      if (offers.value.length < before) {
        totalCount.value = Math.max(0, totalCount.value - 1);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete offer";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function daysUntilDeadline(offer: Offer): number | null {
    if (!offer.deadline_date) return null;
    const now = new Date();
    const deadline = new Date(offer.deadline_date);
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function reset() {
    offers.value = [];
    isFetched.value = false;
    totalCount.value = 0;
    currentPage.value = 0;
    loading.value = false;
    error.value = null;
  }

  return {
    offers,
    loading,
    error,
    isFetched,
    totalCount,
    currentPage,
    acceptedOffers,
    pendingOffers,
    declinedOffers,
    hasMore,
    softWarnVisible,
    fetchOffers,
    loadMore,
    getOffer,
    createOffer,
    updateOffer,
    deleteOffer,
    daysUntilDeadline,
    reset,
  };
});
