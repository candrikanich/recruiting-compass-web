import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { sendEmail } from "~/server/utils/emailService";
import { wrapEmailLayout } from "~/server/utils/emailTemplates";
import { feedbackSchema } from "~/utils/validation/schemas";

const FEEDBACK_EMAIL = "info@therecruitingcompass.com";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const feedbackTypeLabels: Record<"bug" | "feature" | "other", string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  other: "Other Feedback",
};

export function renderFeedbackBody(
  typeLabel: string,
  name: string,
  email: string,
  userId: string,
  page: string | undefined,
  message: string,
): string {
  const pageInfo = page
    ? `<p><strong>Page:</strong> ${escapeHtml(page)}</p>`
    : "";

  return `
      <h2 style="color:#1e40af;font-size:18px;margin:0 0 12px 0;">[Feedback] ${typeLabel}</h2>
      <p style="margin:0 0 4px 0;color:#475569;"><strong>From:</strong> ${escapeHtml(name ?? "")} (${escapeHtml(email ?? "")})</p>
      <p style="margin:0 0 4px 0;color:#475569;"><strong>User ID:</strong> ${userId}</p>
      <p style="margin:0 0 12px 0;color:#475569;"><strong>Category:</strong> ${typeLabel}</p>
      ${pageInfo}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
      <p style="white-space:pre-wrap;color:#1e293b;margin:0;">${escapeHtml(message ?? "")}</p>
    `;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "feedback");
  try {
    const user = await requireAuth(event);
    const body = await readBody(event);

    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn(
        "Validation failed for feedback submission",
        parsed.error.issues,
      );
      throw createError({ statusCode: 400, statusMessage: "Invalid request" });
    }

    const { name, email, feedbackType, page, message } = parsed.data;
    const typeLabel = feedbackTypeLabels[feedbackType];

    const bodyHtml = renderFeedbackBody(
      typeLabel,
      name ?? "",
      email ?? "",
      user.id,
      page ?? undefined,
      message ?? "",
    );

    const html = wrapEmailLayout(bodyHtml);

    const result = await sendEmail({
      to: FEEDBACK_EMAIL,
      subject: `[Feedback] ${typeLabel} from ${name ?? "unknown"}`,
      html,
      context: { purpose: "feedback", userId: user.id },
    });

    if (!result.success) {
      logger.error("Failed to send feedback email", { error: result.error });
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to send feedback",
      });
    }

    logger.info("Feedback submitted", { feedbackType, userId: user.id });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error submitting feedback", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to send feedback",
    });
  }
});
