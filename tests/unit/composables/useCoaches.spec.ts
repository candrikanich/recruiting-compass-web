import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCoaches } from '~/composables/useCoaches'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import type { Coach } from '~/types/models'

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => mockSupabase,
}))

describe('useCoaches', () => {
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

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

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
    notes: 'Head coach',
    responsiveness_score: 85,
    last_contact_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  })

  describe('fetchCoaches', () => {
    it('should fetch coaches for a specific school', async () => {
      const mockCoaches = [
        createMockCoach(),
        createMockCoach({ id: 'coach-2', first_name: 'Jane', role: 'assistant' }),
      ]
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null })

      const { fetchCoaches, coaches } = useCoaches()
      await fetchCoaches('school-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('coaches')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.eq).toHaveBeenCalledWith('school_id', 'school-123')
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(coaches.value).toEqual(mockCoaches)
      expect(console.log).toHaveBeenCalledWith('Coaches fetched:', mockCoaches)
    })

    it('should handle fetch error', async () => {
      const fetchError = new Error('Database error')
      mockQuery.order.mockResolvedValue({ data: null, error: fetchError })

      const { fetchCoaches, error } = useCoaches()
      await fetchCoaches('school-123')

      expect(error.value).toBe('Database error')
      expect(console.error).toHaveBeenCalledWith('Fetch error:', fetchError)
      expect(console.error).toHaveBeenCalledWith('Coach fetch error:', 'Database error')
    })

    it('should set loading state during fetch', async () => {
      mockQuery.order.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [], error: null }), 100))
      )

      const { fetchCoaches, loading } = useCoaches()

      const fetchPromise = fetchCoaches('school-123')
      expect(loading.value).toBe(true)

      await fetchPromise
      expect(loading.value).toBe(false)
    })

    it('should handle empty results', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null })

      const { fetchCoaches, coaches } = useCoaches()
      await fetchCoaches('school-123')

      expect(coaches.value).toEqual([])
    })

    it('should handle null data response', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: null })

      const { fetchCoaches, coaches } = useCoaches()
      await fetchCoaches('school-123')

      expect(coaches.value).toEqual([])
    })

    it('should fetch coaches for different schools independently', async () => {
      const school1Coaches = [createMockCoach({ id: 'coach-1', school_id: 'school-1' })]
      const school2Coaches = [createMockCoach({ id: 'coach-2', school_id: 'school-2' })]

      const { fetchCoaches, coaches } = useCoaches()

      mockQuery.order.mockResolvedValueOnce({ data: school1Coaches, error: null })
      await fetchCoaches('school-1')
      expect(coaches.value).toEqual(school1Coaches)

      mockQuery.order.mockResolvedValueOnce({ data: school2Coaches, error: null })
      await fetchCoaches('school-2')
      expect(coaches.value).toEqual(school2Coaches)
    })
  })

  describe('getCoach', () => {
    it('should fetch single coach by id', async () => {
      const mockCoach = createMockCoach()
      mockQuery.single.mockResolvedValue({ data: mockCoach, error: null })

      const { getCoach } = useCoaches()
      const result = await getCoach('coach-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'coach-1')
      expect(result).toEqual(mockCoach)
    })

    it('should return null if user not authenticated', async () => {
      userStore.user = null

      const { getCoach } = useCoaches()
      const result = await getCoach('coach-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should return null on error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Not found') })

      const { getCoach, error } = useCoaches()
      const result = await getCoach('coach-1')

      expect(result).toBeNull()
      expect(error.value).toBe('Not found')
    })

    it('should handle non-existent coach', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('No rows returned') })

      const { getCoach } = useCoaches()
      const result = await getCoach('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('createCoach', () => {
    it('should create a new coach', async () => {
      const newCoachData = {
        role: 'assistant' as const,
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@university.edu',
        phone: '555-5678',
        twitter_handle: '@coachdoe',
        instagram_handle: 'coachdoe',
        notes: 'Assistant coach',
        responsiveness_score: 90,
        last_contact_date: '2024-02-01',
      }

      const createdCoach = createMockCoach({ ...newCoachData, id: 'new-coach-id' })
      mockQuery.single.mockResolvedValue({ data: createdCoach, error: null })

      const { createCoach, coaches } = useCoaches()
      const result = await createCoach('school-123', newCoachData)

      expect(mockQuery.insert).toHaveBeenCalledWith([
        {
          ...newCoachData,
          school_id: 'school-123',
          user_id: 'user-123',
        },
      ])
      expect(result).toEqual(createdCoach)
      expect(coaches.value).toContain(createdCoach)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { createCoach } = useCoaches()

      await expect(createCoach('school-123', {} as any)).rejects.toThrow('User not authenticated')
    })

    it('should handle creation error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Insert failed') })

      const { createCoach, error } = useCoaches()

      await expect(createCoach('school-123', {} as any)).rejects.toThrow('Insert failed')
      expect(error.value).toBe('Insert failed')
    })

    it('should include school_id and user_id in created coach', async () => {
      const newCoachData = {
        role: 'head' as const,
        first_name: 'Test',
        last_name: 'Coach',
      } as any

      const createdCoach = createMockCoach()
      mockQuery.single.mockResolvedValue({ data: createdCoach, error: null })

      const { createCoach } = useCoaches()
      await createCoach('school-456', newCoachData)

      const insertCall = mockQuery.insert.mock.calls[0][0][0]
      expect(insertCall.school_id).toBe('school-456')
      expect(insertCall.user_id).toBe('user-123')
    })

    it('should create coach with different roles', async () => {
      const roles: Array<'head' | 'assistant' | 'recruiting'> = ['head', 'assistant', 'recruiting']

      for (const role of roles) {
        const coachData = { role, first_name: 'Test', last_name: 'Coach' } as any
        const createdCoach = createMockCoach({ role })
        mockQuery.single.mockResolvedValue({ data: createdCoach, error: null })

        const { createCoach } = useCoaches()
        const result = await createCoach('school-123', coachData)

        expect(result.role).toBe(role)
      }
    })
  })

  describe('updateCoach', () => {
    it('should update coach', async () => {
      const updates = { first_name: 'Johnny', responsiveness_score: 95 }
      const updatedCoach = createMockCoach(updates)
      mockQuery.single.mockResolvedValue({ data: updatedCoach, error: null })

      const { updateCoach, coaches, fetchCoaches } = useCoaches()

      // First fetch to populate coaches
      mockQuery.order.mockResolvedValue({ data: [createMockCoach()], error: null })
      await fetchCoaches('school-123')

      // Then update
      const result = await updateCoach('coach-1', updates)

      expect(mockQuery.update).toHaveBeenCalledWith(updates)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'coach-1')
      expect(result).toEqual(updatedCoach)
      expect(coaches.value[0]).toEqual(updatedCoach)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { updateCoach } = useCoaches()

      await expect(updateCoach('coach-1', {})).rejects.toThrow('User not authenticated')
    })

    it('should handle update error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Update failed') })

      const { updateCoach, error } = useCoaches()

      await expect(updateCoach('coach-1', {})).rejects.toThrow('Update failed')
      expect(error.value).toBe('Update failed')
    })

    it('should update local state when coach exists', async () => {
      const initialCoach = createMockCoach()
      const updatedCoach = createMockCoach({ first_name: 'Updated' })

      mockQuery.order.mockResolvedValue({ data: [initialCoach], error: null })
      mockQuery.single.mockResolvedValue({ data: updatedCoach, error: null })

      const { fetchCoaches, updateCoach, coaches } = useCoaches()
      await fetchCoaches('school-123')

      await updateCoach('coach-1', { first_name: 'Updated' })

      expect(coaches.value[0].first_name).toBe('Updated')
    })

    it('should handle updating coach not in local state', async () => {
      const updatedCoach = createMockCoach({ id: 'coach-999', first_name: 'Updated' })
      mockQuery.single.mockResolvedValue({ data: updatedCoach, error: null })

      const { updateCoach, coaches } = useCoaches()

      await updateCoach('coach-999', { first_name: 'Updated' })

      // Should not crash, local state unchanged
      expect(coaches.value.find(c => c.id === 'coach-999')).toBeUndefined()
    })
  })

  describe('deleteCoach', () => {
    it('should delete coach', async () => {
      mockQuery.delete.mockResolvedValue({ error: null })

      const { deleteCoach, coaches, fetchCoaches } = useCoaches()

      // First fetch to populate coaches
      mockQuery.order.mockResolvedValue({
        data: [createMockCoach(), createMockCoach({ id: 'coach-2' })],
        error: null,
      })
      await fetchCoaches('school-123')

      // Then delete
      await deleteCoach('coach-1')

      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'coach-1')
      expect(coaches.value.find(c => c.id === 'coach-1')).toBeUndefined()
      expect(coaches.value).toHaveLength(1)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { deleteCoach } = useCoaches()

      await expect(deleteCoach('coach-1')).rejects.toThrow('User not authenticated')
    })

    it('should handle delete error', async () => {
      mockQuery.delete.mockResolvedValue({ error: new Error('Delete failed') })

      const { deleteCoach, error } = useCoaches()

      await expect(deleteCoach('coach-1')).rejects.toThrow('Delete failed')
      expect(error.value).toBe('Delete failed')
    })

    it('should not check user_id when deleting (relies on RLS)', async () => {
      mockQuery.delete.mockResolvedValue({ error: null })

      const { deleteCoach } = useCoaches()
      await deleteCoach('coach-1')

      // Only id is checked, not user_id (RLS handles authorization)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'coach-1')
      expect(mockQuery.eq).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: { message: 'Custom error' } })

      const { fetchCoaches } = useCoaches()
      await fetchCoaches('school-123')

      // Should not crash
    })

    it('should clear error on successful operation after previous error', async () => {
      // First call fails
      mockQuery.order.mockResolvedValueOnce({ data: null, error: new Error('Failed') })

      const { fetchCoaches, error } = useCoaches()
      await fetchCoaches('school-123')
      expect(error.value).toBe('Failed')

      // Second call succeeds
      mockQuery.order.mockResolvedValueOnce({ data: [], error: null })
      await fetchCoaches('school-123')
      expect(error.value).toBeNull()
    })

    it('should handle concurrent operations', async () => {
      mockQuery.order.mockResolvedValue({ data: [createMockCoach()], error: null })

      const { fetchCoaches } = useCoaches()

      await Promise.all([
        fetchCoaches('school-1'),
        fetchCoaches('school-2'),
        fetchCoaches('school-3'),
      ])

      expect(mockSupabase.from).toHaveBeenCalledTimes(3)
    })

    it('should handle null values in coach data', async () => {
      const coachWithNulls = createMockCoach({
        email: null,
        phone: null,
        twitter_handle: null,
        instagram_handle: null,
        notes: null,
        last_contact_date: null,
      })

      mockQuery.order.mockResolvedValue({ data: [coachWithNulls], error: null })

      const { fetchCoaches, coaches } = useCoaches()
      await fetchCoaches('school-123')

      expect(coaches.value[0]).toEqual(coachWithNulls)
    })

    it('should handle responsiveness_score edge values', async () => {
      const coaches = [
        createMockCoach({ id: 'coach-1', responsiveness_score: 0 }),
        createMockCoach({ id: 'coach-2', responsiveness_score: 100 }),
        createMockCoach({ id: 'coach-3', responsiveness_score: 50 }),
      ]

      mockQuery.order.mockResolvedValue({ data: coaches, error: null })

      const { fetchCoaches, coaches: coachesRef } = useCoaches()
      await fetchCoaches('school-123')

      expect(coachesRef.value.map(c => c.responsiveness_score)).toEqual([0, 100, 50])
    })
  })

  describe('Computed Properties', () => {
    it('should expose coaches as computed ref', async () => {
      const mockCoaches = [createMockCoach()]
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null })

      const { fetchCoaches, coaches } = useCoaches()
      await fetchCoaches('school-123')

      expect(coaches.value).toEqual(mockCoaches)
      // Verify it's a computed ref (readonly)
      expect(() => {
        (coaches as any).value = []
      }).toThrow()
    })

    it('should expose loading as computed ref', () => {
      const { loading } = useCoaches()

      expect(loading.value).toBe(false)
      // Verify it's a computed ref (readonly)
      expect(() => {
        (loading as any).value = true
      }).toThrow()
    })

    it('should expose error as computed ref', () => {
      const { error } = useCoaches()

      expect(error.value).toBeNull()
      // Verify it's a computed ref (readonly)
      expect(() => {
        (error as any).value = 'test error'
      }).toThrow()
    })
  })
})
