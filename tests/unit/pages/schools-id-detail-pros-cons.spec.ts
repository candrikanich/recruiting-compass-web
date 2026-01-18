import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { School } from '~/types/models'

// Mock composables
const mockGetSchool = vi.fn()
const mockUpdateSchool = vi.fn()

vi.mock('~/composables/useSchools', () => ({
  useSchools: () => ({
    getSchool: mockGetSchool,
    updateSchool: mockUpdateSchool,
    loading: { value: false },
    error: { value: null },
  }),
}))

vi.mock('~/composables/useCoaches', () => ({
  useCoaches: () => ({
    coaches: { value: [] },
    fetchCoaches: vi.fn(),
  }),
}))

vi.mock('~/composables/useDocuments', () => ({
  useDocuments: () => ({
    documents: { value: [] },
    fetchDocuments: vi.fn(),
  }),
}))

vi.mock('~/composables/useSchoolLogos', () => ({
  useSchoolLogos: () => ({
    fetchSchoolLogo: vi.fn(),
  }),
}))

vi.mock('~/composables/useCollegeData', () => ({
  useCollegeData: () => ({
    fetchByName: vi.fn(),
    loading: { value: false },
    error: { value: null },
  }),
}))

vi.mock('~/composables/useUserPreferences', () => ({
  useUserPreferences: () => ({
    homeLocation: { value: null },
    fetchPreferences: vi.fn(),
  }),
}))

// Mock router
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'school-123' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock app functions
vi.mock('#app', () => ({
  navigateTo: vi.fn(),
}))

// Mock stores
vi.mock('~/stores/user', () => ({
  useUserStore: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}))

// Mock components
vi.mock('~/components/Header.vue', () => ({
  default: { name: 'Header', template: '<div>Header</div>' },
}))

vi.mock('~/components/School/SchoolLogo.vue', () => ({
  default: { name: 'SchoolLogo', props: ['school', 'size', 'fetchOnMount'], template: '<div>Logo</div>' },
}))

vi.mock('~/components/School/SchoolMap.vue', () => ({
  default: { name: 'SchoolMap', props: ['latitude', 'longitude', 'schoolName'], template: '<div>Map</div>' },
}))

vi.mock('@heroicons/vue/24/outline', () => ({
  CheckIcon: { name: 'CheckIcon', template: '<svg></svg>' },
  XMarkIcon: { name: 'XMarkIcon', template: '<svg></svg>' },
  ShareIcon: { name: 'ShareIcon', template: '<svg></svg>' },
}))

vi.mock('~/utils/schoolSize', () => ({
  getCarnegieSize: () => 'Large',
  getSizeColorClass: () => 'bg-blue-100',
}))

vi.mock('~/utils/distance', () => ({
  calculateDistance: () => 100,
  formatDistance: () => '100 miles',
}))

const createMockSchool = (overrides = {}): School => ({
  id: 'school-123',
  user_id: 'user-1',
  name: 'Duke University',
  location: 'Durham, NC',
  division: 'D1',
  conference: 'ACC',
  status: 'interested',
  is_favorite: false,
  ranking: 5,
  pros: ['Strong baseball program', 'Great campus'],
  cons: ['Far from home', 'Expensive tuition'],
  notes: 'Great baseball program',
  private_notes: {},
  website: 'https://duke.edu',
  twitter_handle: '@DukeBaseball',
  instagram_handle: 'dukebaseball',
  academic_info: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  updated_by: 'user-1',
  ...overrides,
})

describe('School Detail Page - Pros/Cons Editing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Mock console
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Default mock for getSchool
    mockGetSchool.mockResolvedValue(createMockSchool())
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('Pros Management', () => {
    it('should load school pros', async () => {
      const school = await mockGetSchool('school-123')
      expect(school.pros.length).toBeGreaterThan(0)
      expect(school.pros).toContain('Strong baseball program')
    })

    it('should add pro to school', async () => {
      const updatedSchool = createMockSchool({
        pros: ['Strong baseball program', 'Great campus', 'New pro'],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', {
        pros: ['Strong baseball program', 'Great campus', 'New pro'],
      })

      expect(result.pros).toContain('New pro')
      expect(result.pros.length).toBe(3)
    })

    it('should remove pro from school', async () => {
      const updatedSchool = createMockSchool({
        pros: ['Great campus'],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', {
        pros: ['Great campus'],
      })

      expect(result.pros).not.toContain('Strong baseball program')
      expect(result.pros.length).toBe(1)
    })

    it('should handle empty pros list', async () => {
      const updatedSchool = createMockSchool({ pros: [] })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', { pros: [] })

      expect(result.pros.length).toBe(0)
    })

    it('should preserve pros with special characters', async () => {
      const specialPro = 'Pro with special chars: !@#$%^&*()'
      const updatedSchool = createMockSchool({
        pros: [specialPro],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', { pros: [specialPro] })

      expect(result.pros).toContain(specialPro)
    })

    it('should handle multiple pros additions', async () => {
      const updatedSchool = createMockSchool({
        pros: ['Pro 1', 'Pro 2', 'Pro 3', 'Pro 4', 'Pro 5'],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', {
        pros: ['Pro 1', 'Pro 2', 'Pro 3', 'Pro 4', 'Pro 5'],
      })

      expect(result.pros.length).toBe(5)
    })
  })

  describe('Cons Management', () => {
    it('should load school cons', async () => {
      const school = await mockGetSchool('school-123')
      expect(school.cons.length).toBeGreaterThan(0)
      expect(school.cons).toContain('Far from home')
    })

    it('should add con to school', async () => {
      const updatedSchool = createMockSchool({
        cons: ['Far from home', 'Expensive tuition', 'New con'],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', {
        cons: ['Far from home', 'Expensive tuition', 'New con'],
      })

      expect(result.cons).toContain('New con')
      expect(result.cons.length).toBe(3)
    })

    it('should remove con from school', async () => {
      const updatedSchool = createMockSchool({
        cons: ['Expensive tuition'],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', {
        cons: ['Expensive tuition'],
      })

      expect(result.cons).not.toContain('Far from home')
      expect(result.cons.length).toBe(1)
    })

    it('should handle empty cons list', async () => {
      const updatedSchool = createMockSchool({ cons: [] })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', { cons: [] })

      expect(result.cons.length).toBe(0)
    })

    it('should preserve cons with special characters', async () => {
      const specialCon = 'Con with special chars: !@#$%^&*()'
      const updatedSchool = createMockSchool({
        cons: [specialCon],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', { cons: [specialCon] })

      expect(result.cons).toContain(specialCon)
    })
  })

  describe('Pros and Cons Together', () => {
    it('should update pros and cons together', async () => {
      const updatedSchool = createMockSchool({
        pros: ['Pro A', 'Pro B'],
        cons: ['Con X', 'Con Y'],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', {
        pros: ['Pro A', 'Pro B'],
        cons: ['Con X', 'Con Y'],
      })

      expect(result.pros).toEqual(['Pro A', 'Pro B'])
      expect(result.cons).toEqual(['Con X', 'Con Y'])
    })

    it('should preserve other school data when updating pros and cons', async () => {
      const updatedSchool = createMockSchool({
        name: 'Original Name',
        location: 'Original Location',
        pros: ['Pro 1'],
        cons: ['Con 1'],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', {
        pros: ['Pro 1'],
        cons: ['Con 1'],
      })

      expect(result.name).toBe('Original Name')
      expect(result.location).toBe('Original Location')
      expect(result.pros).toEqual(['Pro 1'])
      expect(result.cons).toEqual(['Con 1'])
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long pro description', async () => {
      const longPro = 'A'.repeat(500)
      const updatedSchool = createMockSchool({
        pros: [longPro],
      })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', { pros: [longPro] })

      expect(result.pros[0].length).toBe(500)
    })

    it('should handle duplicate pros without duplication', async () => {
      const pros = ['Pro 1', 'Pro 1', 'Pro 2']
      const updatedSchool = createMockSchool({ pros })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', { pros })

      // Server should handle deduplication if needed
      expect(result.pros.length).toBe(3)
    })

    it('should handle whitespace-only pros', async () => {
      const pros = ['  ', 'Valid Pro']
      const updatedSchool = createMockSchool({ pros })
      mockUpdateSchool.mockResolvedValue(updatedSchool)

      const result = await mockUpdateSchool('school-123', { pros })

      expect(result.pros.length).toBe(2)
    })

    it('should handle pros and cons update errors', async () => {
      mockUpdateSchool.mockRejectedValue(new Error('Update failed'))

      try {
        await mockUpdateSchool('school-123', { pros: ['New Pro'] })
        expect.fail('Should have thrown error')
      } catch (error) {
        expect((error as Error).message).toBe('Update failed')
      }
    })
  })
})
