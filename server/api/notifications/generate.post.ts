/**
 * POST /api/notifications/generate
 * Generate all notifications for athlete
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler } from 'h3'
import { createServerSupabaseClient } from '~/server/utils/supabase'
import {
  generateOfferNotifications,
  generateRecommendationNotifications,
  generateEventNotifications,
  generateCoachFollowupNotifications,
} from '~/server/utils/notificationGenerator'
import { requireAuth, assertNotParent } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = await requireAuth(event)
    const supabase = createServerSupabaseClient()

    // Ensure requesting user is not a parent (mutation restricted)
    await assertNotParent(user.id, supabase)

    // Generate notifications from all sources in parallel
    const results = await Promise.all([
      generateOfferNotifications(user.id, supabase),
      generateRecommendationNotifications(user.id, supabase),
      generateEventNotifications(user.id, supabase),
      generateCoachFollowupNotifications(user.id, supabase),
    ])

    // Calculate totals
    const totalCreated = results.reduce((sum, r) => sum + r.count, 0)

    return {
      success: true,
      created: totalCreated,
      breakdown: {
        offers: results[0].count,
        recommendations: results[1].count,
        events: results[2].count,
        coaches: results[3].count,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error('Error generating notifications:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to generate notifications',
    })
  }
})
