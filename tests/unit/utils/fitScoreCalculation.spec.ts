import { describe, it, expect } from 'vitest'
import {
  calculateFitScore,
  getFitTier,
  calculateAthleticFit,
  calculateAcademicFit,
  calculateOpportunityFit,
  calculatePersonalFit,
  calculatePortfolioHealth,
  getFitScoreRecommendation,
} from '~/utils/fitScoreCalculation'
import type { FitScoreInputs } from '~/types/timeline'

describe('utils/fitScoreCalculation', () => {
  describe('calculateFitScore', () => {
    describe('Happy Path', () => {
      it('should calculate total fit score from all dimensions', () => {
        const inputs: Partial<FitScoreInputs> = {
          athleticFit: 30,
          academicFit: 20,
          opportunityFit: 15,
          personalFit: 10,
        }

        const result = calculateFitScore(inputs)
        expect(result.score).toBe(75)
        expect(result.tier).toBe('match')
        expect(result.breakdown).toEqual(inputs)
      })

      it('should identify missing dimensions', () => {
        const inputs: Partial<FitScoreInputs> = {
          athleticFit: 30,
          academicFit: 20,
        }

        const result = calculateFitScore(inputs)
        expect(result.missingDimensions).toContain('opportunity')
        expect(result.missingDimensions).toContain('personal')
        expect(result.missingDimensions.length).toBe(2)
      })

      it('should handle empty inputs', () => {
        const result = calculateFitScore({})
        expect(result.score).toBe(0)
        expect(result.tier).toBe('unlikely')
        expect(result.missingDimensions.length).toBe(4)
      })

      it('should calculate perfect score', () => {
        const inputs: Partial<FitScoreInputs> = {
          athleticFit: 40,
          academicFit: 25,
          opportunityFit: 20,
          personalFit: 15,
        }

        const result = calculateFitScore(inputs)
        expect(result.score).toBe(100)
        expect(result.tier).toBe('match')
        expect(result.missingDimensions.length).toBe(0)
      })
    })

    describe('Boundary Values', () => {
      it('should clamp athletic fit to 40 max', () => {
        const result = calculateFitScore({ athleticFit: 100 })
        expect(result.breakdown.athleticFit).toBe(40)
      })

      it('should clamp academic fit to 25 max', () => {
        const result = calculateFitScore({ academicFit: 50 })
        expect(result.breakdown.academicFit).toBe(25)
      })

      it('should clamp opportunity fit to 20 max', () => {
        const result = calculateFitScore({ opportunityFit: 100 })
        expect(result.breakdown.opportunityFit).toBe(20)
      })

      it('should clamp personal fit to 15 max', () => {
        const result = calculateFitScore({ personalFit: 100 })
        expect(result.breakdown.personalFit).toBe(15)
      })

      it('should handle negative values', () => {
        const result = calculateFitScore({ athleticFit: -10 })
        expect(result.breakdown.athleticFit).toBe(0)
      })

      it('should correctly tier at exactly 70', () => {
        const result = calculateFitScore({
          athleticFit: 30,
          academicFit: 25,
          opportunityFit: 15,
        })
        expect(result.score).toBe(70)
        expect(result.tier).toBe('match')
      })

      it('should correctly tier at exactly 50', () => {
        const result = calculateFitScore({
          athleticFit: 30,
          academicFit: 20,
        })
        expect(result.score).toBe(50)
        expect(result.tier).toBe('reach')
      })

      it('should correctly tier below 50', () => {
        const result = calculateFitScore({ athleticFit: 20 })
        expect(result.score).toBe(20)
        expect(result.tier).toBe('unlikely')
      })
    })

    describe('Edge Cases', () => {
      it('should handle partial inputs with defaults', () => {
        const result = calculateFitScore({ athleticFit: 40 })
        expect(result.breakdown.athleticFit).toBe(40)
        expect(result.breakdown.academicFit).toBe(0)
        expect(result.breakdown.opportunityFit).toBe(0)
        expect(result.breakdown.personalFit).toBe(0)
      })

      it('should not identify dimension as missing if it has value > 0', () => {
        const result = calculateFitScore({ athleticFit: 1 })
        expect(result.missingDimensions).not.toContain('athletic')
      })

      it('should identify dimension as missing if value is exactly 0', () => {
        const result = calculateFitScore({ athleticFit: 0 })
        expect(result.missingDimensions).toContain('athletic')
      })
    })
  })

  describe('getFitTier', () => {
    it('should return match for score >= 70', () => {
      expect(getFitTier(70)).toBe('match')
      expect(getFitTier(85)).toBe('match')
      expect(getFitTier(100)).toBe('match')
    })

    it('should return reach for score 50-69', () => {
      expect(getFitTier(50)).toBe('reach')
      expect(getFitTier(60)).toBe('reach')
      expect(getFitTier(69)).toBe('reach')
    })

    it('should return unlikely for score < 50', () => {
      expect(getFitTier(0)).toBe('unlikely')
      expect(getFitTier(25)).toBe('unlikely')
      expect(getFitTier(49)).toBe('unlikely')
    })

    it('should handle edge case of exactly 50', () => {
      expect(getFitTier(50)).toBe('reach')
    })

    it('should handle edge case of exactly 70', () => {
      expect(getFitTier(70)).toBe('match')
    })
  })

  describe('calculateAthleticFit', () => {
    it('should calculate athletic fit with all data', () => {
      const result = calculateAthleticFit(
        'SS', // position
        72, // height in inches
        195, // weight
        88, // velo
        ['SS', '2B', '3B'],
        'high',
        50
      )
      expect(result).toBeGreaterThan(20)
      expect(result).toBeLessThanOrEqual(40)
    })

    it('should award full points for position match', () => {
      const result = calculateAthleticFit('SS', 72, 195, 88, ['SS'], 'high', 50)
      expect(result).toBeGreaterThan(25)
    })

    it('should award less points for position mismatch', () => {
      const result = calculateAthleticFit('SS', 72, 195, 88, ['C'], 'high', 50)
      expect(result).toBeLessThan(25)
    })

    it('should award points for high coach interest', () => {
      const resultHigh = calculateAthleticFit(
        'SS',
        72,
        195,
        88,
        ['SS'],
        'high',
        50
      )
      const resultLow = calculateAthleticFit(
        'SS',
        72,
        195,
        88,
        ['SS'],
        'low',
        50
      )
      expect(resultHigh).toBeGreaterThan(resultLow)
    })

    it('should award points for optimal velo', () => {
      const result88 = calculateAthleticFit(
        'SS',
        72,
        195,
        88,
        ['SS'],
        'high',
        50
      )
      const result85 = calculateAthleticFit(
        'SS',
        72,
        195,
        85,
        ['SS'],
        'high',
        50
      )
      expect(result88).toBeGreaterThan(result85)
    })

    it('should handle null position', () => {
      const result = calculateAthleticFit(null, 72, 195, 88, ['SS'], 'high', 50)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(40)
    })

    it('should cap result at 40', () => {
      const result = calculateAthleticFit(
        'SS',
        72,
        195,
        90,
        ['SS'],
        'high',
        50
      )
      expect(result).toBeLessThanOrEqual(40)
    })
  })

  describe('calculateAcademicFit', () => {
    it('should calculate academic fit with all data', () => {
      const result = calculateAcademicFit(
        3.5, // athlete GPA
        1200, // athlete SAT
        null,
        3.3, // school avg GPA
        1150, // school avg SAT
        null,
        'Engineering',
        ['Engineering', 'Business', 'Liberal Arts']
      )
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(25)
    })

    it('should award more points for GPA alignment', () => {
      const aligned = calculateAcademicFit(3.5, 1200, null, 3.3, 1150, null)
      const misaligned = calculateAcademicFit(2.5, 1200, null, 3.8, 1350, null)
      expect(aligned).toBeGreaterThan(misaligned)
    })

    it('should award points for major offered', () => {
      const withMajor = calculateAcademicFit(
        3.5,
        1200,
        null,
        3.3,
        1150,
        null,
        'Engineering',
        ['Engineering', 'Business']
      )
      const withoutMajor = calculateAcademicFit(
        3.5,
        1200,
        null,
        3.3,
        1150,
        null,
        'Engineering',
        ['Business', 'Liberal Arts']
      )
      expect(withMajor).toBeGreaterThan(withoutMajor)
    })

    it('should handle ACT scores', () => {
      const result = calculateAcademicFit(3.5, null, 32, 3.3, null, 30)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(25)
    })

    it('should handle null values', () => {
      const result = calculateAcademicFit(null, null, null, null, null, null)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(25)
    })

    it('should cap result at 25', () => {
      const result = calculateAcademicFit(4.0, 1600, null, 4.0, 1600, null)
      expect(result).toBeLessThanOrEqual(25)
    })
  })

  describe('calculateOpportunityFit', () => {
    it('should calculate opportunity fit with standard inputs', () => {
      const result = calculateOpportunityFit(50, 3, 'medium', false)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(20)
    })

    it('should award more points for lower roster depth', () => {
      const lowDepth = calculateOpportunityFit(40, 3, 'medium', false)
      const highDepth = calculateOpportunityFit(85, 3, 'medium', false)
      expect(lowDepth).toBeGreaterThan(highDepth)
    })

    it('should award points for graduating classes', () => {
      const soon = calculateOpportunityFit(50, 1, 'medium', false)
      const far = calculateOpportunityFit(50, 4, 'medium', false)
      expect(soon).toBeGreaterThan(far)
    })

    it('should award points for scholarship availability', () => {
      const high = calculateOpportunityFit(50, 3, 'high', false)
      const low = calculateOpportunityFit(50, 3, 'low', false)
      expect(high).toBeGreaterThan(low)
    })

    it('should award points for walk-on history', () => {
      const withWalkOn = calculateOpportunityFit(50, 3, 'medium', true)
      const withoutWalkOn = calculateOpportunityFit(50, 3, 'medium', false)
      expect(withWalkOn).toBeGreaterThan(withoutWalkOn)
    })

    it('should cap result at 20', () => {
      const result = calculateOpportunityFit(0, 1, 'high', true)
      expect(result).toBeLessThanOrEqual(20)
    })
  })

  describe('calculatePersonalFit', () => {
    it('should calculate personal fit with all data', () => {
      const result = calculatePersonalFit(
        'CA', // athlete state
        'CA', // school state
        'medium',
        15000,
        'medium',
        30000,
        true,
        7
      )
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(15)
    })

    it('should award points for in-state preference', () => {
      const inState = calculatePersonalFit('CA', 'CA', 'medium', 15000, 'medium', 30000)
      const outOfState = calculatePersonalFit('CA', 'TX', 'medium', 15000, 'medium', 30000)
      expect(inState).toBeGreaterThan(outOfState)
    })

    it('should award points for priority school', () => {
      const priority = calculatePersonalFit('CA', 'CA', 'medium', 15000, 'medium', 30000, true)
      const notPriority = calculatePersonalFit(
        'CA',
        'CA',
        'medium',
        15000,
        'medium',
        30000,
        false
      )
      expect(priority).toBeGreaterThan(notPriority)
    })

    it('should consider cost sensitivity', () => {
      const highSensitivity = calculatePersonalFit(
        'CA',
        'CA',
        'medium',
        15000,
        'high',
        50000
      )
      const lowSensitivity = calculatePersonalFit(
        'CA',
        'CA',
        'medium',
        15000,
        'low',
        50000
      )
      expect(lowSensitivity).toBeGreaterThan(highSensitivity)
    })

    it('should award points for major strength', () => {
      const strong = calculatePersonalFit('CA', 'CA', 'medium', 15000, 'medium', 30000, false, 9)
      const weak = calculatePersonalFit('CA', 'CA', 'medium', 15000, 'medium', 30000, false, 3)
      expect(strong).toBeGreaterThan(weak)
    })

    it('should cap result at 15', () => {
      const result = calculatePersonalFit(
        'CA',
        'CA',
        'small',
        5000,
        'low',
        10000,
        true,
        10
      )
      expect(result).toBeLessThanOrEqual(15)
    })
  })

  describe('calculatePortfolioHealth', () => {
    it('should categorize schools by fit tier', () => {
      const schools = [
        { fit_score: 80, fit_tier: 'match' as const },
        { fit_score: 60, fit_tier: 'reach' as const },
        { fit_score: 40, fit_tier: 'unlikely' as const },
      ]

      const health = calculatePortfolioHealth(schools)
      expect(health.matches).toBe(1)
      expect(health.reaches).toBe(1)
      expect(health.unlikelies).toBe(1)
      expect(health.total).toBe(3)
    })

    it('should return not_started for empty portfolio', () => {
      const health = calculatePortfolioHealth([])
      expect(health.status).toBe('not_started')
      expect(health.total).toBe(0)
    })

    it('should warn if no safety schools', () => {
      const schools = [
        { fit_score: 80, fit_tier: 'match' as const },
        { fit_score: 60, fit_tier: 'reach' as const },
      ]

      const health = calculatePortfolioHealth(schools)
      expect(health.warnings.length).toBeGreaterThan(0)
      expect(health.status).toBe('needs_attention')
    })

    it('should warn if too many reach schools', () => {
      const schools = [
        { fit_score: 60, fit_tier: 'reach' as const },
        { fit_score: 55, fit_tier: 'reach' as const },
        { fit_score: 50, fit_tier: 'reach' as const },
        { fit_score: 80, fit_tier: 'match' as const },
      ]

      const health = calculatePortfolioHealth(schools)
      expect(health.warnings.some(w => w.includes('reach'))).toBe(true)
    })

    it('should warn if portfolio too small', () => {
      const schools = [{ fit_score: 80, fit_tier: 'match' as const }]

      const health = calculatePortfolioHealth(schools)
      expect(health.warnings.some(w => w.includes('schools'))).toBe(true)
    })

    it('should indicate healthy portfolio', () => {
      const schools = [
        { fit_score: 85, fit_tier: 'match' as const },
        { fit_score: 80, fit_tier: 'match' as const },
        { fit_score: 60, fit_tier: 'reach' as const },
        { fit_score: 75, fit_tier: 'safety' as const },
        { fit_score: 72, fit_tier: 'safety' as const },
      ]

      const health = calculatePortfolioHealth(schools)
      expect(health.warnings.length).toBe(0)
      expect(health.status).toBe('healthy')
    })
  })

  describe('getFitScoreRecommendation', () => {
    it('should recommend for match tier', () => {
      const rec = getFitScoreRecommendation(80, 'match')
      expect(rec).toContain('Excellent')
    })

    it('should recommend for safety tier', () => {
      const rec = getFitScoreRecommendation(75, 'safety')
      expect(rec).toContain('Good')
    })

    it('should recommend for reach tier', () => {
      const rec = getFitScoreRecommendation(60, 'reach')
      expect(rec).toContain('possible')
    })

    it('should recommend for unlikely tier', () => {
      const rec = getFitScoreRecommendation(30, 'unlikely')
      expect(rec).toContain('not')
    })

    it('should include score in reach recommendation', () => {
      const rec = getFitScoreRecommendation(55, 'reach')
      expect(rec).toContain('55')
    })
  })

  describe('Integration Tests', () => {
    it('should calculate complete fit profile', () => {
      const athleticFit = calculateAthleticFit('SS', 72, 195, 88, ['SS'], 'medium', 50)
      const academicFit = calculateAcademicFit(3.2, 1100, null, 3.0, 1050, null)
      const opportunityFit = calculateOpportunityFit(55, 2, 'medium', false)
      const personalFit = calculatePersonalFit('CA', 'CA', 'medium', 12000, 'medium', 28000)

      const fitScore = calculateFitScore({
        athleticFit,
        academicFit,
        opportunityFit,
        personalFit,
      })

      expect(fitScore.score).toBeGreaterThan(0)
      expect(fitScore.tier).toBeDefined()
      expect(fitScore.breakdown).toBeDefined()
    })

    it('should handle complete portfolio analysis', () => {
      const schools = [
        {
          fit_score: 85,
          fit_tier: 'match' as const,
        },
        {
          fit_score: 65,
          fit_tier: 'reach' as const,
        },
        {
          fit_score: 78,
          fit_tier: 'safety' as const,
        },
      ]

      const health = calculatePortfolioHealth(schools)
      expect(health.total).toBe(3)
      expect(health.matches).toBe(1)
      expect(health.reaches).toBe(1)
      expect(health.safeties).toBe(1)
      expect(health.warnings.length).toBeLessThan(2)
    })
  })
})
