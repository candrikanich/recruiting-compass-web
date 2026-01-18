import type { PerformanceMetric, Event } from '~/types/models'

/**
 * Generate coach-friendly email template for performance metrics
 */
export const generateCoachEmailTemplate = (
  athleteName: string,
  coachName: string,
  metrics: PerformanceMetric[]
): string => {
  if (metrics.length === 0) {
    return `Subject: ${athleteName} - Performance Update\n\nHi Coach ${coachName},\n\nNo metrics available for the selected date range.\n\nLooking forward to staying in touch!\n\n${athleteName}`
  }

  const sortedMetrics = [...metrics].sort((a, b) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime())
  const dateRange = `${new Date(sortedMetrics[sortedMetrics.length - 1].recorded_date).toLocaleDateString()} - ${new Date(sortedMetrics[0].recorded_date).toLocaleDateString()}`

  // Group metrics by type and get latest
  const latestByType: Record<string, PerformanceMetric> = {}
  metrics.forEach(m => {
    if (!latestByType[m.metric_type] || new Date(m.recorded_date) > new Date(latestByType[m.metric_type].recorded_date)) {
      latestByType[m.metric_type] = m
    }
  })

  const highlights = Object.values(latestByType)
    .map(m => `- ${m.metric_type.replace(/_/g, ' ').toUpperCase()}: ${m.value} ${m.unit}`)
    .join('\n')

  return `Subject: ${athleteName} - Performance Update

Hi Coach ${coachName},

I wanted to share ${athleteName}'s recent performance metrics from ${dateRange}:

KEY HIGHLIGHTS:
${highlights}

All metrics are verified by third-party evaluators at official events.

Looking forward to staying in touch!

${athleteName}
`
}

/**
 * Generate event performance summary template
 */
export const generateEventSummaryTemplate = (
  event: Event,
  metrics: PerformanceMetric[],
  athleteName: string
): string => {
  const metricsText = metrics.length > 0
    ? metrics.map(m => `- ${m.metric_type.replace(/_/g, ' ').toUpperCase()}: ${m.value} ${m.unit}`).join('\n')
    : 'No metrics recorded'

  return `${athleteName} - ${event.name} Performance Summary

Event: ${event.name}
Date: ${new Date(event.start_date).toLocaleDateString()}
Location: ${event.location || 'N/A'}

METRICS RECORDED:
${metricsText}

PERFORMANCE NOTES:
${event.performance_notes || 'No notes recorded'}

Generated: ${new Date().toLocaleDateString()}
`
}

/**
 * Get metric label for display
 */
export const getMetricLabel = (type: string): string => {
  const labels: Record<string, string> = {
    velocity: 'Fastball Velocity',
    exit_velo: 'Exit Velocity',
    sixty_time: '60-Yard Dash',
    pop_time: 'Pop Time',
    batting_avg: 'Batting Average',
    era: 'ERA',
    strikeouts: 'Strikeouts',
    other: 'Other Metric'
  }
  return labels[type] || type
}
