import { onUnmounted, type Ref, watch } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { createClientLogger } from "~/utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

const logger = createClientLogger("RealtimeTasksList");

interface UseRealtimeTasksListOptions {
  onTaskChange: () => void | Promise<void>;
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the `athlete_task`
 * table so the tasks page updates live when task completion status changes
 * from another device, session, or family member.
 *
 * Filters by athlete_id — covers both athlete self-view and parent viewing
 * a specific child's tasks.
 * Requires `athlete_task` table in the `supabase_realtime` publication
 * (added in migration 20260921000000).
 * Cleans up automatically on component unmount.
 */
export function useRealtimeTasksList(
  athleteId: Ref<string | null>,
  { onTaskChange }: UseRealtimeTasksListOptions,
) {
  const supabase = useSupabase();
  let channel: RealtimeChannel | null = null;

  const subscribe = (id: string) => {
    unsubscribe();

    try {
      const channelName = `tasks-list-${id}`;
      channel = supabase.channel(channelName);

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "athlete_task",
          filter: `athlete_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: athlete_task INSERT detected");
          void onTaskChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "athlete_task",
          filter: `athlete_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: athlete_task UPDATE detected");
          void onTaskChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "athlete_task",
          filter: `athlete_id=eq.${id}`,
        },
        () => {
          logger.info("Realtime: athlete_task DELETE detected");
          void onTaskChange();
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
      logger.error("Error subscribing to tasks list updates:", err);
    }
  };

  const unsubscribe = () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };

  watch(
    athleteId,
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
