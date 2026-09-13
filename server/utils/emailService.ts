import { Resend } from "resend";
import * as Sentry from "@sentry/nuxt";
import type { NotificationPriority } from "~/types/models";
import { createLogger } from "~/server/utils/logger";
import { retryWithBackoff } from "~/server/utils/retry";
import { logEmailSend, type EmailSendContext } from "~/server/utils/emailSends";
import { shouldCaptureInSentry } from "~/server/utils/sentryContext";
import { wrapEmailLayout } from "~/server/utils/emailTemplates";

const logger = createLogger("email");

const DEFAULT_FROM = "The Recruiting Compass <info@therecruitingcompass.com>";
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;
const SEND_TIMEOUT_MS = 10_000;

const fromAddress = (): string => process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;

let client: Resend | null = null;
let missingKeyCaptured = false;

// Loud, but only once per process — every send with a missing key would
// otherwise spam Sentry (invites, notifications, feedback all call in).
function reportMissingApiKey(): void {
  logger.error("RESEND_API_KEY not configured, email notifications disabled");
  if (!missingKeyCaptured && shouldCaptureInSentry()) {
    missingKeyCaptured = true;
    Sentry.captureMessage(
      "RESEND_API_KEY missing at send time — emails are not being sent",
      "error",
    );
  }
}

function getResend(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

type SendResult = { success: boolean; messageId?: string; error?: string };

class EmailTimeoutError extends Error {
  constructor() {
    super("Email send timed out");
    this.name = "EmailTimeoutError";
  }
}

class ResendSendError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null,
  ) {
    super(message);
    this.name = "ResendSendError";
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof EmailTimeoutError) return true;
  if (err instanceof ResendSendError) {
    return (
      err.statusCode != null &&
      (err.statusCode >= 500 || err.statusCode === 429)
    );
  }
  // Thrown network/transport errors (no structured status) are transient.
  return err instanceof Error;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new EmailTimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

interface SendViaResendOptions {
  idempotencyKey?: string;
  listUnsubscribeUrl?: string;
  context?: EmailSendContext;
}

function unsubscribeHeaders(
  url?: string,
): { "List-Unsubscribe": string; "List-Unsubscribe-Post": string } | undefined {
  if (!url) return undefined;
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

async function sendViaResend(
  payload: { to: string; subject: string; html: string },
  opts: SendViaResendOptions = {},
): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    reportMissingApiKey();
    return { success: false, error: "Email service not configured" };
  }

  const { idempotencyKey, listUnsubscribeUrl, context } = opts;
  const headers = unsubscribeHeaders(listUnsubscribeUrl);

  const result = await (async (): Promise<SendResult> => {
    try {
      return await retryWithBackoff(
        async () => {
          const { data, error } = await withTimeout(
            getResend().emails.send(
              {
                from: fromAddress(),
                ...payload,
                ...(headers ? { headers } : {}),
              },
              idempotencyKey ? { idempotencyKey } : undefined,
            ),
            SEND_TIMEOUT_MS,
          );

          if (error) throw new ResendSendError(error.message, error.statusCode);

          return { success: true, messageId: data?.id };
        },
        { retries: MAX_ATTEMPTS, baseDelayMs: BASE_DELAY_MS, isRetryable },
      );
    } catch (err) {
      logger.error("Failed to send email:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error sending email";
      return { success: false, error: errorMessage };
    }
  })();

  if (context) {
    // Fire-and-forget — never block/fail the send on the audit write.
    void logEmailSend(context, {
      recipientEmail: payload.to,
      subject: payload.subject,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  }

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "#";
    }
    return url;
  } catch {
    // Relative URLs (starting with /) are allowed as-is
    return url.startsWith("/") ? url : "#";
  }
}

export interface SendNotificationEmailOptions {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority: NotificationPriority;
  idempotencyKey?: string;
  listUnsubscribeUrl?: string;
  context?: EmailSendContext;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
  listUnsubscribeUrl?: string;
  context?: EmailSendContext;
}

export function renderNotificationBody(
  title: string,
  message: string,
  priority: NotificationPriority,
  actionUrl?: string,
): string {
  const priorityBadge =
    priority === "high"
      ? '<span style="display:inline-block;background:#dc2626;color:#ffffff;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">HIGH PRIORITY</span>'
      : "";

  const actionButton = actionUrl
    ? `<a href="${sanitizeUrl(actionUrl)}" class="trc-email-btn" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;margin-top:16px;">View Details</a>`
    : "";

  return `
    <h1 style="margin:0 0 8px 0;font-size:18px;color:#1e293b;">
      ${escapeHtml(title)}
    </h1>
    ${priorityBadge}
    <p style="margin:12px 0 0 0;color:#475569;">
      ${escapeHtml(message)}
    </p>
    ${actionButton}
  `;
}

export const sendNotificationEmail = async (
  options: SendNotificationEmailOptions,
): Promise<SendResult> => {
  const {
    to,
    subject,
    title,
    message,
    actionUrl,
    priority,
    idempotencyKey,
    listUnsubscribeUrl,
    context,
  } = options;

  const bodyHtml = renderNotificationBody(title, message, priority, actionUrl);

  const htmlContent = wrapEmailLayout(bodyHtml, {
    preheader: escapeHtml(title),
    unsubscribeUrl: listUnsubscribeUrl,
  });

  return sendViaResend(
    { to, subject, html: htmlContent },
    { idempotencyKey, listUnsubscribeUrl, context },
  );
};

export const sendEmail = async (
  options: SendEmailOptions,
): Promise<SendResult> => {
  const { to, subject, html, idempotencyKey, listUnsubscribeUrl, context } =
    options;
  return sendViaResend(
    { to, subject, html },
    { idempotencyKey, listUnsubscribeUrl, context },
  );
};

export interface SendGuardianClaimEmailOptions {
  to: string;
  playerName: string;
  token: string;
  context?: EmailSendContext;
}

/**
 * Player-initiated guardian confirmation. The mirror image of `sendInviteEmail`: here the
 * 13-17 player has already started an account and is asking a parent/guardian to confirm
 * it, rather than the guardian inviting the player in.
 */
export const sendGuardianClaimEmail = async (
  options: SendGuardianClaimEmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, playerName, token, context } = options;
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
  const claimUrl = `${baseUrl}/guardian/claim/${encodeURIComponent(token)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
          <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #111827;">
            ${escapeHtml(playerName)} started a recruiting profile
          </h1>
          <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px;">
            ${escapeHtml(playerName)} is using The Recruiting Compass to track schools, deadlines
            and coach contacts — and listed you as their parent or guardian.
          </p>
          <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">
            Because they're under 18, you need to confirm their account. Messaging coaches and
            sharing their profile stay switched off until you do.
          </p>
          <a href="${sanitizeUrl(claimUrl)}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Confirm ${escapeHtml(playerName)}'s account
          </a>
          <p style="margin-top: 24px; font-size: 13px; color: #9ca3af;">
            If you don't recognize this, you can ignore this email — the account stays locked
            and is removed if no one confirms it.
          </p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
          The Recruiting Compass
        </p>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${playerName} started a recruiting profile — confirm you're their parent or guardian`,
    html: htmlContent,
    idempotencyKey: `guardian-claim-${token}`,
    context,
  });
};

export interface SendInviteEmailOptions {
  to: string;
  inviterName: string;
  familyName: string;
  role: "player" | "parent";
  token: string;
  context?: EmailSendContext;
}

export function renderWeeklyDigestEmail(
  data: {
    lines: string[];
    upcomingDeadlines: Array<{ label: string; deadline_date: string }>;
  },
  unsubscribeUrl?: string,
): string {
  const lineItems = data.lines
    .map((l) => `<li style="margin:4px 0">${escapeHtml(l)}</li>`)
    .join("");
  const deadlineItems = data.upcomingDeadlines.length
    ? data.upcomingDeadlines
        .map(
          (d) =>
            `<li>${escapeHtml(d.label)} — ${escapeHtml(d.deadline_date)}</li>`,
        )
        .join("")
    : "<li>No upcoming deadlines</li>";

  const bodyHtml = `
    <h2 style="color:#1e293b;font-size:18px;margin:0 0 12px 0;">Your Weekly Recruiting Recap</h2>
    <ul style="padding-left:20px;margin:0 0 20px 0;color:#475569;">${lineItems}</ul>
    <h3 style="color:#1e293b;font-size:15px;margin:0 0 8px 0;">Upcoming Deadlines</h3>
    <ul style="padding-left:20px;margin:0;color:#475569;">${deadlineItems}</ul>
  `;

  return wrapEmailLayout(bodyHtml, {
    preheader: "Your weekly recruiting recap is here",
    unsubscribeUrl,
  });
}

export function renderDeadlineAlertEmail(
  data: {
    label: string;
    daysUntil: number;
    deadline_date: string;
  },
  unsubscribeUrl?: string,
): string {
  const urgency =
    data.daysUntil === 0
      ? "TODAY"
      : `in ${data.daysUntil} day${data.daysUntil !== 1 ? "s" : ""}`;

  const bodyHtml = `
    <h2 class="trc-urgent" style="color:#dc2626;font-size:18px;margin:0 0 12px 0;">Deadline ${urgency}</h2>
    <p style="color:#475569;margin:0;">
      <strong style="color:#1e293b;">${escapeHtml(data.label)}</strong> is due ${urgency} (${escapeHtml(data.deadline_date)}).
    </p>
  `;

  return wrapEmailLayout(bodyHtml, {
    preheader: `Deadline ${urgency}: ${escapeHtml(data.label)}`,
    unsubscribeUrl,
  });
}

const ROLE_VALUE_PROPS: Record<"player" | "parent", string> = {
  player:
    "Track your recruiting progress, message coaches, and manage deadlines — all in one place.",
  parent:
    "Follow along on the recruiting journey, help manage deadlines, and stay in the loop with coaches.",
};

export function renderInviteBody(
  inviterName: string,
  familyName: string,
  role: "player" | "parent",
  joinUrl: string,
): string {
  return `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#1e293b;">
      ${escapeHtml(inviterName)} invited you to join ${escapeHtml(familyName)}'s recruiting journey
    </h1>
    <p style="margin:0 0 20px 0;color:#475569;">
      ${ROLE_VALUE_PROPS[role]}
    </p>
    <a href="${sanitizeUrl(joinUrl)}" class="trc-email-btn" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">
      Join ${escapeHtml(familyName)}
    </a>
    <p style="margin-top:20px;font-size:13px;color:#94a3b8;">
      This invite link expires in 7 days.
    </p>
  `;
}

export const sendInviteEmail = async (
  options: SendInviteEmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, inviterName, familyName, role, token, context } = options;
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
  const joinUrl = `${baseUrl}/join?token=${encodeURIComponent(token)}`;

  const bodyHtml = renderInviteBody(inviterName, familyName, role, joinUrl);

  const htmlContent = wrapEmailLayout(bodyHtml, {
    preheader: `${escapeHtml(inviterName)} invited you to join ${escapeHtml(familyName)}'s recruiting profile`,
  });

  return sendEmail({
    to,
    subject: `${familyName}'s recruiting journey awaits — you're invited!`,
    html: htmlContent,
    idempotencyKey: `invite-${token}`,
    context,
  });
};
