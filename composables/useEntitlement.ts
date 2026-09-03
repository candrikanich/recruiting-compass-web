import { computed, ref, watch } from "vue";
import { useSupabase } from "./useSupabase";
import { useFamilyContext } from "./useFamilyContext";
import type { Database } from "~/types/database";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useEntitlement");

type Row = Database["public"]["Tables"]["family_subscriptions"]["Row"];
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

export interface FamilySubscription {
  familyUnitId: string;
  status: SubscriptionStatus;
  source: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

const DAY_MS = 86_400_000;

const toSubscription = (row: Row): FamilySubscription => ({
  familyUnitId: row.family_unit_id,
  status: row.status,
  source: row.source,
  trialEndsAt: row.trial_ends_at,
  currentPeriodEnd: row.current_period_end,
});

/** Mirrors SQL `family_can_write` exactly. Keep in lockstep with the migration. */
export const canWriteFrom = (
  sub: FamilySubscription | null,
  now: Date = new Date(),
): boolean => {
  if (!sub) return false;
  if (sub.status === "founding" || sub.status === "active" || sub.status === "comp") {
    return true;
  }
  if (sub.status === "trialing" && sub.trialEndsAt) {
    return new Date(sub.trialEndsAt).getTime() > now.getTime();
  }
  return false;
};

export const trialDaysLeftFrom = (
  sub: FamilySubscription | null,
  now: Date = new Date(),
): number | null => {
  if (!sub || sub.status !== "trialing" || !sub.trialEndsAt) return null;
  const remaining = new Date(sub.trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / DAY_MS));
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export const planLabelFrom = (
  sub: FamilySubscription | null,
  now: Date = new Date(),
): string => {
  if (!sub) return "Plan unavailable";
  switch (sub.status) {
    case "founding":
      return "Founding Family — free for life";
    case "comp":
      return "Complimentary access";
    case "read_only":
      return "Read-only — subscription needed";
    case "trialing":
      return `Free trial — ${trialDaysLeftFrom(sub, now) ?? 0} days left`;
    case "active":
      return sub.currentPeriodEnd
        ? `Active — renews ${formatDate(sub.currentPeriodEnd)}`
        : "Active";
  }
};

export const useEntitlement = () => {
  const supabase = useSupabase();
  const { activeFamilyId } = useFamilyContext();

  const subscription = ref<FamilySubscription | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const load = async () => {
    const familyId = activeFamilyId.value;
    if (!familyId) {
      subscription.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const { data, error: fetchError } = await supabase
        .from("family_subscriptions")
        .select("*")
        .eq("family_unit_id", familyId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      subscription.value = data ? toSubscription(data as Row) : null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load plan";
      error.value = message;
      subscription.value = null;
      logger.error("[useEntitlement] load failed:", message);
    } finally {
      loading.value = false;
    }
  };

  watch(activeFamilyId, () => {
    void load();
  });

  const canWrite = computed(() => canWriteFrom(subscription.value));
  const planLabel = computed(() => planLabelFrom(subscription.value));
  const trialDaysLeft = computed(() => trialDaysLeftFrom(subscription.value));

  return { subscription, loading, error, canWrite, planLabel, trialDaysLeft, load };
};
