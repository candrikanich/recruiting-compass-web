import type { SupabaseClient } from "@supabase/supabase-js";
import type { Interaction } from "~/types/models";
import type { Database } from "~/types/database";

type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

/**
 * Create notification for inbound interactions
 */
export const createInboundInteractionAlert = async ({
  interaction,
  userId,
  supabase,
}: {
  interaction: Interaction;
  userId: string;
  supabase: SupabaseClient;
}): Promise<void> => {
  if (interaction.direction !== "inbound") return;

  try {
    // Parallelize preference and coach queries with fallback handling
    const [prefsRes, coachRes] = await Promise.allSettled([
      supabase
        .from("user_preferences")
        .select("notification_settings")
        .eq("user_id", userId)
        .single(),
      interaction.coach_id
        ? supabase
            .from("coaches")
            .select("first_name, last_name")
            .eq("id", interaction.coach_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    // Extract results safely
    const prefs =
      prefsRes.status === "fulfilled" ? prefsRes.value.data : null;
    const coach =
      coachRes.status === "fulfilled" ? coachRes.value.data : null;

    // Log warnings for failed queries (don't cascade)
    if (prefsRes.status === "rejected") {
      console.warn("Failed to fetch user preferences:", prefsRes.reason);
    }
    if (coachRes.status === "rejected") {
      console.warn("Failed to fetch coach data:", coachRes.reason);
    }

    if (prefs?.notification_settings?.enableInboundInteractionAlerts) {
      // Get coach name for notification
      let coachName = "A coach";
      if (coach) {
        coachName = `${coach.first_name} ${coach.last_name}`.trim();
      }

      // Create notification
      await supabase.from("notifications").insert([
        {
          user_id: userId,
          type: "inbound_interaction",
          title: `New Contact from ${coachName}`,
          message: `${coachName} reached out via ${interaction.type}. View the interaction to see details.`,
          related_entity_type: "interaction",
          related_entity_id: interaction.id,
          scheduled_for: new Date().toISOString(),
        },
      ] as NotificationInsert[]);
    }
  } catch (err) {
    console.error("Failed to create inbound interaction alert:", err);
    // Don't throw - this shouldn't block interaction creation
  }
};
