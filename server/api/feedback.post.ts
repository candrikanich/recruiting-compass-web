import { defineEventHandler, readBody, createError } from "h3"
import { z } from "zod"
import { useLogger } from "~/server/utils/logger"
import { requireAuth } from "~/server/utils/auth"
import { sendEmail } from "~/server/utils/emailService"

const FEEDBACK_EMAIL = "info@therecruitingcompass.com"

const subjectLabels: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  question: "Question",
  general: "General Feedback",
}

const feedbackSchema = z.object({
  subject: z.enum(["bug", "feature", "question", "general"]),
  message: z.string().min(1).max(5000),
})

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

    const { subject, message } = parsed.data
    const subjectLabel = subjectLabels[subject]
    const senderInfo = user.email ? ` from ${user.email}` : ""

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">[Feedback] ${subjectLabel}</h2>
          <p><strong>From:</strong> User ${user.id}${senderInfo}</p>
          <p><strong>Category:</strong> ${subjectLabel}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="white-space: pre-wrap;">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </body>
      </html>
    `

    const result = await sendEmail({
      to: FEEDBACK_EMAIL,
      subject: `[Feedback] ${subjectLabel}`,
      html,
    })

    if (!result.success) {
      logger.error("Failed to send feedback email", { error: result.error })
      throw createError({ statusCode: 500, statusMessage: "Failed to send feedback" })
    }

    logger.info("Feedback submitted", { subject, userId: user.id })
    return { success: true }
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err
    logger.error("Unexpected error submitting feedback", err)
    throw createError({ statusCode: 500, statusMessage: "Failed to send feedback" })
  }
})
