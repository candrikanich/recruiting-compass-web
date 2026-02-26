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
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

const ALLOWED_CATEGORIES = [
  "notifications",
  "location",
  "player",
  "school",
  "dashboard",
] as const;

// Validation schema for preference data
const preferencesSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "user/preferences");
  // Require authentication
  const user = await requireAuth(event);
  const category = event.context.params?.category;

  if (!category || typeof category !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Category parameter is required",
    });
  }

  if (!ALLOWED_CATEGORIES.includes(category as (typeof ALLOWED_CATEGORIES)[number])) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid category",
    });
  }

  try {
    // Validate request body
    const body = await readBody<{ data: Record<string, unknown> }>(event);
    const { data } = preferencesSchema.parse(body);

    const supabase = useSupabaseAdmin();

    const result = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          category,
          data: data as Database["public"]["Tables"]["user_preferences"]["Insert"]["data"],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,category" },
      )
      .select()
      .single() as {
      data: Database["public"]["Tables"]["user_preferences"]["Row"] | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

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
    if (err instanceof Error && "statusCode" in err) throw err;

    if (err instanceof z.ZodError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = (err as any).errors as Array<{ message: string }>;
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid preference data: " + errors[0]?.message,
      });
    }

    logger.error("Error saving preferences", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to save preferences",
    });
  }
});
