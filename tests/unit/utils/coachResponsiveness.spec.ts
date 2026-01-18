import { describe, it, expect } from 'vitest'
import {
  calculateResponsivenessScore,
  getResponsivenessLabel,
  isResponsiveCoach,
  type CoachResponsivenessInput,
} from '~/utils/coachResponsiveness'

describe('utils/coachResponsiveness', () => {
  describe('calculateResponsivenessScore', () => {
    describe('Happy Path', () => {
      it('should calculate score as (inbound / outbound) * 100', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 10,
          inboundCount: 8,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(80) // (8/10) * 100 = 80
      })

      it('should calculate perfect responsiveness (100%)', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 5,
          inboundCount: 5,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(100)
      })

      it('should calculate low responsiveness', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 20,
          inboundCount: 3,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(15) // (3/20) * 100 = 15
      })

      it('should round to nearest integer', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 3,
          inboundCount: 2,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(67) // (2/3) * 100 = 66.67 -> 67
      })
    })

    describe('Edge Cases', () => {
      it('should return 0 when outboundCount is 0', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 0,
          inboundCount: 5,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(0)
      })

      it('should return 0 when both counts are 0', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 0,
          inboundCount: 0,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(0)
      })

      it('should return 0 when inboundCount is 0', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 10,
          inboundCount: 0,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(0)
      })

      it('should cap score at 100 when inbound > outbound', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 5,
          inboundCount: 10,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(100) // (10/5) * 100 = 200, capped at 100
      })

      it('should handle very large numbers', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 1000,
          inboundCount: 750,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(75)
      })

      it('should handle decimal results correctly', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 7,
          inboundCount: 5,
        }

        const result = calculateResponsivenessScore(input)
        expect(result).toBe(71) // (5/7) * 100 = 71.43 -> 71
      })
    })

    describe('Boundary Values', () => {
      it('should handle score of exactly 0', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 100,
          inboundCount: 0,
        }

        expect(calculateResponsivenessScore(input)).toBe(0)
      })

      it('should handle score of exactly 100', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 1,
          inboundCount: 1,
        }

        expect(calculateResponsivenessScore(input)).toBe(100)
      })

      it('should handle score of exactly 50', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 10,
          inboundCount: 5,
        }

        expect(calculateResponsivenessScore(input)).toBe(50)
      })

      it('should handle score of exactly 25', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 4,
          inboundCount: 1,
        }

        expect(calculateResponsivenessScore(input)).toBe(25)
      })

      it('should handle score of exactly 75', () => {
        const input: CoachResponsivenessInput = {
          outboundCount: 4,
          inboundCount: 3,
        }

        expect(calculateResponsivenessScore(input)).toBe(75)
      })
    })
  })

  describe('getResponsivenessLabel', () => {
    describe('Happy Path', () => {
      it('should return "Highly Responsive" for score >= 75', () => {
        const result = getResponsivenessLabel(75)
        expect(result).toEqual({
          label: 'Highly Responsive',
          color: 'bg-green-100 text-green-700',
        })
      })

      it('should return "Responsive" for score >= 50 and < 75', () => {
        const result = getResponsivenessLabel(50)
        expect(result).toEqual({
          label: 'Responsive',
          color: 'bg-blue-100 text-blue-700',
        })
      })

      it('should return "Moderately Responsive" for score >= 25 and < 50', () => {
        const result = getResponsivenessLabel(25)
        expect(result).toEqual({
          label: 'Moderately Responsive',
          color: 'bg-yellow-100 text-yellow-700',
        })
      })

      it('should return "Low Responsiveness" for score < 25', () => {
        const result = getResponsivenessLabel(0)
        expect(result).toEqual({
          label: 'Low Responsiveness',
          color: 'bg-red-100 text-red-700',
        })
      })
    })

    describe('Boundary Values', () => {
      it('should return "Highly Responsive" for score of exactly 75', () => {
        const result = getResponsivenessLabel(75)
        expect(result.label).toBe('Highly Responsive')
      })

      it('should return "Responsive" for score of exactly 74', () => {
        const result = getResponsivenessLabel(74)
        expect(result.label).toBe('Responsive')
      })

      it('should return "Responsive" for score of exactly 50', () => {
        const result = getResponsivenessLabel(50)
        expect(result.label).toBe('Responsive')
      })

      it('should return "Moderately Responsive" for score of exactly 49', () => {
        const result = getResponsivenessLabel(49)
        expect(result.label).toBe('Moderately Responsive')
      })

      it('should return "Moderately Responsive" for score of exactly 25', () => {
        const result = getResponsivenessLabel(25)
        expect(result.label).toBe('Moderately Responsive')
      })

      it('should return "Low Responsiveness" for score of exactly 24', () => {
        const result = getResponsivenessLabel(24)
        expect(result.label).toBe('Low Responsiveness')
      })

      it('should return "Low Responsiveness" for score of 0', () => {
        const result = getResponsivenessLabel(0)
        expect(result.label).toBe('Low Responsiveness')
      })

      it('should return "Highly Responsive" for score of 100', () => {
        const result = getResponsivenessLabel(100)
        expect(result.label).toBe('Highly Responsive')
      })
    })

    describe('All Tiers', () => {
      it('should handle scores in Highly Responsive tier (75-100)', () => {
        const scores = [75, 80, 90, 95, 100]
        scores.forEach((score) => {
          const result = getResponsivenessLabel(score)
          expect(result.label).toBe('Highly Responsive')
          expect(result.color).toBe('bg-green-100 text-green-700')
        })
      })

      it('should handle scores in Responsive tier (50-74)', () => {
        const scores = [50, 55, 60, 70, 74]
        scores.forEach((score) => {
          const result = getResponsivenessLabel(score)
          expect(result.label).toBe('Responsive')
          expect(result.color).toBe('bg-blue-100 text-blue-700')
        })
      })

      it('should handle scores in Moderately Responsive tier (25-49)', () => {
        const scores = [25, 30, 35, 40, 49]
        scores.forEach((score) => {
          const result = getResponsivenessLabel(score)
          expect(result.label).toBe('Moderately Responsive')
          expect(result.color).toBe('bg-yellow-100 text-yellow-700')
        })
      })

      it('should handle scores in Low Responsiveness tier (0-24)', () => {
        const scores = [0, 5, 10, 15, 24]
        scores.forEach((score) => {
          const result = getResponsivenessLabel(score)
          expect(result.label).toBe('Low Responsiveness')
          expect(result.color).toBe('bg-red-100 text-red-700')
        })
      })
    })
  })

  describe('isResponsiveCoach', () => {
    describe('Happy Path with Default Threshold (50)', () => {
      it('should return true for score >= 50', () => {
        expect(isResponsiveCoach(50)).toBe(true)
        expect(isResponsiveCoach(75)).toBe(true)
        expect(isResponsiveCoach(100)).toBe(true)
      })

      it('should return false for score < 50', () => {
        expect(isResponsiveCoach(49)).toBe(false)
        expect(isResponsiveCoach(25)).toBe(false)
        expect(isResponsiveCoach(0)).toBe(false)
      })
    })

    describe('Custom Threshold', () => {
      it('should return true when score meets custom threshold', () => {
        expect(isResponsiveCoach(75, 75)).toBe(true)
        expect(isResponsiveCoach(80, 75)).toBe(true)
      })

      it('should return false when score is below custom threshold', () => {
        expect(isResponsiveCoach(74, 75)).toBe(false)
        expect(isResponsiveCoach(50, 75)).toBe(false)
      })

      it('should work with threshold of 0', () => {
        expect(isResponsiveCoach(0, 0)).toBe(true)
        expect(isResponsiveCoach(50, 0)).toBe(true)
      })

      it('should work with threshold of 100', () => {
        expect(isResponsiveCoach(100, 100)).toBe(true)
        expect(isResponsiveCoach(99, 100)).toBe(false)
      })

      it('should work with threshold of 25', () => {
        expect(isResponsiveCoach(25, 25)).toBe(true)
        expect(isResponsiveCoach(30, 25)).toBe(true)
        expect(isResponsiveCoach(24, 25)).toBe(false)
      })
    })

    describe('Edge Cases', () => {
      it('should handle score of exactly the threshold', () => {
        expect(isResponsiveCoach(50, 50)).toBe(true)
        expect(isResponsiveCoach(75, 75)).toBe(true)
      })

      it('should handle score of 1 below threshold', () => {
        expect(isResponsiveCoach(49, 50)).toBe(false)
        expect(isResponsiveCoach(74, 75)).toBe(false)
      })

      it('should handle score of 1 above threshold', () => {
        expect(isResponsiveCoach(51, 50)).toBe(true)
        expect(isResponsiveCoach(76, 75)).toBe(true)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should calculate score and get correct label for highly responsive coach', () => {
      const input: CoachResponsivenessInput = {
        outboundCount: 10,
        inboundCount: 9,
      }

      const score = calculateResponsivenessScore(input)
      const label = getResponsivenessLabel(score)
      const isResponsive = isResponsiveCoach(score)

      expect(score).toBe(90)
      expect(label.label).toBe('Highly Responsive')
      expect(label.color).toBe('bg-green-100 text-green-700')
      expect(isResponsive).toBe(true)
    })

    it('should calculate score and get correct label for responsive coach', () => {
      const input: CoachResponsivenessInput = {
        outboundCount: 10,
        inboundCount: 6,
      }

      const score = calculateResponsivenessScore(input)
      const label = getResponsivenessLabel(score)
      const isResponsive = isResponsiveCoach(score)

      expect(score).toBe(60)
      expect(label.label).toBe('Responsive')
      expect(label.color).toBe('bg-blue-100 text-blue-700')
      expect(isResponsive).toBe(true)
    })

    it('should calculate score and get correct label for moderately responsive coach', () => {
      const input: CoachResponsivenessInput = {
        outboundCount: 10,
        inboundCount: 4,
      }

      const score = calculateResponsivenessScore(input)
      const label = getResponsivenessLabel(score)
      const isResponsive = isResponsiveCoach(score)

      expect(score).toBe(40)
      expect(label.label).toBe('Moderately Responsive')
      expect(label.color).toBe('bg-yellow-100 text-yellow-700')
      expect(isResponsive).toBe(false)
    })

    it('should calculate score and get correct label for low responsiveness coach', () => {
      const input: CoachResponsivenessInput = {
        outboundCount: 10,
        inboundCount: 1,
      }

      const score = calculateResponsivenessScore(input)
      const label = getResponsivenessLabel(score)
      const isResponsive = isResponsiveCoach(score)

      expect(score).toBe(10)
      expect(label.label).toBe('Low Responsiveness')
      expect(label.color).toBe('bg-red-100 text-red-700')
      expect(isResponsive).toBe(false)
    })

    it('should handle no responses from coach', () => {
      const input: CoachResponsivenessInput = {
        outboundCount: 15,
        inboundCount: 0,
      }

      const score = calculateResponsivenessScore(input)
      const label = getResponsivenessLabel(score)
      const isResponsive = isResponsiveCoach(score)

      expect(score).toBe(0)
      expect(label.label).toBe('Low Responsiveness')
      expect(isResponsive).toBe(false)
    })

    it('should handle coach with no outbound attempts', () => {
      const input: CoachResponsivenessInput = {
        outboundCount: 0,
        inboundCount: 5,
      }

      const score = calculateResponsivenessScore(input)
      const label = getResponsivenessLabel(score)
      const isResponsive = isResponsiveCoach(score)

      expect(score).toBe(0)
      expect(label.label).toBe('Low Responsiveness')
      expect(isResponsive).toBe(false)
    })
  })
})
