import type { NotificationPriority } from "~/types/models";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("email");

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
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendNotificationEmail = async (
  options: SendNotificationEmailOptions,
) => {
  const { to, subject, title, message, actionUrl, priority } = options;

  // Check if Resend API key is available
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, email notifications disabled");
    return { success: false, error: "Email service not configured" };
  }

  const priorityBadge =
    priority === "high"
      ? '<span style="display: inline-block; background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">HIGH PRIORITY</span>'
      : "";

  const actionButton = actionUrl
    ? `<a href="${sanitizeUrl(actionUrl)}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">View Details</a>`
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #111827;">
            ${escapeHtml(title)}
          </h1>
          ${priorityBadge}
          <p style="margin: 16px 0; color: #4b5563; font-size: 16px;">
            ${escapeHtml(message)}
          </p>
          ${actionButton}
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
          The Recruiting Compass
        </p>
      </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Recruiting Compass <info@therecruitingcompass.com>",
        to,
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (err) {
    logger.error("Failed to send email:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error sending email";
    return { success: false, error: errorMessage };
  }
};

export const sendEmail = async (options: SendEmailOptions) => {
  const { to, subject, html } = options;

  // Check if Resend API key is available
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, email notifications disabled");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Recruiting Compass <info@therecruitingcompass.com>",
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (err) {
    logger.error("Failed to send email:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error sending email";
    return { success: false, error: errorMessage };
  }
};

export interface SendInviteEmailOptions {
  to: string;
  inviterName: string;
  familyName: string;
  role: "player" | "parent";
  token: string;
}

export function renderWeeklyDigestEmail(data: {
  lines: string[]
  upcomingDeadlines: Array<{ label: string; deadline_date: string }>
}): string {
  const lineItems = data.lines
    .map(l => `<li style="margin:4px 0">${escapeHtml(l)}</li>`)
    .join('')
  const deadlineItems = data.upcomingDeadlines.length
    ? data.upcomingDeadlines.map(d => `<li>${escapeHtml(d.label)} — ${d.deadline_date}</li>`).join('')
    : '<li>No upcoming deadlines</li>'
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#1a1a1a">Your Weekly Recruiting Recap</h2>
    <ul style="padding-left:20px">${lineItems}</ul>
    <h3 style="color:#1a1a1a">Upcoming Deadlines</h3>
    <ul style="padding-left:20px">${deadlineItems}</ul>
    <p style="color:#888;font-size:12px;margin-top:32px">
      You're receiving this because you have a Recruiting Compass account.
    </p>
  </body></html>`
}

export function renderDeadlineAlertEmail(data: {
  label: string
  daysUntil: number
  deadline_date: string
}): string {
  const urgency = data.daysUntil === 0 ? 'TODAY' : `in ${data.daysUntil} day${data.daysUntil !== 1 ? 's' : ''}`
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#dc2626">Deadline ${urgency}</h2>
    <p><strong>${escapeHtml(data.label)}</strong> is due ${urgency} (${data.deadline_date}).</p>
    <p style="color:#888;font-size:12px;margin-top:32px">
      You're receiving this because you have a Recruiting Compass account.
    </p>
  </body></html>`
}

export const sendInviteEmail = async (
  options: SendInviteEmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, inviterName, familyName, role, token } = options;
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
  const joinUrl = `${baseUrl}/join?token=${encodeURIComponent(token)}`;
  const roleLabel = role === "player" ? "player" : "parent";

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
            ${escapeHtml(familyName)}'s recruiting journey awaits — you're invited!
          </h1>
          <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">
            ${escapeHtml(inviterName)} has invited you to join ${escapeHtml(familyName)}'s recruiting profile as a ${escapeHtml(roleLabel)}.
          </p>
          <a href="${sanitizeUrl(joinUrl)}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Join ${escapeHtml(familyName)}
          </a>
          <p style="margin-top: 24px; font-size: 13px; color: #9ca3af;">
            This link expires in 7 days.
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
    subject: `${familyName}'s recruiting journey awaits — you're invited!`,
    html: htmlContent,
  });
};
