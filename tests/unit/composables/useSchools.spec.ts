import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSchools } from '~/composables/useSchools'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import type { School } from '~/types/models'

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => mockSupabase,
}))

describe('useSchools', () => {
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

  const createMockSchool = (overrides = {}): School => ({
    id: 'school-1',
    user_id: 'user-123',
    name: 'Test University',
    location: 'Boston, MA',
    division: 'D1',
    conference: 'ACC',
    ranking: 1,
    is_favorite: false,
    website: 'https://test.edu',
    twitter_handle: '@testuniv',
    instagram_handle: 'testuniv',
    status: 'researching',
    notes: 'Great program',
    pros: ['Good facilities', 'Strong academics'],
    cons: ['Far from home'],
    ...overrides,
  })

  describe('fetchSchools', () => {
    it('should fetch schools for authenticated user', async () => {
      const mockSchools = [createMockSchool(), createMockSchool({ id: 'school-2', name: 'Second University' })]
      mockQuery.order.mockResolvedValue({ data: mockSchools, error: null })

      const { fetchSchools, schools } = useSchools()
      await fetchSchools()

      expect(mockSupabase.from).toHaveBeenCalledWith('schools')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockQuery.order).toHaveBeenCalledWith('ranking', { ascending: true, nullsFirst: false })
      expect(schools.value).toEqual(mockSchools)
    })

    it('should not fetch if user is not authenticated', async () => {
      userStore.user = null

      const { fetchSchools } = useSchools()
      await fetchSchools()

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should handle fetch error', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: new Error('Database error') })

      const { fetchSchools, error } = useSchools()
      await fetchSchools()

      expect(error.value).toBe('Database error')
    })

    it('should set loading state during fetch', async () => {
      mockQuery.order.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [], error: null }), 100))
      )

      const { fetchSchools, loading } = useSchools()

      const fetchPromise = fetchSchools()
      expect(loading.value).toBe(true)

      await fetchPromise
      expect(loading.value).toBe(false)
    })

    it('should handle empty results', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null })

      const { fetchSchools, schools } = useSchools()
      await fetchSchools()

      expect(schools.value).toEqual([])
    })

    it('should handle null data response', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: null })

      const { fetchSchools, schools } = useSchools()
      await fetchSchools()

      expect(schools.value).toEqual([])
    })
  })

  describe('getSchool', () => {
    it('should fetch single school by id', async () => {
      const mockSchool = createMockSchool()
      mockQuery.single.mockResolvedValue({ data: mockSchool, error: null })

      const { getSchool } = useSchools()
      const result = await getSchool('school-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'school-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(result).toEqual(mockSchool)
    })

    it('should return null if user not authenticated', async () => {
      userStore.user = null

      const { getSchool } = useSchools()
      const result = await getSchool('school-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should return null on error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Not found') })

      const { getSchool, error } = useSchools()
      const result = await getSchool('school-1')

      expect(result).toBeNull()
      expect(error.value).toBe('Not found')
    })

    it('should handle non-existent school', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('No rows returned') })

      const { getSchool } = useSchools()
      const result = await getSchool('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('createSchool', () => {
    it('should create a new school', async () => {
      const newSchoolData = {
        name: 'New University',
        location: 'New York, NY',
        division: 'D1' as const,
        conference: 'Big East',
        is_favorite: false,
        website: null,
        twitter_handle: null,
        instagram_handle: null,
        status: 'researching' as const,
        notes: null,
        pros: [],
        cons: [],
      }

      const createdSchool = createMockSchool({ ...newSchoolData, id: 'new-school-id' })
      mockQuery.single.mockResolvedValue({ data: createdSchool, error: null })

      const { createSchool, schools } = useSchools()
      const result = await createSchool(newSchoolData)

      expect(mockQuery.insert).toHaveBeenCalledWith([
        {
          ...newSchoolData,
          user_id: 'user-123',
        },
      ])
      expect(result).toEqual(createdSchool)
      expect(schools.value).toContain(createdSchool)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { createSchool } = useSchools()

      await expect(createSchool({} as any)).rejects.toThrow('User not authenticated')
    })

    it('should handle creation error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Insert failed') })

      const { createSchool, error } = useSchools()

      await expect(createSchool({} as any)).rejects.toThrow('Insert failed')
      expect(error.value).toBe('Insert failed')
    })

    it('should include user_id in created school', async () => {
      const newSchoolData = { name: 'Test' } as any
      const createdSchool = createMockSchool()
      mockQuery.single.mockResolvedValue({ data: createdSchool, error: null })

      const { createSchool } = useSchools()
      await createSchool(newSchoolData)

      const insertCall = mockQuery.insert.mock.calls[0][0][0]
      expect(insertCall.user_id).toBe('user-123')
    })
  })

  describe('updateSchool', () => {
    it('should update school', async () => {
      const updates = { name: 'Updated University', ranking: 2 }
      const updatedSchool = createMockSchool(updates)
      mockQuery.single.mockResolvedValue({ data: updatedSchool, error: null })

      const { updateSchool, schools, fetchSchools } = useSchools()

      // First fetch to populate schools
      mockQuery.order.mockResolvedValue({ data: [createMockSchool()], error: null })
      await fetchSchools()

      // Then update
      const result = await updateSchool('school-1', updates)

      expect(mockQuery.update).toHaveBeenCalledWith(updates)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'school-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(result).toEqual(updatedSchool)
      expect(schools.value[0]).toEqual(updatedSchool)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { updateSchool } = useSchools()

      await expect(updateSchool('school-1', {})).rejects.toThrow('User not authenticated')
    })

    it('should handle update error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Update failed') })

      const { updateSchool, error } = useSchools()

      await expect(updateSchool('school-1', {})).rejects.toThrow('Update failed')
      expect(error.value).toBe('Update failed')
    })

    it('should update local state when school exists', async () => {
      const initialSchool = createMockSchool()
      const updatedSchool = createMockSchool({ name: 'Updated' })

      mockQuery.order.mockResolvedValue({ data: [initialSchool], error: null })
      mockQuery.single.mockResolvedValue({ data: updatedSchool, error: null })

      const { fetchSchools, updateSchool, schools } = useSchools()
      await fetchSchools()

      await updateSchool('school-1', { name: 'Updated' })

      expect(schools.value[0].name).toBe('Updated')
    })
  })

  describe('deleteSchool', () => {
    it('should delete school', async () => {
      mockQuery.delete.mockResolvedValue({ error: null })

      const { deleteSchool, schools, fetchSchools } = useSchools()

      // First fetch to populate schools
      mockQuery.order.mockResolvedValue({ data: [createMockSchool(), createMockSchool({ id: 'school-2' })], error: null })
      await fetchSchools()

      // Then delete
      await deleteSchool('school-1')

      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'school-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(schools.value.find(s => s.id === 'school-1')).toBeUndefined()
      expect(schools.value).toHaveLength(1)
    })

    it('should throw error if user not authenticated', async () => {
      userStore.user = null

      const { deleteSchool } = useSchools()

      await expect(deleteSchool('school-1')).rejects.toThrow('User not authenticated')
    })

    it('should handle delete error', async () => {
      mockQuery.delete.mockResolvedValue({ error: new Error('Delete failed') })

      const { deleteSchool, error } = useSchools()

      await expect(deleteSchool('school-1')).rejects.toThrow('Delete failed')
      expect(error.value).toBe('Delete failed')
    })
  })

  describe('toggleFavorite', () => {
    it('should toggle favorite status from false to true', async () => {
      const updatedSchool = createMockSchool({ is_favorite: true })
      mockQuery.single.mockResolvedValue({ data: updatedSchool, error: null })

      const { toggleFavorite } = useSchools()
      const result = await toggleFavorite('school-1', false)

      expect(mockQuery.update).toHaveBeenCalledWith({ is_favorite: true })
      expect(result).toEqual(updatedSchool)
    })

    it('should toggle favorite status from true to false', async () => {
      const updatedSchool = createMockSchool({ is_favorite: false })
      mockQuery.single.mockResolvedValue({ data: updatedSchool, error: null })

      const { toggleFavorite } = useSchools()
      const result = await toggleFavorite('school-1', true)

      expect(mockQuery.update).toHaveBeenCalledWith({ is_favorite: false })
    })
  })

  describe('updateRanking', () => {
    it('should update ranking for all schools', async () => {
      const schools = [
        createMockSchool({ id: 'school-1', ranking: 1 }),
        createMockSchool({ id: 'school-2', ranking: 2 }),
        createMockSchool({ id: 'school-3', ranking: 3 }),
      ]

      mockQuery.eq.mockResolvedValue({ error: null })

      const { updateRanking } = useSchools()
      await updateRanking(schools)

      expect(mockQuery.update).toHaveBeenCalledTimes(3)
      expect(mockQuery.update).toHaveBeenNthCalledWith(1, { ranking: 1 })
      expect(mockQuery.update).toHaveBeenNthCalledWith(2, { ranking: 2 })
      expect(mockQuery.update).toHaveBeenNthCalledWith(3, { ranking: 3 })
    })

    it('should handle ranking update error', async () => {
      mockQuery.eq.mockRejectedValue(new Error('Update ranking failed'))

      const schools = [createMockSchool()]

      const { updateRanking, error } = useSchools()
      await updateRanking(schools)

      expect(error.value).toBe('Update ranking failed')
    })

    it('should update local state with new school order', async () => {
      const reorderedSchools = [
        createMockSchool({ id: 'school-2', ranking: 1 }),
        createMockSchool({ id: 'school-1', ranking: 2 }),
      ]

      mockQuery.eq.mockResolvedValue({ error: null })

      const { updateRanking, schools } = useSchools()
      await updateRanking(reorderedSchools)

      expect(schools.value).toEqual(reorderedSchools)
    })
  })

  describe('favoriteSchools computed', () => {
    it('should filter only favorite schools', async () => {
      const mockSchools = [
        createMockSchool({ id: 'school-1', is_favorite: true }),
        createMockSchool({ id: 'school-2', is_favorite: false }),
        createMockSchool({ id: 'school-3', is_favorite: true }),
      ]
      mockQuery.order.mockResolvedValue({ data: mockSchools, error: null })

      const { fetchSchools, favoriteSchools } = useSchools()
      await fetchSchools()

      expect(favoriteSchools.value).toHaveLength(2)
      expect(favoriteSchools.value.every(s => s.is_favorite)).toBe(true)
    })

    it('should return empty array when no favorites', async () => {
      const mockSchools = [
        createMockSchool({ is_favorite: false }),
        createMockSchool({ id: 'school-2', is_favorite: false }),
      ]
      mockQuery.order.mockResolvedValue({ data: mockSchools, error: null })

      const { fetchSchools, favoriteSchools } = useSchools()
      await fetchSchools()

      expect(favoriteSchools.value).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: { message: 'Custom error' } })

      const { fetchSchools } = useSchools()
      await fetchSchools()

      // Should not crash
    })

    it('should clear error on successful operation after previous error', async () => {
      // First call fails
      mockQuery.order.mockResolvedValueOnce({ data: null, error: new Error('Failed') })

      const { fetchSchools, error } = useSchools()
      await fetchSchools()
      expect(error.value).toBe('Failed')

      // Second call succeeds
      mockQuery.order.mockResolvedValueOnce({ data: [], error: null })
      await fetchSchools()
      expect(error.value).toBeNull()
    })

    it('should handle concurrent fetch operations', async () => {
      mockQuery.order.mockResolvedValue({ data: [createMockSchool()], error: null })

      const { fetchSchools } = useSchools()

      // Fire multiple fetches at once
      await Promise.all([fetchSchools(), fetchSchools(), fetchSchools()])

      expect(mockSupabase.from).toHaveBeenCalledTimes(3)
    })
  })
})
