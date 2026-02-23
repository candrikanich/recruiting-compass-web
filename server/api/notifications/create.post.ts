/**
 * POST /api/notifications/create
 * Create a notification for a user
 * CSRF protection disabled: endpoint requires authentication via requireAuth()
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";

const createNotificationSchema = z.object({
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  message: z.string().max(1000).optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("low"),
  action_url: z.string().url().optional().or(z.literal("")),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "notifications/create");
  try {
    const user = await requireAuth(event);

    const body = await readBody(event);
    const parsed = createNotificationSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({ statusCode: 400, statusMessage: "Invalid request body" });
    }
    const { type, title, message, priority, action_url } = parsed.data;

    const supabase = createServerSupabaseClient();

    // Create notification
    const { data, error } =
      (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("notifications") as any).insert([
        {
          user_id: user.id,
          type,
          title,
          message: message || null,
          priority,
          action_url: action_url || null,
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
