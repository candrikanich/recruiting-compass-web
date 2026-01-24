/**
 * GET /api/athlete-tasks
 * Fetch current athlete's task statuses
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import type { AthleteTask } from "~/types/timeline";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("athlete_task")
      .select("*")
      .eq("athlete_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching athlete tasks:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks",
      });
    }

    return data as AthleteTask[];
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    console.error("Error in GET /api/athlete-tasks:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch athlete tasks",
    });
  }
});
