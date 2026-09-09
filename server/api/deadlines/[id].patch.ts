/**
 * PATCH /api/deadlines/:id
 * Update a deadline owned by the authenticated user's family
 * Body: partial { label, deadline_date, category, school_id }
 */

import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { updateDeadlineSchema } from "~/utils/validation/schemas";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "deadlines/update");
  try {
    const user = await requireAuth(event);
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing deadline id",
      });
    }

    const body = await readBody(event);
    const parsed = updateDeadlineSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: "Invalid request body",
      });
    }

    const supabase = createServerSupabaseClient();

    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", user.id)
      .single();

    if (!membership?.family_unit_id) {
      throw createError({
        statusCode: 500,
        statusMessage: "No family membership found",
      });
    }

    // Verify ownership before updating — RLS is the authoritative guard but we
    // return a 404 (not 403) to avoid leaking whether the row exists.
    const { data: existing, error: fetchError } = await supabase
      .from("user_deadlines")
      .select("id")
      .eq("id", id)
      .eq("family_unit_id", membership.family_unit_id)
      .maybeSingle();

    if (fetchError) {
      logger.error("Failed to verify deadline ownership", fetchError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update deadline",
      });
    }

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Deadline not found",
      });
    }

    const { data, error } = await supabase
      .from("user_deadlines")
      .update(parsed.data)
      .eq("id", id)
      .eq("family_unit_id", membership.family_unit_id)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update deadline", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update deadline",
      });
    }

    return { success: true, deadline: data };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error updating deadline", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update deadline",
    });
  }
});
