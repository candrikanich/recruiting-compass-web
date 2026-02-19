/**
 * POST /api/notifications/create
 * Create a notification for a user
 * CSRF protection disabled: endpoint requires authentication via requireAuth()
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "notifications/create");
  try {
    const user = await requireAuth(event);

    const body = await readBody<{
      type: string;
      title: string;
      message?: string;
      priority?: "low" | "medium" | "high";
      action_url?: string;
    }>(event);

    if (!body.type || !body.title) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields: type, title",
      });
    }

    const supabase = createServerSupabaseClient();

    // Create notification
    const { data, error } =
      (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("notifications") as any).insert([
        {
          user_id: user.id,
          type: body.type,
          title: body.title,
          message: body.message || null,
          priority: body.priority || "medium",
          action_url: body.action_url || null,
          scheduled_for: new Date().toISOString(),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ])) as any;

    if (error) {
      logger.error("Failed to insert notification", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create notification",
      });
    }

    return {
      success: true,
      notification: data,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to create notification", err);

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create notification",
    });
  }
});
