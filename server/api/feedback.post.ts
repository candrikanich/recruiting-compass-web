import { defineEventHandler, readBody, createError } from "h3"
import { useLogger } from "~/server/utils/logger"
import { requireAuth } from "~/server/utils/auth"
import { sendEmail } from "~/server/utils/emailService"
import { feedbackSchema } from "~/utils/validation/schemas"

const FEEDBACK_EMAIL = "info@therecruitingcompass.com"

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

const feedbackTypeLabels: Record<"bug" | "feature" | "other", string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  other: "Other Feedback",
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "feedback")
  try {
    const user = await requireAuth(event)
    const body = await readBody(event)

    const parsed = feedbackSchema.safeParse(body)
    if (!parsed.success) {
      logger.warn("Validation failed for feedback submission", parsed.error.issues)
      throw createError({ statusCode: 400, statusMessage: "Invalid request" })
    }

    const { name, email, feedbackType, page, message } = parsed.data
    const typeLabel = feedbackTypeLabels[feedbackType]
    const pageInfo = page ? `<p><strong>Page:</strong> ${escapeHtml(page)}</p>` : ""

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">[Feedback] ${typeLabel}</h2>
          <p><strong>From:</strong> ${escapeHtml(name ?? "")} (${escapeHtml(email ?? "")})</p>
          <p><strong>User ID:</strong> ${user.id}</p>
          <p><strong>Category:</strong> ${typeLabel}</p>
          ${pageInfo}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="white-space: pre-wrap;">${escapeHtml(message ?? "")}</p>
        </body>
      </html>
    `

    const result = await sendEmail({
      to: FEEDBACK_EMAIL,
      subject: `[Feedback] ${typeLabel} from ${name ?? "unknown"}`,
      html,
    })

    if (!result.success) {
      logger.error("Failed to send feedback email", { error: result.error })
      throw createError({ statusCode: 500, statusMessage: "Failed to send feedback" })
    }

    logger.info("Feedback submitted", { feedbackType, userId: user.id })
    return { success: true }
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err
    logger.error("Unexpected error submitting feedback", err)
    throw createError({ statusCode: 500, statusMessage: "Failed to send feedback" })
  }
})
