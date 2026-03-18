import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { renderWeeklyDigestEmail, renderDeadlineAlertEmail } from '~/server/utils/emailService'
import { useLogger } from '~/server/utils/logger'

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.enum(['weekly-digest', 'deadline-alert']),
  data: z.record(z.string(), z.unknown()),
})

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, 'email/send')
  await requireAuth(event)

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid request' })
  }

  const { to, subject, template, data } = parsed.data
  const html = template === 'weekly-digest'
    ? renderWeeklyDigestEmail(data as Parameters<typeof renderWeeklyDigestEmail>[0])
    : renderDeadlineAlertEmail(data as Parameters<typeof renderDeadlineAlertEmail>[0])

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'RESEND_API_KEY not configured' })
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Recruiting Compass <notifications@recruitingcompass.com>',
      to,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      logger.error('Resend delivery error', errorData)
      errorMessage = errorData.message || errorMessage
    } catch {
      // Response body is not JSON
      const textError = await response.text().catch(() => 'Unknown error')
      logger.error('Resend delivery error (non-JSON)', { status: response.status, body: textError })
      errorMessage = textError || errorMessage
    }
    throw createError({ statusCode: 500, statusMessage: 'Failed to send email' })
  }

  return { success: true }
})
