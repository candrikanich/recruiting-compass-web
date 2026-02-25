import { feedbackSchema } from "~/utils/validation/schemas";
import { validateBody } from "~/server/utils/validation";
import { escapeHtml } from "~/utils/validation/sanitize";
import { createLogger } from "~/server/utils/logger";
import {
  sanitizeExternalApiError,
  createSafeErrorResponse,
} from "~/server/utils/errorHandler";
import { auditLog } from "~/server/utils/auditLog";
import { requireAuth } from "~/server/utils/auth";
import type { H3Event } from "h3";

const logger = createLogger("feedback");

export default defineEventHandler(async (event) => {
  try {
    // Get current user if authenticated
    const userId = await tryGetUserId(event);

    // Validate request body with Zod schema
    const validated = await validateBody(event, feedbackSchema);

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      logger.error("Email service not configured");
      throw createError({
        statusCode: 500,
        statusMessage: "Email service not configured",
      });
    }

    // Send feedback email to admin directly via Resend
    const feedbackTypeLabel =
      validated.feedbackType === "bug"
        ? "Bug Report"
        : validated.feedbackType === "feature"
          ? "Feature Request"
          : "Other Feedback";

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
              New ${feedbackTypeLabel}
            </h1>
            <div style="margin: 16px 0;">
              <p style="margin: 8px 0;"><strong>From:</strong> ${escapeHtml(validated.name)}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${escapeHtml(validated.email)}</p>
              <p style="margin: 8px 0;"><strong>Type:</strong> ${feedbackTypeLabel}</p>
              ${validated.page ? `<p style="margin: 8px 0;"><strong>Page:</strong> ${escapeHtml(validated.page)}</p>` : ""}
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; font-weight: bold;">Message:</p>
              <p style="margin: 0; white-space: pre-wrap; color: #4b5563;">
                ${(validated.message ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
              </p>
            </div>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
            The Recruiting Compass
          </p>
        </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "feedback@resend.dev",
        to: "chris@andrikanich.com",
        subject: `[Feedback] ${feedbackTypeLabel} from ${validated.name}`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const apiError = await response.json().catch(() => ({ error: "Invalid response" }));
      logger.error("Email service error", apiError);
      const safeError = sanitizeExternalApiError(apiError, "Email service");
      throw createError({
        statusCode: safeError.statusCode,
        statusMessage: safeError.statusMessage,
        data: safeError.data,
      });
    }

    // Log successful feedback submission
    if (userId) {
      await auditLog(event, {
        userId,
        action: "CREATE",
        resourceType: "feedback",
        description: `Submitted ${validated.feedbackType} feedback`,
        status: "success",
        metadata: {
          feedbackType: validated.feedbackType,
          page: validated.page,
        },
      });
    }

    return { success: true, message: "Thank you for your feedback!" };
  } catch (error: unknown) {
    const userId = await tryGetUserId(event);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Log failed feedback submission
    if (userId) {
      await auditLog(event, {
        userId,
        action: "CREATE",
        resourceType: "feedback",
        errorMessage,
        status: "failure",
        description: "Failed to submit feedback",
      });
    }

    const safeError = createSafeErrorResponse(error, "feedback endpoint");
    throw createError({
      statusCode: safeError.statusCode,
      statusMessage: safeError.statusMessage,
      data: safeError.data,
    });
  }
});

async function tryGetUserId(event: H3Event): Promise<string | null> {
  try {
    const user = await requireAuth(event);
    return user.id;
  } catch {
    return null;
  }
}
