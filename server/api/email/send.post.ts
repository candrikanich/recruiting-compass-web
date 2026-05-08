import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import {
  renderWeeklyDigestEmail,
  renderDeadlineAlertEmail,
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

  const { resendApiKey } = useRuntimeConfig();
  if (!resendApiKey) {
    logger.error("RESEND_API_KEY not configured");
    throw createError({
      statusCode: 500,
      statusMessage: "Service configuration error",
    });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Recruiting Compass <notifications@recruitingcompass.com>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      logger.error("Resend delivery error", errorData);
    } catch {
      const textError = await response.text().catch(() => "Unknown error");
      logger.error("Resend delivery error (non-JSON)", {
        status: response.status,
        body: textError,
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to send email",
    });
  }

  return { success: true };
});
