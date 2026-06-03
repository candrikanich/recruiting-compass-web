import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import {
  renderWeeklyDigestEmail,
  renderDeadlineAlertEmail,
  sendEmail,
} from "~/server/utils/emailService";
import {
  generateUnsubscribeToken,
  normalizeEmail,
} from "~/server/utils/unsubscribeToken";
import { isOptedOut } from "~/server/utils/emailOptouts";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.enum(["weekly-digest", "deadline-alert"]),
  data: z.record(z.string(), z.unknown()),
});

// NOTE: This endpoint is the designated entry point for recurring (marketing-class)
// emails but currently has no internal caller — recurring sends are dormant. Kept
// wired so a future scheduler/cron can drive it. Both templates here are recurring,
// so every send is suppression-checked and carries List-Unsubscribe headers.
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "email/send");
  await requireAuth(event);

  const body = await readBody(event);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: "Invalid request" });
  }

  const { to, subject, template, data } = parsed.data;
  const normalized = normalizeEmail(to);

  if (await isOptedOut(normalized)) {
    logger.info("Recipient opted out, skipping recurring email", { template });
    return { success: true, skipped: true };
  }

  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
  const token = generateUnsubscribeToken(
    normalized,
    useRuntimeConfig().unsubscribeSecret,
  );
  const listUnsubscribeUrl = `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(
    normalized,
  )}&token=${token}`;

  const html =
    template === "weekly-digest"
      ? renderWeeklyDigestEmail(
          data as Parameters<typeof renderWeeklyDigestEmail>[0],
          listUnsubscribeUrl,
        )
      : renderDeadlineAlertEmail(
          data as Parameters<typeof renderDeadlineAlertEmail>[0],
          listUnsubscribeUrl,
        );

  const result = await sendEmail({ to, subject, html, listUnsubscribeUrl });

  if (!result.success) {
    logger.error("Resend delivery error", { error: result.error });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to send email",
    });
  }

  return { success: true };
});
