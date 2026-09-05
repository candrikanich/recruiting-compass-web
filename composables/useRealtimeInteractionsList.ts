import { onUnmounted, type Ref, watch } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { createClientLogger } from "~/utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

const logger = createClientLogger("RealtimeInteractionsList");

interface UseRealtimeInteractionsListOptions {
  onInteractionChange: () => void | Promise<void>;
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the `interactions`
 * table so the interactions list page updates live when data changes
 * from another device, session, or family member.
 *
 * Filters by family_unit_id — covers both athlete and parent views.
 * Requires `interactions` table in the `supabase_realtime` publication
 * (added in migration 20260919000000).
 * Cleans up automatically on component unmount.
 */
export function useRealtimeInteractionsList(
  familyUnitId: Ref<string | null>,
  { onInteractionChange }: UseRealtimeInteractionsListOptions,
) {
  const supabase = useSupabase();
  let channel: RealtimeChannel | null = null;

  const subscribe = (id: string) => {
    unsubscribe();

    try {
      const channelName = `interactions-list-${id}`;
      channel = supabase.channel(channelName);

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
          void onInteractionChange();
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
          void onInteractionChange();
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
          void onInteractionChange();
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
      logger.error("Error subscribing to interactions list updates:", err);
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
