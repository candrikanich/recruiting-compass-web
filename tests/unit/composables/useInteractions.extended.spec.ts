import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useInteractions } from '~/composables/useInteractions'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import type { Interaction } from '~/types/models'

const mockSupabase = {
  from: vi.fn(),
}

vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => mockSupabase,
}))

describe('useInteractions - Extended', () => {
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

  const createMockInteraction = (overrides = {}): Interaction => ({
    id: 'interaction-1',
    user_id: 'user-123',
    school_id: 'school-1',
    coach_id: 'coach-1',
    type: 'email',
    direction: 'outbound',
    subject: 'Recruiting Inquiry',
    content: 'Hello, interested in your program',
    sentiment: 'positive',
    occurred_at: '2025-12-20T10:00:00Z',
    created_at: '2025-12-20T10:00:00Z',
    attachments: [],
    ...overrides,
  })

  describe('fetchInteractions', () => {
    it('should fetch interactions with filters', async () => {
      const mockInteractions = [
        createMockInteraction(),
        createMockInteraction({ id: 'interaction-2', type: 'phone_call' }),
      ]
      mockQuery.order.mockResolvedValue({ data: mockInteractions, error: null })

      const { fetchInteractions, interactions } = useInteractions()
      await fetchInteractions({ type: 'email', direction: 'outbound' })

      expect(mockSupabase.from).toHaveBeenCalledWith('interactions')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(interactions.value).toEqual(mockInteractions)
    })

    it('should apply date range filters client-side', async () => {
      const now = new Date()
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const oldInteraction = createMockInteraction({
        occurred_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      const validInteraction = createMockInteraction({ occurred_at: now.toISOString() })

      mockQuery.order.mockResolvedValue({ data: [oldInteraction, validInteraction], error: null })

      const { fetchInteractions, interactions } = useInteractions()
      await fetchInteractions({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      })

      expect(interactions.value).toContain(validInteraction)
      expect(interactions.value.length).toBe(1)
    })

    it('should handle fetch errors gracefully', async () => {
      const mockError = new Error('Fetch failed')
      mockQuery.order.mockResolvedValue({ data: null, error: mockError })

      const { fetchInteractions, error } = useInteractions()
      await fetchInteractions()

      expect(error.value).toBe('Fetch failed')
    })
  })

  describe('exportToCSV', () => {
    it('should generate valid CSV from interactions', () => {
      const { exportToCSV, interactions } = useInteractions()
      interactions.value = [
        createMockInteraction(),
        createMockInteraction({ id: 'interaction-2', type: 'text' }),
      ]

      const csv = exportToCSV()

      expect(csv).toContain('Date')
      expect(csv).toContain('Type')
      expect(csv).toContain('Direction')
      expect(csv).toContain('email')
      expect(csv).toContain('text')
    })

    it('should escape quotes in CSV content', () => {
      const { exportToCSV, interactions } = useInteractions()
      interactions.value = [
        createMockInteraction({
          content: 'He said "hello"',
        }),
      ]

      const csv = exportToCSV()
      expect(csv).toContain('""')
    })

    it('should return empty string when no interactions', () => {
      const { exportToCSV, interactions } = useInteractions()
      interactions.value = []

      const csv = exportToCSV()
      expect(csv).toBe('')
    })
  })

  describe('addInteraction', () => {
    it('should create new interaction', async () => {
      const newInteraction = createMockInteraction()
      mockQuery.insert.mockResolvedValue({ data: newInteraction, error: null })

      const { addInteraction } = useInteractions()
      await addInteraction(newInteraction)

      expect(mockSupabase.from).toHaveBeenCalledWith('interactions')
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining(newInteraction))
    })

    it('should handle add errors', async () => {
      const mockError = new Error('Insert failed')
      mockQuery.insert.mockResolvedValue({ data: null, error: mockError })

      const { addInteraction, error } = useInteractions()
      const newInteraction = createMockInteraction()
      await addInteraction(newInteraction)

      expect(error.value).toContain('Insert failed')
    })
  })

  describe('deleteInteraction', () => {
    it('should delete interaction by id', async () => {
      mockQuery.delete.mockResolvedValue({ error: null })

      const { deleteInteraction } = useInteractions()
      await deleteInteraction('interaction-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'interaction-1')
      expect(mockQuery.delete).toHaveBeenCalled()
    })
  })
})
