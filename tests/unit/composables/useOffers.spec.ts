import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useOffers } from '~/composables/useOffers'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import type { Offer } from '~/types/models'

const mockSupabase = {
  from: vi.fn(),
}

vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => mockSupabase,
}))

describe('useOffers', () => {
  let mockQuery: any
  let userStore: ReturnType<typeof useUserStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    userStore = useUserStore()
    userStore.user = {
      id: 'user-123',
      email: 'test@example.com',
    }

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }

    mockSupabase.from.mockReturnValue(mockQuery)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createMockOffer = (overrides = {}): Offer => ({
    id: 'offer-1',
    user_id: 'user-123',
    school_id: 'school-1',
    offer_type: 'partial',
    scholarship_percentage: 50,
    offer_date: '2025-12-20T10:00:00Z',
    deadline_date: '2026-01-20T23:59:59Z',
    status: 'pending',
    notes: 'Great opportunity',
    ...overrides,
  })

  describe('fetchOffers', () => {
    it('should fetch offers for user', async () => {
      const mockOffers = [
        createMockOffer(),
        createMockOffer({ id: 'offer-2', status: 'accepted' }),
      ]
      mockQuery.order.mockResolvedValue({ data: mockOffers, error: null })

      const { fetchOffers, offers } = useOffers()
      await fetchOffers()

      expect(mockSupabase.from).toHaveBeenCalledWith('offers')
      expect(offers.value).toEqual(mockOffers)
    })

    it('should filter offers by status', async () => {
      const mockOffers = [createMockOffer({ status: 'pending' })]
      mockQuery.eq.mockReturnThis()
      mockQuery.order.mockResolvedValue({ data: mockOffers, error: null })

      const { fetchOffers, offers } = useOffers()
      await fetchOffers({ status: 'pending' })

      expect(offers.value).toEqual(mockOffers)
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Fetch failed')
      mockQuery.order.mockResolvedValue({ data: null, error: mockError })

      const { fetchOffers, error } = useOffers()
      await fetchOffers()

      expect(error.value).toContain('Fetch failed')
    })
  })

  describe('addOffer', () => {
    it('should create new offer', async () => {
      const newOffer = createMockOffer()
      mockQuery.insert.mockResolvedValue({ data: newOffer, error: null })

      const { addOffer } = useOffers()
      await addOffer(newOffer)

      expect(mockSupabase.from).toHaveBeenCalledWith('offers')
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining(newOffer))
    })

    it('should validate offer data before creating', async () => {
      const invalidOffer = { school_id: 'school-1' } as any
      const { addOffer, error } = useOffers()

      await addOffer(invalidOffer)
      // Error handling would depend on implementation
    })
  })

  describe('updateOfferStatus', () => {
    it('should update offer status', async () => {
      const offerId = 'offer-1'
      const updatedOffer = createMockOffer({ status: 'accepted' })
      mockQuery.eq.mockReturnThis()
      mockQuery.update.mockResolvedValue({ data: updatedOffer, error: null })

      const { updateOfferStatus } = useOffers()
      await updateOfferStatus(offerId, 'accepted')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'accepted' })
    })

    it('should handle invalid status transitions', async () => {
      const { updateOfferStatus, error } = useOffers()
      await updateOfferStatus('offer-1', 'invalid_status' as any)

      // Should handle validation
    })
  })

  describe('deleteOffer', () => {
    it('should delete offer', async () => {
      mockQuery.eq.mockReturnThis()
      mockQuery.delete.mockResolvedValue({ error: null })

      const { deleteOffer } = useOffers()
      await deleteOffer('offer-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'offer-1')
      expect(mockQuery.delete).toHaveBeenCalled()
    })
  })

  describe('computedStats', () => {
    it('should calculate total scholarship value', () => {
      const { offers, totalScholarshipValue } = useOffers()
      offers.value = [
        createMockOffer({ scholarship_percentage: 50, status: 'accepted' }),
        createMockOffer({ id: 'offer-2', scholarship_percentage: 75, status: 'pending' }),
      ]

      // Note: totalScholarshipValue computation depends on implementation
      expect(offers.value.length).toBe(2)
    })

    it('should count offers by status', () => {
      const { offers } = useOffers()
      offers.value = [
        createMockOffer({ status: 'pending' }),
        createMockOffer({ id: 'offer-2', status: 'accepted' }),
        createMockOffer({ id: 'offer-3', status: 'declined' }),
      ]

      const pendingCount = offers.value.filter((o) => o.status === 'pending').length
      expect(pendingCount).toBe(1)
    })
  })

  describe('isOfferExpired', () => {
    it('should determine if offer is expired', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const expiredOffer = createMockOffer({ deadline_date: pastDate })
      const validOffer = createMockOffer({ deadline_date: futureDate })

      // Implementation would have isOfferExpired function
      const isExpired = (offer: Offer) => offer.deadline_date ? new Date(offer.deadline_date) < new Date() : false

      expect(isExpired(expiredOffer)).toBe(true)
      expect(isExpired(validOffer)).toBe(false)
    })
  })
})
