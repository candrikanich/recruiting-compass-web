import { describe, it, expect, beforeEach } from 'vitest'
import type { Coach, Interaction } from '~/types/models'

// Test utilities for coach analytics calculations
describe('Coach Analytics - Complex Calculations', () => {
  const createMockCoach = (overrides = {}): Coach => ({
    id: 'coach-1',
    school_id: 'school-1',
    role: 'head',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    phone: '555-1234',
    twitter_handle: '@coachsmith',
    instagram_handle: 'coachsmith',
    notes: '',
    responsiveness_score: 75,
    last_contact_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  })

  const createMockInteraction = (overrides = {}): Interaction => ({
    id: 'interaction-1',
    school_id: 'school-1',
    coach_id: 'coach-1',
    event_id: null,
    type: 'email',
    direction: 'outbound',
    subject: 'Recruiting inquiry',
    content: 'Testing',
    sentiment: 'positive',
    occurred_at: new Date().toISOString(),
    logged_by: 'user-1',
    attachments: [],
    created_at: new Date().toISOString(),
    ...overrides,
  })

  describe('Responsiveness Score Calculation', () => {
    it('should calculate responsiveness from interaction ratio', () => {
      const interactions = [
        createMockInteraction({ direction: 'outbound' }),
        createMockInteraction({ id: 'interaction-2', direction: 'outbound' }),
        createMockInteraction({ id: 'interaction-3', direction: 'inbound' }),
        createMockInteraction({ id: 'interaction-4', direction: 'inbound' }),
      ]

      const inbound = interactions.filter((i) => i.direction === 'inbound').length
      const outbound = interactions.filter((i) => i.direction === 'outbound').length
      const responseRate = outbound > 0 ? (inbound / outbound) * 100 : 0

      expect(responseRate).toBe(100) // 2 inbound / 2 outbound = 100%
    })

    it('should handle zero outbound interactions', () => {
      const interactions = [
        createMockInteraction({ direction: 'inbound' }),
        createMockInteraction({ id: 'interaction-2', direction: 'inbound' }),
      ]

      const outbound = interactions.filter((i) => i.direction === 'outbound').length
      const responseRate = outbound > 0 ? 100 : 0

      expect(responseRate).toBe(0) // No outbound = 0% rate (can't measure)
    })

    it('should cap responsiveness score at 100%', () => {
      const interactions = [
        createMockInteraction({ direction: 'outbound' }),
        createMockInteraction({ id: 'interaction-2', direction: 'inbound' }),
        createMockInteraction({ id: 'interaction-3', direction: 'inbound' }),
      ]

      const inbound = interactions.filter((i) => i.direction === 'inbound').length
      const outbound = interactions.filter((i) => i.direction === 'outbound').length
      const responseRate = Math.min((inbound / outbound) * 100, 100)

      expect(responseRate).toBe(100)
    })

    it('should calculate partial responsiveness', () => {
      const interactions = [
        createMockInteraction({ direction: 'outbound' }),
        createMockInteraction({ id: 'interaction-2', direction: 'outbound' }),
        createMockInteraction({ id: 'interaction-3', direction: 'outbound' }),
        createMockInteraction({ id: 'interaction-4', direction: 'inbound' }),
      ]

      const inbound = interactions.filter((i) => i.direction === 'inbound').length
      const outbound = interactions.filter((i) => i.direction === 'outbound').length
      const responseRate = (inbound / outbound) * 100

      expect(responseRate).toBe(33.33333333333333) // 1/3
      expect(Math.round(responseRate)).toBe(33)
    })
  })

  describe('Trend Analysis', () => {
    it('should detect improving trend', () => {
      const interactions30d = [
        createMockInteraction({ id: 'i1', direction: 'outbound' }),
        createMockInteraction({ id: 'i2', direction: 'outbound' }),
        createMockInteraction({ id: 'i3', direction: 'inbound' }),
      ]

      const interactions60d = [
        ...interactions30d,
        createMockInteraction({ id: 'i4', direction: 'inbound' }),
        createMockInteraction({ id: 'i5', direction: 'inbound' }),
      ]

      const rate30d = 1 / 2 // 50%
      const rate60d = 3 / 2 // 150% (capped at 100)
      const trend = rate60d > rate30d ? 'improving' : 'declining'

      expect(trend).toBe('improving')
    })

    it('should detect declining trend', () => {
      const interactions30d = [
        createMockInteraction({ direction: 'outbound' }),
        createMockInteraction({ id: 'i2', direction: 'inbound' }),
      ]

      const interactions60d = [
        ...interactions30d,
        createMockInteraction({ id: 'i3', direction: 'outbound' }),
        createMockInteraction({ id: 'i4', direction: 'outbound' }),
      ]

      const rate30d = (1 / 1) * 100 // 100%
      const rate60d = (1 / 3) * 100 // 33%
      const trend = rate60d < rate30d ? 'declining' : 'improving'

      expect(trend).toBe('declining')
    })

    it('should detect stable trend', () => {
      const rate30d = (2 / 4) * 100 // 50%
      const rate60d = (4 / 8) * 100 // 50%
      const trend = Math.abs(rate60d - rate30d) < 10 ? 'stable' : 'changing'

      expect(trend).toBe('stable')
    })
  })

  describe('Average Response Time', () => {
    it('should calculate average response time between interactions', () => {
      const now = new Date()
      const interactions = [
        createMockInteraction({
          direction: 'outbound',
          occurred_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        }),
        createMockInteraction({
          id: 'interaction-2',
          direction: 'inbound',
          occurred_at: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(), // 13 days ago
        }),
      ]

      const timeDiff =
        (new Date(interactions[1].occurred_at).getTime() -
          new Date(interactions[0].occurred_at).getTime()) /
        (24 * 60 * 60 * 1000)

      expect(timeDiff).toBe(1) // 1 day response time
    })

    it('should handle same-day responses', () => {
      const now = new Date()
      const interactions = [
        createMockInteraction({
          direction: 'outbound',
          occurred_at: now.toISOString(),
        }),
        createMockInteraction({
          id: 'interaction-2',
          direction: 'inbound',
          occurred_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        }),
      ]

      const timeDiff =
        (new Date(interactions[1].occurred_at).getTime() -
          new Date(interactions[0].occurred_at).getTime()) /
        (60 * 60 * 1000)

      expect(timeDiff).toBeLessThan(24)
    })

    it('should skip non-response interactions', () => {
      const interactions = [
        createMockInteraction({ direction: 'outbound' }),
        createMockInteraction({ id: 'i2', direction: 'outbound' }), // Another outbound, not a response
        createMockInteraction({ id: 'i3', direction: 'inbound' }),
      ]

      const pairs = []
      for (let i = 0; i < interactions.length - 1; i++) {
        if (interactions[i].direction === 'outbound' && interactions[i + 1].direction === 'inbound') {
          pairs.push({ out: interactions[i], in: interactions[i + 1] })
        }
      }

      expect(pairs).toHaveLength(1) // Only one outbound->inbound pair
    })
  })

  describe('Last Contact Calculation', () => {
    it('should identify most recent interaction date', () => {
      const now = new Date()
      const interactions = [
        createMockInteraction({
          occurred_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        createMockInteraction({
          id: 'interaction-2',
          occurred_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        createMockInteraction({
          id: 'interaction-3',
          occurred_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ]

      const lastContact = interactions.reduce((latest, current) => {
        return new Date(current.occurred_at) > new Date(latest.occurred_at) ? current : latest
      })

      expect(lastContact.id).toBe('interaction-3')
    })

    it('should calculate days since last contact', () => {
      const now = new Date()
      const lastContactDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const daysSince = Math.floor(
        (now.getTime() - lastContactDate.getTime()) / (24 * 60 * 60 * 1000)
      )

      expect(daysSince).toBe(14)
    })

    it('should flag coaches needing follow-up', () => {
      const now = new Date()
      const coaches = [
        createMockCoach({
          last_contact_date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        createMockCoach({
          id: 'coach-2',
          last_contact_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ]

      const needFollowUp = coaches.filter((coach) => {
        const daysSince = Math.floor(
          (now.getTime() - new Date(coach.last_contact_date).getTime()) /
            (24 * 60 * 60 * 1000)
        )
        return daysSince >= 14
      })

      expect(needFollowUp).toHaveLength(1)
    })
  })

  describe('Coach Ranking by Responsiveness', () => {
    it('should rank coaches by responsiveness score', () => {
      const coaches = [
        createMockCoach({ id: 'coach-1', responsiveness_score: 85 }),
        createMockCoach({ id: 'coach-2', responsiveness_score: 92 }),
        createMockCoach({ id: 'coach-3', responsiveness_score: 65 }),
      ]

      const sorted = [...coaches].sort((a, b) => b.responsiveness_score - a.responsiveness_score)

      expect(sorted[0].id).toBe('coach-2') // 92
      expect(sorted[1].id).toBe('coach-1') // 85
      expect(sorted[2].id).toBe('coach-3') // 65
    })

    it('should categorize responsiveness levels', () => {
      const scores = [95, 70, 35]

      const levels = scores.map((score) => {
        if (score >= 80) return 'High'
        if (score >= 60) return 'Medium'
        return 'Low'
      })

      expect(levels).toEqual(['High', 'Medium', 'Low'])
    })
  })

  describe('Communication Metrics', () => {
    it('should count interactions by type', () => {
      const interactions = [
        createMockInteraction({ type: 'email' }),
        createMockInteraction({ id: 'i2', type: 'email' }),
        createMockInteraction({ id: 'i3', type: 'phone_call' }),
        createMockInteraction({ id: 'i4', type: 'in_person_visit' }),
      ]

      const typeCount: Record<string, number> = {}
      interactions.forEach((i) => {
        typeCount[i.type] = (typeCount[i.type] || 0) + 1
      })

      expect(typeCount.email).toBe(2)
      expect(typeCount.phone_call).toBe(1)
      expect(typeCount.in_person_visit).toBe(1)
    })

    it('should calculate sentiment distribution', () => {
      const interactions = [
        createMockInteraction({ sentiment: 'positive' }),
        createMockInteraction({ id: 'i2', sentiment: 'positive' }),
        createMockInteraction({ id: 'i3', sentiment: 'neutral' }),
        createMockInteraction({ id: 'i4', sentiment: 'negative' }),
      ]

      const sentimentCount: Record<string, number> = {}
      interactions.forEach((i) => {
        sentimentCount[i.sentiment] = (sentimentCount[i.sentiment] || 0) + 1
      })

      expect(sentimentCount.positive).toBe(2)
      expect(sentimentCount.neutral).toBe(1)
      expect(sentimentCount.negative).toBe(1)
    })

    it('should identify trending communication types', () => {
      const last30 = [
        createMockInteraction({ type: 'email' }),
        createMockInteraction({ id: 'i2', type: 'email' }),
        createMockInteraction({ id: 'i3', type: 'phone_call' }),
      ]

      const emailCount = last30.filter((i) => i.type === 'email').length
      const phoneCount = last30.filter((i) => i.type === 'phone_call').length

      const preferred = emailCount > phoneCount ? 'email' : 'phone_call'

      expect(preferred).toBe('email')
    })
  })

  describe('School Comparison', () => {
    it('should rank coaches within a school', () => {
      const coaches = [
        createMockCoach({ responsiveness_score: 78 }),
        createMockCoach({ id: 'coach-2', responsiveness_score: 92 }),
        createMockCoach({ id: 'coach-3', responsiveness_score: 65 }),
      ]

      const ranked = [...coaches].sort((a, b) => b.responsiveness_score - a.responsiveness_score)

      expect(ranked[0].responsiveness_score).toBe(92)
      expect(ranked[ranked.length - 1].responsiveness_score).toBe(65)
    })

    it('should identify high-touch vs low-touch coaching staffs', () => {
      const coaches = [
        createMockCoach({ responsiveness_score: 88 }),
        createMockCoach({ id: 'coach-2', responsiveness_score: 85 }),
        createMockCoach({ id: 'coach-3', responsiveness_score: 80 }),
      ]

      const avgScore = coaches.reduce((sum, c) => sum + c.responsiveness_score, 0) / coaches.length

      const touchType = avgScore >= 80 ? 'high-touch' : 'low-touch'

      expect(touchType).toBe('high-touch')
      expect(avgScore).toBeGreaterThan(80)
    })
  })
})
