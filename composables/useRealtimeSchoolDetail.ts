import { onUnmounted, type Ref, watch } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { createClientLogger } from "~/utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

const logger = createClientLogger("RealtimeSchoolDetail");

interface UseRealtimeSchoolDetailOptions {
  onSchoolChange: () => void | Promise<void>;
  onCoachesChange: () => void | Promise<void>;
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the `schools` and
 * `coaches` tables so the school detail page updates live when data changes
 * from another device, session, or family member.
 *
 * Requires `schools` and `coaches` tables in the `supabase_realtime` publication.
 * Follows the same channel pattern as useRealtimeCoachDetail.
 * Cleans up automatically on component unmount.
 */
export function useRealtimeSchoolDetail(
  schoolId: string,
  ready: Ref<boolean>,
  { onSchoolChange, onCoachesChange }: UseRealtimeSchoolDetailOptions,
) {
  const supabase = useSupabase();
  let channel: RealtimeChannel | null = null;

  const subscribe = () => {
    unsubscribe();

    try {
      const channelName = `school-detail-${schoolId}`;
      channel = supabase.channel(channelName);

      // School record updated (name, status, notes, pros/cons, basic info, etc.)
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "schools",
          filter: `id=eq.${schoolId}`,
        },
        () => {
          logger.info("Realtime: school UPDATE detected");
          void onSchoolChange();
        },
      );

      // Coaches added/updated/removed at this school
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coaches",
          filter: `school_id=eq.${schoolId}`,
        },
        () => {
          logger.info("Realtime: coach INSERT detected");
          void onCoachesChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coaches",
          filter: `school_id=eq.${schoolId}`,
        },
        () => {
          logger.info("Realtime: coach UPDATE detected");
          void onCoachesChange();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "coaches",
          filter: `school_id=eq.${schoolId}`,
        },
        () => {
          logger.info("Realtime: coach DELETE detected");
          void onCoachesChange();
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
      logger.error("Error subscribing to school detail updates:", err);
    }
  };

  const unsubscribe = () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };

  // Subscribe once page data is loaded (ready = !isInitializing).
  // The school detail page waits for activeFamilyId then loads data;
  // subscribing before data exists would cause refetch callbacks to
  // race with the initial load.
  watch(
    ready,
    (isReady) => {
      if (isReady) {
        subscribe();
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    unsubscribe();
  });
}
