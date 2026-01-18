/**
 * GET /api/schools/[id]/fit-score
 * Get fit score for a school
 */

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { createServerSupabaseClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const schoolId = getRouterParam(event, 'id')

  if (!schoolId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'School ID is required',
    })
  }

  const supabase = createServerSupabaseClient()

  try {
    // Get school to verify ownership and get fit score data
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, user_id, name, fit_score, fit_score_data')
      .eq('id', schoolId)
      .eq('user_id', user.id)
      .single()

    if (schoolError || !school) {
      throw createError({
        statusCode: 404,
        statusMessage: 'School not found',
      })
    }

    // Return fit score and breakdown with proper type safety
    const schoolName = (school as any)?.name || ''
    const fitScore = (school as any)?.fit_score || null
    const fitScoreData = (school as any)?.fit_score_data || null

    return {
      success: true,
      data: {
        schoolId,
        schoolName,
        fitScore: fitScore || null,
        fitScoreData: fitScoreData || null,
      },
    }
  } catch (err: unknown) {
    if (err instanceof Error && 'statusCode' in err) {
      throw err
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch fit score'
    console.error('Fit score fetch error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: message,
    })
  }
})
