/**
 * POST /api/notifications/create
 * Create a notification for a user
 * CSRF protection disabled: endpoint requires authentication via requireAuth()
 */

import { createServerSupabaseClient } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  try {
    await requireAuth(event);

    const body = await readBody<{
      user_id: string;
      type: string;
      title: string;
      message?: string;
      priority?: "low" | "medium" | "high";
      action_url?: string;
    }>(event);

    if (!body.user_id || !body.type || !body.title) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields: user_id, type, title",
      });
    }

    const supabase = createServerSupabaseClient();

    // Create notification
    const { data, error } = await supabase.from("notifications").insert([
      {
        user_id: body.user_id,
        type: body.type,
        title: body.title,
        message: body.message || null,
        priority: body.priority || "medium",
        action_url: body.action_url || null,
        scheduled_for: new Date().toISOString(),
      },
    ]);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      });
    }

    return {
      success: true,
      notification: data,
    };
  } catch (err) {
    console.error("Error in POST /api/notifications/create:", err);

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create notification",
    });
  }
});
