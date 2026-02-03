/**
 * API Endpoint for sending recruiting packets via email
 * POST /api/recruiting-packet/email
 */

import { defineEventHandler, readBody, getHeader } from "h3";
import { z } from "zod";
import { Resend } from "resend";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entry.count++;
    return true;
  }

  return false;
};

/**
 * Format professional email template
 */
const formatEmailHtml = (
  body: string,
  athleteName: string | undefined,
): string => {
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
            <h2>${athleteName || "Athlete"} - Recruiting Profile</h2>
          </div>
          <div class="content">
            <div class="message">${body}</div>
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
  // Get user ID from auth header
  const userId = getHeader(event, "x-user-id") || "";
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

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
      console.error("Resend email errors:", failures);
      throw new Error(`Failed to send to ${failures.length} recipients`);
    }

    // Audit log (in production, save to database)
    console.info(
      `[RECRUITING_PACKET_EMAIL] User: ${userId}, Recipients: ${body.recipients.length}, Subject: ${body.subject}`,
    );

    return {
      success: true,
      message: `Email sent to ${body.recipients.length} recipient(s)`,
      sentTo: body.recipients,
    };
  } catch (error) {
    console.error("Error sending recruiting packet email:", error);

    const message =
      error instanceof Error ? error.message : "Failed to send email";

    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
