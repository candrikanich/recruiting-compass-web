/**
 * API Endpoint: Save or update user preferences by category
 * POST /api/user/preferences/[category]
 *
 * Updates or creates preferences for a specific category
 * Accepts JSON data to store
 */

import { defineEventHandler, readBody } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

// Validation schema for preference data
const preferencesSchema = z.object({
  data: z.record(z.unknown()).default({}),
});

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event);
  const category = event.context.params?.category;

  if (!category || typeof category !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Category parameter is required",
    });
  }

  try {
    // Validate request body
    const body = await readBody(event);
    const { data } = preferencesSchema.parse(body);

    const supabase = useSupabaseAdmin();

    // Try to update existing preferences
    const { error: fetchError } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", category)
      .single();

    let result;

    if (fetchError && fetchError.code === "PGRST116") {
      // No existing preferences - insert new
      result = await supabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          category,
          data,
        })
        .select()
        .single();
    } else if (fetchError) {
      throw fetchError;
    } else {
      // Update existing preferences
      result = await supabase
        .from("user_preferences")
        .update({
          data,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("category", category)
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    return {
      category,
      data: result.data?.data || data,
      success: true,
      updatedAt: result.data?.updated_at,
    };
  } catch (err) {
    console.error(
      `[Preferences POST] Error saving ${category} for user ${user.id}:`,
      err,
    );

    if (err instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid preference data: " + err.errors[0].message,
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to save preferences",
    });
  }
});
