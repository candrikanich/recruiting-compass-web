export async function surfacePendingSuggestions(
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

export async function getSurfacedSuggestions(
  supabase: any,
  athleteId: string,
  location: 'dashboard' | 'school_detail',
  schoolId?: string
): Promise<any[]> {
  let query = supabase
    .from('suggestion')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('pending_surface', false)
    .eq('dismissed', false)
    .eq('completed', false)
    .order('urgency', { ascending: false })
    .order('surfaced_at', { ascending: false })

  if (location === 'dashboard') {
    query = query.limit(3)
  } else if (location === 'school_detail' && schoolId) {
    query = query.eq('related_school_id', schoolId).limit(2)
  }

  const { data, error } = await query

  return error ? [] : data
}
