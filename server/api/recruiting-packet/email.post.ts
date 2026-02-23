/**
 * API Endpoint for sending recruiting packets via email
 * POST /api/recruiting-packet/email
 */

import { defineEventHandler, readBody } from "h3";
import { z } from "zod";
import { Resend } from "resend";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";

// Email validation schema
const emailPacketSchema = z.object({
  recipients: z
    .array(z.string().email("Invalid email address"))
    .min(1, "At least one recipient is required")
    .max(10, "Maximum 10 recipients per send"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject too long"),
  body: z.string().min(1, "Body is required").max(2000, "Body too long"),
  htmlContent: z.string().optional(),
  pdfBase64: z.string().optional(),
  athleteName: z.string().optional(),
  filename: z.string().optional(),
});

type EmailPacketRequest = z.infer<typeof emailPacketSchema>;

/**
 * Rate limiting store (in-memory, resets on server restart)
 * In production, use Redis or database for persistence
 */
const emailRateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

/**
 * Check if user has exceeded daily email limit
 */
const checkRateLimit = (userId: string, maxEmails: number = 20): boolean => {
  const now = Date.now();
  const entry = emailRateLimitStore.get(userId);

  if (!entry || entry.resetTime < now) {
    // Reset limit
    emailRateLimitStore.set(userId, {
      count: 0,
      resetTime: now + 24 * 60 * 60 * 1000, // 24 hours
    });
    return true;
  }

  if (entry.count < maxEmails) {
    entry.count++;
    return true;
  }

  return false;
};

/**
 * Escape HTML special characters to prevent XSS in email body
 */
const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

/**
 * Format professional email template
 */
const formatEmailHtml = (
  body: string,
  athleteName: string | undefined,
): string => {
  const safeName = escapeHtml(athleteName || "Athlete");
  const safeBody = escapeHtml(body);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h2 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 20px; }
          .message { white-space: pre-wrap; word-wrap: break-word; }
          .footer { background: white; padding: 20px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
          .attachment-note { background: #dbeafe; color: #1e40af; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${safeName} - Recruiting Profile</h2>
          </div>
          <div class="content">
            <div class="message">${safeBody}</div>
            <div class="attachment-note">
              📎 Recruiting packet PDF is attached to this email.
            </div>
          </div>
          <div class="footer">
            <p>Sent via The Recruiting Compass | <a href="https://recruitingcompass.app" style="color: #3b82f6; text-decoration: none;">recruitingcompass.app</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "recruiting-packet/email");
  // Authenticate user and get verified user ID
  const user = await requireAuth(event);
  const userId = user.id;

  // Parse and validate request body
  let body: EmailPacketRequest;
  try {
    const rawBody = await readBody(event);
    body = emailPacketSchema.parse(rawBody);
  } catch (err) {
    if (err instanceof z.ZodError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = (err as any).errors as Array<{ message: string }>;
      throw createError({
        statusCode: 400,
        statusMessage: `Validation error: ${errors[0]?.message}`,
      });
    }
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }

  // Check rate limit
  if (!checkRateLimit(userId, 20)) {
    throw createError({
      statusCode: 429,
      statusMessage: "Rate limit exceeded: Maximum 20 emails per day",
    });
  }

  // Initialize Resend client
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Format email content
    const htmlContent = formatEmailHtml(body.body, body.athleteName);

    // Send emails to each recipient
    const results = await Promise.all(
      body.recipients.map((recipient) =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "recruiting@resend.dev",
          to: recipient,
          replyTo:
            process.env.ATHLETE_REPLY_EMAIL || "noreply@recruitingcompass.app",
          subject: body.subject,
          html: htmlContent,
          attachments: body.filename
            ? [
                {
                  filename: body.filename,
                  content: body.htmlContent || "",
                },
              ]
            : undefined,
        }),
      ),
    );

    // Check for failures
    const failures = results.filter((r) => r && "error" in r);
    if (failures.length > 0) {
      logger.error("Resend email send failures", { count: failures.length });
      throw new Error(`Failed to send to ${failures.length} recipients`);
    }

    logger.info("Recruiting packet email sent", {
      userId,
      recipientCount: body.recipients.length,
      subject: body.subject,
    });

    return {
      success: true,
      message: `Email sent to ${body.recipients.length} recipient(s)`,
      sentTo: body.recipients,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Error sending recruiting packet email", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to send email",
    });
  }
});
