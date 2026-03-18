/**
 * DELETE /api/deadlines/:id
 * Delete a deadline owned by the authenticated user
 */

import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "deadlines/delete");
  try {
    const user = await requireAuth(event);
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: "Missing deadline id" });
    }

    const supabase = createServerSupabaseClient();

    // Verify ownership before deleting — RLS is the authoritative guard but we
    // return a 404 (not 403) to avoid leaking whether the row exists.
    const { data: existing, error: fetchError } = await (supabase
      .from("user_deadlines") as any)
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      logger.error("Failed to verify deadline ownership", fetchError);
      throw createError({ statusCode: 500, statusMessage: "Failed to delete deadline" });
    }

    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: "Deadline not found" });
    }

    const { error: deleteError } = await (supabase
      .from("user_deadlines") as any)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      logger.error("Failed to delete deadline", deleteError);
      throw createError({ statusCode: 500, statusMessage: "Failed to delete deadline" });
    }

    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error deleting deadline", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to delete deadline" });
  }
});
