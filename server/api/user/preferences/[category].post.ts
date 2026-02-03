/**
 * API Endpoint: Save or update user preferences by category
 * POST /api/user/preferences/[category]
 *
 * Updates or creates preferences for a specific category
 * Accepts JSON data to store
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

// Validation schema for preference data
const preferencesSchema = z.object({
  data: z.record(z.string(), z.unknown()),
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
    const body = await readBody<{ data: Record<string, unknown> }>(event);
    const { data } = preferencesSchema.parse(body);

    const supabase = useSupabaseAdmin();

    // Try to update existing preferences
    const fetchResponse = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", category)
      .single();

    const { error: fetchError } = fetchResponse as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    let result;

    if (fetchError && fetchError.code === "PGRST116") {
      // No existing preferences - insert new
      const insertResponse = await supabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          category,
          data: data as Database["public"]["Tables"]["user_preferences"]["Insert"]["data"],
        })
        .select()
        .single();

      result = insertResponse as {
        data: Database["public"]["Tables"]["user_preferences"]["Row"] | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };
    } else if (fetchError) {
      throw fetchError;
    } else {
      // Update existing preferences
      const updateResponse = await supabase
        .from("user_preferences")
        .update({
          data: data as Database["public"]["Tables"]["user_preferences"]["Update"]["data"],

          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("category", category)
        .select()
        .single();

      result = updateResponse as {
        data: Database["public"]["Tables"]["user_preferences"]["Row"] | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = (err as any).errors as Array<{ message: string }>;
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid preference data: " + errors[0]?.message,
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to save preferences",
    });
  }
});
