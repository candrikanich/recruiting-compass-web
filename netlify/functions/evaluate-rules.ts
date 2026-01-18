import { createClient } from '@supabase/supabase-js'

async function surfacePendingSuggestions(
  supabase: any,
  athleteId: string,
  limit: number = 3
): Promise<number> {
  const { data: pending, error } = await supabase
    .from('suggestion')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('pending_surface', true)
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !pending || pending.length === 0) {
    return 0
  }

  const ids = pending.map((s: any) => s.id)

  const { error: updateError } = await supabase
    .from('suggestion')
    .update({
      pending_surface: false,
      surfaced_at: new Date().toISOString(),
    })
    .in('id', ids)

  return updateError ? 0 : ids.length
}

export const handler = async () => {
  const siteUrl = process.env.SITE_URL || process.env.URL
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!siteUrl || !supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables' })
    }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: athletes, error: athletesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'athlete')

    if (athletesError || !athletes) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No athletes found' }) }
    }

    let totalGenerated = 0
    let athletesProcessed = 0

    for (const athlete of athletes) {
      try {
        const response = await fetch(`${siteUrl}/api/suggestions/evaluate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          totalGenerated += result.generated || 0
          athletesProcessed++

          await surfacePendingSuggestions(supabase, athlete.id, 3)
        }
      } catch (error) {
        console.error(`Failed to evaluate rules for athlete ${athlete.id}:`, error)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        athletesProcessed,
        suggestionsGenerated: totalGenerated,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error: any) {
    console.error('Error in evaluate-rules function:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
