import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CoachCard from '~/components/CoachCard.vue'
import type { Coach } from '~/types/models'

// Mock the coachResponsiveness utility
vi.mock('~/utils/coachResponsiveness', () => ({
  getResponsivenessLabel: vi.fn((score: number) => {
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
  }),
}))

describe('CoachCard.vue', () => {
  const createMockCoach = (overrides = {}): Coach => ({
    id: 'coach-1',
    school_id: 'school-123',
    user_id: 'user-123',
    role: 'head',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@university.edu',
    phone: '555-1234',
    twitter_handle: '@coachsmith',
    instagram_handle: 'coachsmith',
    notes: 'Great head coach',
    responsiveness_score: 85,
    last_contact_date: '2024-01-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  })

  describe('Rendering', () => {
    it('should render coach name', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('John Smith')
    })

    it('should render coach role', () => {
      const coach = createMockCoach({ role: 'head' })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('Head Coach')
    })

    it('should render assistant coach role', () => {
      const coach = createMockCoach({ role: 'assistant' })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('Assistant Coach')
    })

    it('should render recruiting coordinator role', () => {
      const coach = createMockCoach({ role: 'recruiting' })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('Recruiting Coordinator')
    })

    it('should render school name when provided', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: {
          coach,
          schoolName: 'University of Test',
        },
      })

      expect(wrapper.text()).toContain('University of Test')
    })

    it('should not render school name section when not provided', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const schoolElements = wrapper.findAll('.text-xs.text-gray-400')
      expect(schoolElements).toHaveLength(0)
    })
  })

  describe('Responsiveness Display', () => {
    it('should display responsiveness score and label', () => {
      const coach = createMockCoach({ responsiveness_score: 85 })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('85%')
      expect(wrapper.text()).toContain('Highly Responsive')
    })

    it('should apply green color class for highly responsive coach (75+)', () => {
      const coach = createMockCoach({ responsiveness_score: 90 })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const badge = wrapper.find('.bg-green-100')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('text-green-700')
    })

    it('should apply blue color class for responsive coach (50-74)', () => {
      const coach = createMockCoach({ responsiveness_score: 60 })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const badge = wrapper.find('.bg-blue-100')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('text-blue-700')
    })

    it('should apply yellow color class for moderately responsive coach (25-49)', () => {
      const coach = createMockCoach({ responsiveness_score: 35 })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const badge = wrapper.find('.bg-yellow-100')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('text-yellow-700')
    })

    it('should apply red color class for low responsiveness coach (0-24)', () => {
      const coach = createMockCoach({ responsiveness_score: 10 })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const badge = wrapper.find('.bg-red-100')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('text-red-700')
    })

    it('should not display responsiveness when score is undefined', () => {
      const coach = createMockCoach({ responsiveness_score: undefined as any })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).not.toContain('Responsive')
    })

    it('should not display responsiveness when score is null', () => {
      const coach = createMockCoach({ responsiveness_score: null as any })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).not.toContain('Responsive')
    })

    it('should display responsiveness when score is 0', () => {
      const coach = createMockCoach({ responsiveness_score: 0 })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('0%')
      expect(wrapper.text()).toContain('Low Responsiveness')
    })
  })

  describe('Contact Information', () => {
    it('should display email with mailto link', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const emailLink = wrapper.find('a[href="mailto:john.smith@university.edu"]')
      expect(emailLink.exists()).toBe(true)
      expect(emailLink.text()).toBe('john.smith@university.edu')
    })

    it('should display phone with tel link', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const phoneLink = wrapper.find('a[href="tel:555-1234"]')
      expect(phoneLink.exists()).toBe(true)
      expect(phoneLink.text()).toBe('555-1234')
    })

    it('should display Twitter handle with link', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const twitterLink = wrapper.find('a[href="https://twitter.com/coachsmith"]')
      expect(twitterLink.exists()).toBe(true)
      expect(twitterLink.text()).toBe('@coachsmith')
      expect(twitterLink.attributes('target')).toBe('_blank')
    })

    it('should display Instagram handle with link', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const instagramLink = wrapper.find('a[href="https://instagram.com/coachsmith"]')
      expect(instagramLink.exists()).toBe(true)
      expect(instagramLink.text()).toBe('coachsmith')
      expect(instagramLink.attributes('target')).toBe('_blank')
    })

    it('should display last contact date', () => {
      const coach = createMockCoach({ last_contact_date: '2024-01-15' })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('Last contact')
      expect(wrapper.text()).toContain('Jan 15, 2024')
    })

    it('should not display email when null', () => {
      const coach = createMockCoach({ email: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const emailLink = wrapper.find('a[href^="mailto:"]')
      expect(emailLink.exists()).toBe(false)
    })

    it('should not display phone when null', () => {
      const coach = createMockCoach({ phone: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const phoneLink = wrapper.find('a[href^="tel:"]')
      expect(phoneLink.exists()).toBe(false)
    })

    it('should not display Twitter when null', () => {
      const coach = createMockCoach({ twitter_handle: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const twitterLink = wrapper.find('a[href^="https://twitter.com/"]')
      expect(twitterLink.exists()).toBe(false)
    })

    it('should not display Instagram when null', () => {
      const coach = createMockCoach({ instagram_handle: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const instagramLink = wrapper.find('a[href^="https://instagram.com/"]')
      expect(instagramLink.exists()).toBe(false)
    })

    it('should not display last contact when null', () => {
      const coach = createMockCoach({ last_contact_date: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).not.toContain('Last contact')
    })

    it('should strip @ from Twitter handle in URL', () => {
      const coach = createMockCoach({ twitter_handle: '@coachsmith' })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const link = wrapper.find('a[href="https://twitter.com/coachsmith"]')
      expect(link.exists()).toBe(true)
    })

    it('should strip @ from Instagram handle in URL', () => {
      const coach = createMockCoach({ instagram_handle: '@coachsmith' })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const link = wrapper.find('a[href="https://instagram.com/coachsmith"]')
      expect(link.exists()).toBe(true)
    })
  })

  describe('Notes', () => {
    it('should display notes when provided', () => {
      const coach = createMockCoach({ notes: 'Great head coach' })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('Great head coach')
    })

    it('should not display notes section when null', () => {
      const coach = createMockCoach({ notes: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const notesSection = wrapper.find('.border-t.border-gray-200')
      expect(notesSection.exists()).toBe(false)
    })
  })

  describe('Quick Action Buttons', () => {
    it('should display email button when email exists', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const emailButton = wrapper.find('button[title="Send email"]')
      expect(emailButton.exists()).toBe(true)
      expect(emailButton.text()).toContain('Email')
    })

    it('should not display email button when email is null', () => {
      const coach = createMockCoach({ email: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const emailButton = wrapper.find('button[title="Send email"]')
      expect(emailButton.exists()).toBe(false)
    })

    it('should display text button when phone exists', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const textButton = wrapper.find('button[title="Send text"]')
      expect(textButton.exists()).toBe(true)
      expect(textButton.text()).toContain('Text')
    })

    it('should not display text button when phone is null', () => {
      const coach = createMockCoach({ phone: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const textButton = wrapper.find('button[title="Send text"]')
      expect(textButton.exists()).toBe(false)
    })

    it('should display tweet button when Twitter handle exists', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const tweetButton = wrapper.find('button[title="Visit Twitter"]')
      expect(tweetButton.exists()).toBe(true)
      expect(tweetButton.text()).toContain('Tweet')
    })

    it('should not display tweet button when Twitter handle is null', () => {
      const coach = createMockCoach({ twitter_handle: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const tweetButton = wrapper.find('button[title="Visit Twitter"]')
      expect(tweetButton.exists()).toBe(false)
    })

    it('should display Instagram button when Instagram handle exists', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const instagramButton = wrapper.find('button[title="Visit Instagram"]')
      expect(instagramButton.exists()).toBe(true)
      expect(instagramButton.text()).toContain('Instagram')
    })

    it('should not display Instagram button when Instagram handle is null', () => {
      const coach = createMockCoach({ instagram_handle: null })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const instagramButton = wrapper.find('button[title="Visit Instagram"]')
      expect(instagramButton.exists()).toBe(false)
    })

    it('should always display view button', () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const viewButton = wrapper.find('button[title="View details"]')
      expect(viewButton.exists()).toBe(true)
    })
  })

  describe('Event Emissions', () => {
    it('should emit email event when email button is clicked', async () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const emailButton = wrapper.find('button[title="Send email"]')
      await emailButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('email')
      expect(wrapper.emitted('email')?.[0]).toEqual([coach])
    })

    it('should emit text event when text button is clicked', async () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const textButton = wrapper.find('button[title="Send text"]')
      await textButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('text')
      expect(wrapper.emitted('text')?.[0]).toEqual([coach])
    })

    it('should emit tweet event when tweet button is clicked', async () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const tweetButton = wrapper.find('button[title="Visit Twitter"]')
      await tweetButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('tweet')
      expect(wrapper.emitted('tweet')?.[0]).toEqual([coach])
    })

    it('should emit instagram event when Instagram button is clicked', async () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const instagramButton = wrapper.find('button[title="Visit Instagram"]')
      await instagramButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('instagram')
      expect(wrapper.emitted('instagram')?.[0]).toEqual([coach])
    })

    it('should emit view event when view button is clicked', async () => {
      const coach = createMockCoach()
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      const viewButton = wrapper.find('button[title="View details"]')
      await viewButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('view')
      expect(wrapper.emitted('view')?.[0]).toEqual([coach])
    })
  })

  describe('Edge Cases', () => {
    it('should handle coach with no contact info', () => {
      const coach = createMockCoach({
        email: null,
        phone: null,
        twitter_handle: null,
        instagram_handle: null,
        notes: null,
        last_contact_date: null,
      })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      // Should still render name and role
      expect(wrapper.text()).toContain('John Smith')
      expect(wrapper.text()).toContain('Head Coach')

      // Should only show view button
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0].attributes('title')).toBe('View details')
    })

    it('should handle long coach names', () => {
      const coach = createMockCoach({
        first_name: 'Christopher',
        last_name: 'Vanderbilt-Johnson',
      })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('Christopher Vanderbilt-Johnson')
    })

    it('should handle long email addresses', () => {
      const coach = createMockCoach({
        email: 'christopher.vanderbilt.johnson@university.edu',
      })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('christopher.vanderbilt.johnson@university.edu')
    })

    it('should handle unusual phone formats', () => {
      const coach = createMockCoach({ phone: '(555) 123-4567 ext. 890' })
      const wrapper = mount(CoachCard, {
        props: { coach },
      })

      expect(wrapper.text()).toContain('(555) 123-4567 ext. 890')
    })

    it('should handle responsiveness score boundaries', () => {
      const scores = [0, 25, 50, 75, 100]
      scores.forEach((score) => {
        const coach = createMockCoach({ responsiveness_score: score })
        const wrapper = mount(CoachCard, {
          props: { coach },
        })

        expect(wrapper.text()).toContain(`${score}%`)
      })
    })
  })
})
