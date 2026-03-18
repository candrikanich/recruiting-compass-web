// Run with: npx tsx scripts/seed-system-calendar.ts
import { createClient } from '@supabase/supabase-js'
import {
  RECRUITING_CALENDAR_2026,
  ALL_MILESTONES,
} from '../server/utils/ncaaRecruitingCalendar'

const supabase = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map RecruitingPeriod.type → system_calendar category
function periodCategory(type: string): string {
  const map: Record<string, string> = {
    dead: 'dead_period',
    quiet: 'quiet_period',
    contact: 'contact_period',
    evaluation: 'evaluation_period',
  }
  return map[type] ?? 'contact_period'
}

// Map Milestone.type → system_calendar category
function milestoneCategory(m: { type: string; title: string }): string {
  if (m.type === 'test') {
    return m.title.toLowerCase().includes('sat') ? 'sat_date' : 'act_date'
  }
  if (m.type === 'signing') return 'signing_day'
  // ncaa-period, deadline, application → nli_period (closest generic bucket)
  return 'nli_period'
}

// Normalize division strings to DB-allowed values: 'd1' | 'd2' | 'd3' | null
function normalizeDivision(div: string | undefined | null): string | null {
  if (!div) return null
  const map: Record<string, string> = {
    D1: 'd1', DI: 'd1',
    D2: 'd2', DII: 'd2',
    D3: 'd3', DIII: 'd3',
  }
  return map[div] ?? null  // ALL, NAIA, JUCO → null
}

const periodRows = RECRUITING_CALENDAR_2026.map(p => ({
  category: periodCategory(p.type),
  sport: 'baseball',
  division: normalizeDivision(p.division),
  label: p.description,
  start_date: p.start.toISOString().split('T')[0],
  end_date: p.end.toISOString().split('T')[0],
  season_year: 2026,
}))

const milestoneRows = ALL_MILESTONES.map(m => ({
  category: milestoneCategory(m),
  sport: null,
  division: normalizeDivision(m.division as string | undefined),
  label: m.title,
  start_date: m.date,
  end_date: null,
  season_year: 2026,
}))

const rows = [...periodRows, ...milestoneRows]
console.log(`Seeding ${rows.length} system_calendar rows...`)

const { error } = await supabase
  .from('system_calendar')
  .upsert(rows, { onConflict: 'label,start_date,season_year' })

if (error) {
  console.error('Seed failed:', error)
  process.exit(1)
}
console.log(`Seeded ${rows.length} rows successfully.`)
