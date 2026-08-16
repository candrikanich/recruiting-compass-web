/**
 * POST /api/notifications/email
 *
 * Internal service endpoint. The Supabase `send-push-notification` edge function
 * calls this after a notification row is created, to also deliver the
 * notification by email via Resend (reusing `sendNotificationEmail`). Per-type
 * email gating (`notification_preferences.email_enabled`) and recipient lookup
 * are done by the caller; this route just renders + sends.
 *
 * Security: shared CRON_SECRET as "Authorization: Bearer <secret>" (Vercel-cron
 * convention), or "x-cron-secret: <secret>" for manual callers.
 */

import { defineEventHandler, readBody, createError, getHeader } from "h3";
import { z } from "zod";
import { createLogger } from "~/server/utils/logger";
import { verifySharedSecret } from "~/server/utils/secrets";
import { sendNotificationEmail } from "~/server/utils/emailService";

const logger = createLogger("notifications/email");

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  actionUrl: z.string().url().optional(),
  idempotencyKey: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, "authorization");
  const altHeader = getHeader(event, "x-cron-secret");
  const secret = process.env.CRON_SECRET;
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  const isAuthorized =
    secret &&
    ((bearer && verifySharedSecret(bearer, secret)) ||
      (altHeader && verifySharedSecret(altHeader, secret)));

  if (!isAuthorized) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const parsed = schema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: "Invalid request" });
  }

  const { to, subject, title, message, priority, actionUrl, idempotencyKey } =
    parsed.data;

  const result = await sendNotificationEmail({
    to,
    subject,
    title,
    message,
    priority,
    actionUrl,
    idempotencyKey,
  });

  if (!result.success) {
    logger.error("Notification email delivery failed", { error: result.error });
    throw createError({
      statusCode: 502,
      statusMessage: "Email delivery failed",
    });
  }

  return { success: true, messageId: result.messageId };
});
