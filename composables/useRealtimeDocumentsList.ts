import { onUnmounted, type Ref, watch } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { createClientLogger } from "~/utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

const logger = createClientLogger("RealtimeDocumentsList");

interface UseRealtimeDocumentsListOptions {
  onDocumentChange: () => void | Promise<void>;
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the `documents`
 * table so the documents page updates live when data changes from
 * another device, session, or family member.
 *
 * Filters by family_unit_id — broader than the read query (which uses
 * user_id) but ensures the page catches changes from any family member.
 * The refetch callback re-queries with the composable's own user_id filter.
 *
 * Requires `documents` table in the `supabase_realtime` publication
 * (added in migration 20260922000000).
 * Cleans up automatically on component unmount.
 */
export function useRealtimeDocumentsList(
  familyUnitId: Ref<string | null>,
  { onDocumentChange }: UseRealtimeDocumentsListOptions,
) {
  const supabase = useSupabase();
  let channel: RealtimeChannel | null = null;

  const subscribe = (id: string) => {
    unsubscribe();

    try {
      const channelName = `documents-list-${id}`;
      channel = supabase.channel(channelName);

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "documents",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: document INSERT detected");
          void onDocumentChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "documents",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: document UPDATE detected");
          void onDocumentChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "documents",
          filter: `family_unit_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: document DELETE detected");
          void onDocumentChange();
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
      logger.error("Error subscribing to documents list updates:", err);
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
