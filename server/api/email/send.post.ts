import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import {
  renderWeeklyDigestEmail,
  renderDeadlineAlertEmail,
  sendEmail,
} from "~/server/utils/emailService";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.enum(["weekly-digest", "deadline-alert"]),
  data: z.record(z.string(), z.unknown()),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "email/send");
  await requireAuth(event);

  const body = await readBody(event);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: "Invalid request" });
  }

  const { to, subject, template, data } = parsed.data;
  const html =
    template === "weekly-digest"
      ? renderWeeklyDigestEmail(
          data as Parameters<typeof renderWeeklyDigestEmail>[0],
        )
      : renderDeadlineAlertEmail(
          data as Parameters<typeof renderDeadlineAlertEmail>[0],
        );

  const result = await sendEmail({ to, subject, html });

  if (!result.success) {
    logger.error("Resend delivery error", { error: result.error });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to send email",
    });
  }

  return { success: true };
});
