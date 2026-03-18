/**
 * Admin endpoint to broadcast notifications to all users or a single user.
 * POST /api/admin/notifications/broadcast
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 */

import { defineEventHandler, readBody, createError } from "h3"
import { z } from "zod"
import { requireAdmin } from "~/server/utils/auth"
import { useSupabaseAdmin } from "~/server/utils/supabase"
import { useLogger } from "~/server/utils/logger"

export const broadcastSchema = z.object({
  target: z.enum(["all", "user"]),
  user_id: z.string().uuid().optional(),
  type: z.enum(["follow_up_reminder", "deadline_alert", "weekly_digest", "event"]),
  title: z.string().min(1).max(200),
  message: z.string().max(1000).optional(),
})

export type BroadcastInput = z.infer<typeof broadcastSchema>

interface BroadcastResponse {
  success: true
  sent: number
}

export default defineEventHandler(async (event): Promise<BroadcastResponse> => {
  const logger = useLogger(event, "admin/notifications/broadcast")

  await requireAdmin(event)

  const body = await readBody(event)
  const parsed = broadcastSchema.safeParse(body)

  if (!parsed.success) {
    logger.error("Broadcast validation failed", { issues: parsed.error.issues })
    throw createError({
      statusCode: 422,
      statusMessage: "Validation error",
    })
  }

  const { target, user_id, type, title, message } = parsed.data

  if (target === "user" && !user_id) {
    logger.error("Missing user_id for user target")
    throw createError({
      statusCode: 422,
      statusMessage: "Missing required field",
    })
  }

  const supabase = useSupabaseAdmin()

  let userIds: string[]

  if (target === "all") {
    const { data, error } = await supabase.from("users").select("id")
    if (error) {
      logger.error("Failed to fetch users for broadcast", error)
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch users" })
    }
    userIds = (data ?? []).map((row: { id: string }) => row.id)
  } else {
    userIds = [user_id!]
  }

  const scheduledFor = new Date().toISOString()
  const rows = userIds.map((uid) => ({
    user_id: uid,
    type,
    title,
    message: message ?? null,
    priority: "normal",
    scheduled_for: scheduledFor,
  }))

  const BATCH_SIZE = 500
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from("notifications").insert(batch)
    if (error) {
      logger.error("Failed to insert broadcast batch", error)
      throw createError({ statusCode: 500, statusMessage: "Failed to send broadcast" })
    }
  }

  logger.info(`Admin broadcast sent: type=${type}, target=${target}, recipients=${userIds.length}`)

  return { success: true, sent: userIds.length }
})
