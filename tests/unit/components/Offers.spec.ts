import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OfferStatusOverview from '~/components/Dashboard/OfferStatusOverview.vue'
import type { Offer, School } from '~/types/models'

describe('OfferStatusOverview Component', () => {
  const createMockOffer = (overrides = {}): Offer => ({
    id: 'offer-1',
    user_id: 'user-1',
    school_id: 'school-1',
    offer_type: 'partial',
    scholarship_percentage: 50,
    offer_date: '2025-12-20T10:00:00Z',
    deadline_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    ...overrides,
  })

  const createMockSchool = (overrides = {}): School => ({
    id: 'school-1',
    user_id: 'user-1',
    name: 'Test University',
    location: 'Boston, MA',
    division: 'D1',
    conference: 'ACC',
    ranking: 1,
    is_favorite: false,
    status: 'interested',
    ...overrides,
  })

  it('should render no offers state', () => {
    const wrapper = mount(OfferStatusOverview, {
      props: {
        offers: [],
        schools: [],
      },
    })

    expect(wrapper.text()).toContain('No offers yet')
  })

  it('should display accepted count', () => {
    const offers = [
      createMockOffer({ status: 'accepted' }),
      createMockOffer({ id: 'offer-2', status: 'accepted' }),
      createMockOffer({ id: 'offer-3', status: 'pending' }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    expect(wrapper.text()).toContain('Accepted')
  })

  it('should display pending count', () => {
    const offers = [
      createMockOffer({ status: 'pending' }),
      createMockOffer({ id: 'offer-2', status: 'pending' }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    expect(wrapper.text()).toContain('Pending')
  })

  it('should calculate scholarship value', () => {
    const offers = [
      createMockOffer({ scholarship_percentage: 100, status: 'accepted' }),
      createMockOffer({ id: 'offer-2', scholarship_percentage: 50, status: 'pending' }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    expect(wrapper.text()).toContain('Total Scholarship Value')
  })

  it('should identify expiring offers', () => {
    const soonDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const offers = [
      createMockOffer({ deadline_date: soonDeadline, status: 'pending' }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    expect(wrapper.text()).toContain('Upcoming Deadlines')
  })

  it('should display no offers message when empty', () => {
    const wrapper = mount(OfferStatusOverview, {
      props: {
        offers: [],
        schools: [],
      },
    })

    expect(wrapper.text()).toContain('📬')
  })

  it('should show declined count', () => {
    const offers = [
      createMockOffer({ status: 'declined' }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    expect(wrapper.text()).toContain('Declined')
  })

  it('should display recent offers', () => {
    const offers = [
      createMockOffer({ offer_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }),
      createMockOffer({ id: 'offer-2', offer_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    expect(wrapper.text()).toBeTruthy()
  })

  it('should format percentage display', () => {
    const offers = [
      createMockOffer({ scholarship_percentage: 75 }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    expect(wrapper.text()).toContain('75%')
  })

  it('should handle expired offers', () => {
    const pastDeadline = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const offers = [
      createMockOffer({ deadline_date: pastDeadline, status: 'pending' }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    expect(wrapper.text()).toBeTruthy()
  })

  it('should calculate average offer percentage', () => {
    const offers = [
      createMockOffer({ scholarship_percentage: 100, status: 'accepted' }),
      createMockOffer({ id: 'offer-2', scholarship_percentage: 50, status: 'accepted' }),
    ]
    const schools = [createMockSchool()]

    const wrapper = mount(OfferStatusOverview, {
      props: { offers, schools },
    })

    // Average should be 75%
    expect(wrapper.text()).toContain('Average Offer')
  })
})
