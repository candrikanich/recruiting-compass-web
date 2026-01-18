import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useInteractions } from '~/composables/useInteractions'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import type { Interaction } from '~/types/models'

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => mockSupabase,
}))

describe('useInteractions', () => {
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
    school_id: 'school-123',
    coach_id: 'coach-456',
    event_id: null,
    type: 'email',
    direction: 'outbound',
    subject: 'Introduction',
    content: 'Hello coach',
    sentiment: 'positive',
    occurred_at: '2024-01-01T12:00:00Z',
    logged_by: 'user-123',
    attachments: [],
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    user_id: 'user-123',
    ...overrides,
  })

  describe('fetchInteractions', () => {
    it('should fetch all interactions when no filters provided', async () => {
      const mockInteractions = [
        createMockInteraction(),
        createMockInteraction({ id: 'interaction-2', type: 'phone_call' }),
      ]
      mockQuery.order.mockResolvedValue({ data: mockInteractions, error: null })

      const { fetchInteractions, interactions } = useInteractions()
      await fetchInteractions()

      expect(mockSupabase.from).toHaveBeenCalledWith('interactions')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.order).toHaveBeenCalledWith('occurred_at', { ascending: false })
      expect(interactions.value).toEqual(mockInteractions)
    })

    it('should fetch interactions filtered by schoolId', async () => {
      const mockInteractions = [createMockInteraction({ school_id: 'school-123' })]
      mockQuery.order.mockResolvedValue({ data: mockInteractions, error: null })

      const { fetchInteractions } = useInteractions()
      await fetchInteractions('school-123')

      expect(mockQuery.eq).toHaveBeenCalledWith('school_id', 'school-123')
    })

    it('should fetch interactions filtered by coachId', async () => {
      const mockInteractions = [createMockInteraction({ coach_id: 'coach-456' })]
      mockQuery.order.mockResolvedValue({ data: mockInteractions, error: null })

      const { fetchInteractions } = useInteractions()
      await fetchInteractions(undefined, 'coach-456')

      expect(mockQuery.eq).toHaveBeenCalledWith('coach_id', 'coach-456')
    })

    it('should fetch interactions filtered by both schoolId and coachId', async () => {
      const mockInteractions = [createMockInteraction()]
      mockQuery.order.mockResolvedValue({ data: mockInteractions, error: null })

      const { fetchInteractions } = useInteractions()
      await fetchInteractions('school-123', 'coach-456')

      expect(mockQuery.eq).toHaveBeenCalledWith('school_id', 'school-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('coach_id', 'coach-456')
    })

    it('should handle fetch error', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: new Error('Database error') })

      const { fetchInteractions, error } = useInteractions()
      await fetchInteractions()

      expect(error.value).toBe('Database error')
    })

    it('should set loading state during fetch', async () => {
      mockQuery.order.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [], error: null }), 100))
      )

      const { fetchInteractions, loading } = useInteractions()

      const fetchPromise = fetchInteractions()
      expect(loading.value).toBe(true)

      await fetchPromise
      expect(loading.value).toBe(false)
    })

    it('should handle empty results', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null })

      const { fetchInteractions, interactions } = useInteractions()
      await fetchInteractions()

      expect(interactions.value).toEqual([])
    })

    it('should handle null data response', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: null })

      const { fetchInteractions, interactions } = useInteractions()
      await fetchInteractions()

      expect(interactions.value).toEqual([])
    })
  })

  describe('getInteraction', () => {
    it('should fetch single interaction by id', async () => {
      const mockInteraction = createMockInteraction()
      mockQuery.single.mockResolvedValue({ data: mockInteraction, error: null })

      const { getInteraction } = useInteractions()
      const result = await getInteraction('interaction-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'interaction-1')
      expect(result).toEqual(mockInteraction)
    })

    it('should return null on error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Not found') })

      const { getInteraction, error } = useInteractions()
      const result = await getInteraction('interaction-1')

      expect(result).toBeNull()
      expect(error.value).toBe('Not found')
    })

    it('should handle non-existent interaction', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('No rows returned') })

      const { getInteraction } = useInteractions()
      const result = await getInteraction('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('createInteraction', () => {
    it('should create a new interaction', async () => {
      const newInteractionData = {
        school_id: 'school-123',
        coach_id: 'coach-456',
        type: 'email' as const,
        direction: 'outbound' as const,
        subject: 'Follow-up',
        content: 'Thanks for the call',
        sentiment: 'positive' as const,
        occurred_at: '2024-01-15T10:00:00Z',
        attachments: [],
      }

      const createdInteraction = createMockInteraction({ ...newInteractionData, id: 'new-interaction-id' })
      mockQuery.single.mockResolvedValue({ data: createdInteraction, error: null })

      const { createInteraction, interactions } = useInteractions()
      const result = await createInteraction(newInteractionData)

      expect(mockQuery.insert).toHaveBeenCalledWith([
        {
          ...newInteractionData,
          logged_by: 'user-123',
        },
      ])
      expect(result).toEqual(createdInteraction)
      expect(interactions.value[0]).toEqual(createdInteraction)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { createInteraction } = useInteractions()

      await expect(createInteraction({} as any)).rejects.toThrow('User not authenticated')
    })

    it('should handle creation error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Insert failed') })

      const { createInteraction, error } = useInteractions()

      await expect(createInteraction({} as any)).rejects.toThrow('Insert failed')
      expect(error.value).toBe('Insert failed')
    })

    it('should include logged_by in created interaction', async () => {
      const newInteractionData = { type: 'email', direction: 'outbound' } as any
      const createdInteraction = createMockInteraction()
      mockQuery.single.mockResolvedValue({ data: createdInteraction, error: null })

      const { createInteraction } = useInteractions()
      await createInteraction(newInteractionData)

      const insertCall = mockQuery.insert.mock.calls[0][0][0]
      expect(insertCall.logged_by).toBe('user-123')
    })

    it('should add new interaction to beginning of list (unshift)', async () => {
      const existingInteraction = createMockInteraction({ id: 'existing-1' })
      const newInteraction = createMockInteraction({ id: 'new-1' })

      mockQuery.order.mockResolvedValue({ data: [existingInteraction], error: null })
      mockQuery.single.mockResolvedValue({ data: newInteraction, error: null })

      const { fetchInteractions, createInteraction, interactions } = useInteractions()

      await fetchInteractions()
      expect(interactions.value).toHaveLength(1)

      await createInteraction({} as any)
      expect(interactions.value).toHaveLength(2)
      expect(interactions.value[0].id).toBe('new-1')
      expect(interactions.value[1].id).toBe('existing-1')
    })

    it('should create interaction with different types', async () => {
      const types: Array<Interaction['type']> = [
        'email', 'phone_call', 'text', 'in_person_visit', 'virtual_meeting',
        'camp', 'showcase', 'tweet', 'dm'
      ]

      for (const type of types) {
        const interactionData = { type, direction: 'outbound' as const } as any
        const createdInteraction = createMockInteraction({ type })
        mockQuery.single.mockResolvedValue({ data: createdInteraction, error: null })

        const { createInteraction } = useInteractions()
        const result = await createInteraction(interactionData)

        expect(result.type).toBe(type)
      }
    })
  })

  describe('updateInteraction', () => {
    it('should update interaction', async () => {
      const updates = { subject: 'Updated subject', sentiment: 'very_positive' as const }
      const updatedInteraction = createMockInteraction(updates)
      mockQuery.single.mockResolvedValue({ data: updatedInteraction, error: null })

      const { updateInteraction, interactions, fetchInteractions } = useInteractions()

      // First fetch to populate interactions
      mockQuery.order.mockResolvedValue({ data: [createMockInteraction()], error: null })
      await fetchInteractions()

      // Then update
      const result = await updateInteraction('interaction-1', updates)

      expect(mockQuery.update).toHaveBeenCalledWith(updates)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'interaction-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('logged_by', 'user-123')
      expect(result).toEqual(updatedInteraction)
      expect(interactions.value[0]).toEqual(updatedInteraction)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { updateInteraction } = useInteractions()

      await expect(updateInteraction('interaction-1', {})).rejects.toThrow('User not authenticated')
    })

    it('should handle update error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Update failed') })

      const { updateInteraction, error } = useInteractions()

      await expect(updateInteraction('interaction-1', {})).rejects.toThrow('Update failed')
      expect(error.value).toBe('Update failed')
    })

    it('should update local state when interaction exists', async () => {
      const initialInteraction = createMockInteraction()
      const updatedInteraction = createMockInteraction({ subject: 'Updated' })

      mockQuery.order.mockResolvedValue({ data: [initialInteraction], error: null })
      mockQuery.single.mockResolvedValue({ data: updatedInteraction, error: null })

      const { fetchInteractions, updateInteraction, interactions } = useInteractions()
      await fetchInteractions()

      await updateInteraction('interaction-1', { subject: 'Updated' })

      expect(interactions.value[0].subject).toBe('Updated')
    })

    it('should enforce user ownership via logged_by check', async () => {
      mockQuery.single.mockResolvedValue({ data: createMockInteraction(), error: null })

      const { updateInteraction } = useInteractions()
      await updateInteraction('interaction-1', {})

      expect(mockQuery.eq).toHaveBeenCalledWith('logged_by', 'user-123')
    })
  })

  describe('deleteInteraction', () => {
    it('should delete interaction', async () => {
      mockQuery.delete.mockResolvedValue({ error: null })

      const { deleteInteraction, interactions, fetchInteractions } = useInteractions()

      // First fetch to populate interactions
      mockQuery.order.mockResolvedValue({
        data: [createMockInteraction(), createMockInteraction({ id: 'interaction-2' })],
        error: null,
      })
      await fetchInteractions()

      // Then delete
      await deleteInteraction('interaction-1')

      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'interaction-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('logged_by', 'user-123')
      expect(interactions.value.find(i => i.id === 'interaction-1')).toBeUndefined()
      expect(interactions.value).toHaveLength(1)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { deleteInteraction } = useInteractions()

      await expect(deleteInteraction('interaction-1')).rejects.toThrow('User not authenticated')
    })

    it('should handle delete error', async () => {
      mockQuery.delete.mockResolvedValue({ error: new Error('Delete failed') })

      const { deleteInteraction, error } = useInteractions()

      await expect(deleteInteraction('interaction-1')).rejects.toThrow('Delete failed')
      expect(error.value).toBe('Delete failed')
    })

    it('should enforce user ownership via logged_by check', async () => {
      mockQuery.delete.mockResolvedValue({ error: null })

      const { deleteInteraction } = useInteractions()
      await deleteInteraction('interaction-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('logged_by', 'user-123')
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: { message: 'Custom error' } })

      const { fetchInteractions } = useInteractions()
      await fetchInteractions()

      // Should not crash
    })

    it('should clear error on successful operation after previous error', async () => {
      // First call fails
      mockQuery.order.mockResolvedValueOnce({ data: null, error: new Error('Failed') })

      const { fetchInteractions, error } = useInteractions()
      await fetchInteractions()
      expect(error.value).toBe('Failed')

      // Second call succeeds
      mockQuery.order.mockResolvedValueOnce({ data: [], error: null })
      await fetchInteractions()
      expect(error.value).toBeNull()
    })

    it('should handle null values in interaction data', async () => {
      const interactionWithNulls = createMockInteraction({
        coach_id: null,
        event_id: null,
        subject: null,
        content: null,
        sentiment: null,
      })

      mockQuery.order.mockResolvedValue({ data: [interactionWithNulls], error: null })

      const { fetchInteractions, interactions } = useInteractions()
      await fetchInteractions()

      expect(interactions.value[0]).toEqual(interactionWithNulls)
    })

    it('should handle different sentiment values', async () => {
      const sentiments: Array<Interaction['sentiment']> = [
        'positive', 'neutral', 'negative', 'very_positive', null
      ]

      for (const sentiment of sentiments) {
        const interaction = createMockInteraction({ id: `int-${sentiment}`, sentiment })
        mockQuery.order.mockResolvedValue({ data: [interaction], error: null })

        const { fetchInteractions, interactions } = useInteractions()
        await fetchInteractions()

        expect(interactions.value[0].sentiment).toBe(sentiment)
      }
    })

    it('should handle different direction values', async () => {
      const outbound = createMockInteraction({ direction: 'outbound' })
      const inbound = createMockInteraction({ id: 'int-2', direction: 'inbound' })

      mockQuery.order.mockResolvedValue({ data: [outbound, inbound], error: null })

      const { fetchInteractions, interactions } = useInteractions()
      await fetchInteractions()

      expect(interactions.value[0].direction).toBe('outbound')
      expect(interactions.value[1].direction).toBe('inbound')
    })

    it('should handle interactions with attachments', async () => {
      const interactionWithAttachments = createMockInteraction({
        attachments: ['file1.pdf', 'file2.jpg', 'transcript.docx'],
      })

      mockQuery.single.mockResolvedValue({ data: interactionWithAttachments, error: null })

      const { createInteraction } = useInteractions()
      const result = await createInteraction({
        attachments: ['file1.pdf', 'file2.jpg', 'transcript.docx'],
      } as any)

      expect(result.attachments).toEqual(['file1.pdf', 'file2.jpg', 'transcript.docx'])
    })

    it('should handle concurrent operations', async () => {
      mockQuery.order.mockResolvedValue({ data: [createMockInteraction()], error: null })

      const { fetchInteractions } = useInteractions()

      await Promise.all([
        fetchInteractions('school-1'),
        fetchInteractions('school-2'),
        fetchInteractions(undefined, 'coach-1'),
      ])

      expect(mockSupabase.from).toHaveBeenCalledTimes(3)
    })
  })

  describe('Computed Properties', () => {
    it('should expose interactions as computed ref', async () => {
      const mockInteractions = [createMockInteraction()]
      mockQuery.order.mockResolvedValue({ data: mockInteractions, error: null })

      const { fetchInteractions, interactions } = useInteractions()
      await fetchInteractions()

      expect(interactions.value).toEqual(mockInteractions)
      // Verify it's a computed ref (readonly)
      expect(() => {
        (interactions as any).value = []
      }).toThrow()
    })

    it('should expose loading as computed ref', () => {
      const { loading } = useInteractions()

      expect(loading.value).toBe(false)
      // Verify it's a computed ref (readonly)
      expect(() => {
        (loading as any).value = true
      }).toThrow()
    })

    it('should expose error as computed ref', () => {
      const { error } = useInteractions()

      expect(error.value).toBeNull()
      // Verify it's a computed ref (readonly)
      expect(() => {
        (error as any).value = 'test error'
      }).toThrow()
    })
  })

  describe('Query Building', () => {
    it('should build correct query with no filters', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null })

      const { fetchInteractions } = useInteractions()
      await fetchInteractions()

      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.order).toHaveBeenCalledWith('occurred_at', { ascending: false })
      expect(mockQuery.eq).not.toHaveBeenCalled()
    })

    it('should build correct query with only schoolId filter', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null })

      const { fetchInteractions } = useInteractions()
      await fetchInteractions('school-123', undefined)

      expect(mockQuery.eq).toHaveBeenCalledTimes(1)
      expect(mockQuery.eq).toHaveBeenCalledWith('school_id', 'school-123')
    })

    it('should build correct query with only coachId filter', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null })

      const { fetchInteractions } = useInteractions()
      await fetchInteractions(undefined, 'coach-456')

      expect(mockQuery.eq).toHaveBeenCalledTimes(1)
      expect(mockQuery.eq).toHaveBeenCalledWith('coach_id', 'coach-456')
    })

    it('should build correct query with both filters', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null })

      const { fetchInteractions } = useInteractions()
      await fetchInteractions('school-123', 'coach-456')

      expect(mockQuery.eq).toHaveBeenCalledTimes(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('school_id', 'school-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('coach_id', 'coach-456')
    })
  })
})
