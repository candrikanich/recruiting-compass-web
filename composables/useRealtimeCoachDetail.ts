import { onUnmounted, type Ref, watch } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { createClientLogger } from "~/utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

const logger = createClientLogger("RealtimeCoachDetail");

interface UseRealtimeCoachDetailOptions {
  coachId: string;
  schoolId: Ref<string | null>;
  onInteractionChange: () => void | Promise<void>;
  onCoachChange: () => void | Promise<void>;
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the `interactions` and
 * `coaches` tables so the coach detail page updates live when data changes
 * from another device, session, or family member.
 *
 * Follows the same channel pattern as useActivityFeed's subscribeToUpdates().
 * Cleans up automatically on component unmount.
 */
export function useRealtimeCoachDetail({
  coachId,
  schoolId,
  onInteractionChange,
  onCoachChange,
}: UseRealtimeCoachDetailOptions) {
  const supabase = useSupabase();
  let channel: RealtimeChannel | null = null;

  const subscribe = (resolvedSchoolId: string | null) => {
    unsubscribe();

    if (!resolvedSchoolId) return;

    try {
      const channelName = `coach-detail-${coachId}`;
      channel = supabase.channel(channelName);

      // New or updated interactions for this school → refetch interactions list.
      // INSERT covers new logs; UPDATE covers edits (sentiment, notes, etc.).
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interactions",
          filter: `school_id=eq.${resolvedSchoolId}`,
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
          filter: `school_id=eq.${resolvedSchoolId}`,
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
          filter: `school_id=eq.${resolvedSchoolId}`,
        },
        () => {
          logger.info("Realtime: interaction DELETE detected");
          void onInteractionChange();
        },
      );

      // Coach record updated (tags, notes, role, contact info, etc.)
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coaches",
          filter: `id=eq.${coachId}`,
        },
        () => {
          logger.info("Realtime: coach UPDATE detected");
          void onCoachChange();
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
      logger.error("Error subscribing to coach detail updates:", err);
    }
  };

  const unsubscribe = () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };

  // Subscribe when schoolId becomes available (it's async-loaded on mount).
  // Re-subscribe if it changes (edge case: coach reassigned to different school).
  watch(
    schoolId,
    (newId) => {
      subscribe(newId);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    unsubscribe();
  });
}
