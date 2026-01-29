import type { NotificationPriority } from "~/types/models";

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
    console.warn("RESEND_API_KEY not configured, email notifications disabled");
    return { success: false, error: "Email service not configured" };
  }

  const priorityBadge =
    priority === "high"
      ? '<span style="display: inline-block; background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">HIGH PRIORITY</span>'
      : "";

  const actionButton = actionUrl
    ? `<a href="${actionUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">View Details</a>`
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
            ${title}
          </h1>
          ${priorityBadge}
          <p style="margin: 16px 0; color: #4b5563; font-size: 16px;">
            ${message}
          </p>
          ${actionButton}
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
          College Baseball Recruiting Compass
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
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error("Failed to send email:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error sending email";
    return { success: false, error: errorMessage };
  }
};

export const sendEmail = async (options: SendEmailOptions) => {
  const { to, subject, html } = options;

  // Check if Resend API key is available
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, email notifications disabled");
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
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error("Failed to send email:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error sending email";
    return { success: false, error: errorMessage };
  }
};
