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
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("email/recurring");

export type RecurringTemplate = "weekly-digest" | "deadline-alert";

export interface RecurringEmailParams {
  to: string;
  subject: string;
  template: RecurringTemplate;
  data: Record<string, unknown>;
  idempotencyKey?: string;
  /** Overrides `useRuntimeConfig().unsubscribeSecret` for callers outside a request context. */
  unsubscribeSecret: string;
}

export interface RecurringEmailResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Shared entry point for recurring (marketing-class) emails: weekly digests and
 * deadline alerts. Every send is suppression-checked against the opt-out list
 * and carries a one-click List-Unsubscribe URL, satisfying CAN-SPAM for
 * non-transactional mail. Both `send.post.ts` and the notification crons route
 * through here so there is a single audited path.
 */
export async function sendRecurringEmail(
  params: RecurringEmailParams,
): Promise<RecurringEmailResult> {
  const { to, subject, template, data, idempotencyKey, unsubscribeSecret } =
    params;
  const normalized = normalizeEmail(to);

  if (await isOptedOut(normalized)) {
    logger.info("Recipient opted out, skipping recurring email", { template });
    return { success: true, skipped: true };
  }

  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
  const token = generateUnsubscribeToken(normalized, unsubscribeSecret);
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

  return sendEmail({ to, subject, html, listUnsubscribeUrl, idempotencyKey });
}
