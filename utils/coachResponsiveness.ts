/**
 * Calculate coach responsiveness score based on interaction patterns
 * Responsiveness Score = (Inbound Responses / Total Outbound Attempts) * 100
 * Score ranges from 0-100
 */

export interface CoachResponsivenessInput {
  outboundCount: number
  inboundCount: number
}

/**
 * Calculate responsiveness percentage
 * Formula: (inbound / outbound) * 100
 * If no outbound interactions, return 0
 * Max score is 100 (coach only sends unsolicited messages)
 */
export const calculateResponsivenessScore = (input: CoachResponsivenessInput): number => {
  const { outboundCount, inboundCount } = input

  if (outboundCount === 0) {
    return 0
  }

  const score = (inboundCount / outboundCount) * 100
  return Math.min(Math.round(score), 100)
}

/**
 * Get responsiveness label and color based on score
 */
export const getResponsivenessLabel = (score: number): { label: string; color: string } => {
  if (score >= 75) {
    return { label: 'Highly Responsive', color: 'bg-green-100 text-green-700' }
  }
  if (score >= 50) {
    return { label: 'Responsive', color: 'bg-blue-100 text-blue-700' }
  }
  if (score >= 25) {
    return { label: 'Moderately Responsive', color: 'bg-yellow-100 text-yellow-700' }
  }
  return { label: 'Low Responsiveness', color: 'bg-red-100 text-red-700' }
}

/**
 * Determine if coach is responsive enough based on a threshold
 * Default threshold: 50%
 */
export const isResponsiveCoach = (score: number, threshold: number = 50): boolean => {
  return score >= threshold
}
