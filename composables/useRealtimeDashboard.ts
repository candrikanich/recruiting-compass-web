import { onUnmounted, type Ref, watch } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { createClientLogger } from "~/utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

const logger = createClientLogger("RealtimeDashboard");

interface UseRealtimeDashboardOptions {
  onDashboardChange: () => void | Promise<void>;
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the `schools` and
 * `interactions` tables so the dashboard updates live when data changes
 * from another device, session, or family member.
 *
 * Both tables filter by family_unit_id — coaches don't carry that column
 * so coach-only edits are covered by the coach detail page's own Realtime
 * subscription. The dashboard's refreshDashboard() re-fetches all 6 entity
 * types regardless of which table fired, so a school or interaction change
 * also refreshes coaches, offers, events, and metrics.
 *
 * Requires `schools` and `interactions` in the `supabase_realtime` publication.
 * Cleans up automatically on component unmount.
 */
export function useRealtimeDashboard(
  familyUnitId: Ref<string | null>,
  { onDashboardChange }: UseRealtimeDashboardOptions,
) {
  const supabase = useSupabase();
  let channel: RealtimeChannel | null = null;

  const subscribe = (id: string) => {
    unsubscribe();

    try {
      const channelName = `dashboard-${id}`;
      channel = supabase.channel(channelName);

      // Schools added/updated/removed
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "schools",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: school INSERT detected");
          void onDashboardChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "schools",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: school UPDATE detected");
          void onDashboardChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "schools",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: school DELETE detected");
          void onDashboardChange();
        },
      );

      // Interactions added/updated/removed
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interactions",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: interaction INSERT detected");
          void onDashboardChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "interactions",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: interaction UPDATE detected");
          void onDashboardChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "interactions",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: interaction DELETE detected");
          void onDashboardChange();
        },
      );

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logger.info(`Realtime: subscribed to ${channelName}`);
        } else if (status === "CHANNEL_ERROR") {
          logger.error(`Realtime: channel error on ${channelName}`);
        }
      });
    } catch (err) {
      logger.error("Error subscribing to dashboard updates:", err);
    }
  };

  const unsubscribe = () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };

  watch(
    familyUnitId,
    (id) => {
      if (id) {
        subscribe(id);
      } else {
        unsubscribe();
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    unsubscribe();
  });
}
