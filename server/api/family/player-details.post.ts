import { defineEventHandler, readBody, createError } from 'h3'
import { useLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/auth'
import { useSupabaseAdmin } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, 'family/player-details')
  const user = await requireAuth(event)
  const body = await readBody(event)

  const { playerName, graduationYear, sport, position } = body

  const supabase = useSupabaseAdmin()

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_unit_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'Not a family member' })
  }

  const { error } = await supabase
    .from('family_units')
    .update({
      pending_player_details: { playerName, graduationYear, sport, position },
    })
    .eq('id', membership.family_unit_id)

  if (error) {
    logger.error('Failed to save player details', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save player details' })
  }

  logger.info('Player details pre-filled by parent', { familyUnitId: membership.family_unit_id })
  return { success: true }
})
