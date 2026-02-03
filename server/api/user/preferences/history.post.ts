/**
 * API Endpoint: Record preference change in history
 * POST /api/user/preferences/history
 *
 * Records a preference change in the preference_history table
 * for audit trail and change tracking purposes
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

const historySchema = z.object({
  category: z.string(),
  old_value: z.unknown().optional(),
  new_value: z.unknown().optional(),
  changed_fields: z.array(z.string()).default([]),
});

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event);

  try {
    // Validate request body
    const body = await readBody(event);
    const { category, old_value, new_value, changed_fields } =
      historySchema.parse(body);

    const supabase = useSupabaseAdmin();

    // Insert history record
    const response = await supabase
      .from("preference_history")
      .insert({
        user_id: user.id,
        category,
        old_value,
        new_value,
        changed_fields,
        changed_by: user.id,
      } as Database["public"]["Tables"]["preference_history"]["Insert"])
      .select()
      .single();

    const { data, error } = response as {
      data: Database["public"]["Tables"]["preference_history"]["Row"] | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    if (error) {
      throw error;
    }

    return {
      success: true,
      history_id: data?.id,
      created_at: data?.created_at,
    };
  } catch (err) {
    console.error(
      `[Preferences History POST] Error recording history for user ${user.id}:`,
      err,
    );

    if (err instanceof z.ZodError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = (err as any).errors as Array<{ message: string }>;
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid history data: " + errors[0]?.message,
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to record preference history",
    });
  }
});
