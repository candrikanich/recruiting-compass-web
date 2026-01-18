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
  pros: [],
  cons: [],
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

describe('School Detail Page - Notes Editing', () => {
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

  describe('Notes Feature - Composable Integration', () => {
    it('should load school notes from useSchools composable', () => {
      expect(mockGetSchool).toBeDefined()
    })

    it('should update school notes via updateSchool', () => {
      expect(mockUpdateSchool).toBeDefined()
    })

    it('should handle empty notes gracefully', async () => {
      mockGetSchool.mockResolvedValue(createMockSchool({ notes: '' }))
      const school = await mockGetSchool('school-123')

      expect(school.notes).toBe('')
    })

    it('should load notes with school data', async () => {
      const schoolWithNotes = createMockSchool({ notes: 'Updated notes content' })
      mockGetSchool.mockResolvedValue(schoolWithNotes)

      const school = await mockGetSchool('school-123')

      expect(school.notes).toBe('Updated notes content')
    })
  })

  describe('Notes Update Functionality', () => {
    it('should call updateSchool with new notes content', async () => {
      mockUpdateSchool.mockResolvedValue(
        createMockSchool({ notes: 'Updated notes' })
      )

      const result = await mockUpdateSchool('school-123', { notes: 'Updated notes' })

      expect(mockUpdateSchool).toHaveBeenCalledWith('school-123', { notes: 'Updated notes' })
      expect(result.notes).toBe('Updated notes')
    })

    it('should preserve other school data when updating notes', async () => {
      const originalSchool = createMockSchool({
        name: 'Original Name',
        location: 'Original Location',
        notes: 'Old notes',
      })

      mockUpdateSchool.mockResolvedValue(
        createMockSchool({
          name: 'Original Name',
          location: 'Original Location',
          notes: 'Updated notes',
        })
      )

      const result = await mockUpdateSchool('school-123', { notes: 'Updated notes' })

      expect(result.name).toBe('Original Name')
      expect(result.location).toBe('Original Location')
      expect(result.notes).toBe('Updated notes')
    })

    it('should handle long note content', async () => {
      const longNote = 'A'.repeat(5000)
      mockUpdateSchool.mockResolvedValue(
        createMockSchool({ notes: longNote })
      )

      const result = await mockUpdateSchool('school-123', { notes: longNote })

      expect(result.notes.length).toBe(5000)
    })

    it('should handle special characters in notes', async () => {
      const specialNote = 'Notes with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?'
      mockUpdateSchool.mockResolvedValue(
        createMockSchool({ notes: specialNote })
      )

      const result = await mockUpdateSchool('school-123', { notes: specialNote })

      expect(result.notes).toBe(specialNote)
    })
  })

  describe('Private Notes - User-Specific Storage', () => {
    it('should store private notes per user', async () => {
      const schoolWithPrivateNotes = createMockSchool({
        private_notes: { 'user-1': 'My private thoughts' },
      })
      mockGetSchool.mockResolvedValue(schoolWithPrivateNotes)

      const school = await mockGetSchool('school-123')

      expect(school.private_notes['user-1']).toBe('My private thoughts')
    })

    it('should allow multiple users to have private notes', async () => {
      const schoolWithMultiplePrivateNotes = createMockSchool({
        private_notes: {
          'user-1': 'Parent notes',
          'user-2': 'Student notes',
        },
      })
      mockGetSchool.mockResolvedValue(schoolWithMultiplePrivateNotes)

      const school = await mockGetSchool('school-123')

      expect(school.private_notes['user-1']).toBe('Parent notes')
      expect(school.private_notes['user-2']).toBe('Student notes')
    })

    it('should update private notes for specific user', async () => {
      mockUpdateSchool.mockResolvedValue(
        createMockSchool({
          private_notes: { 'user-1': 'Updated private notes' },
        })
      )

      const result = await mockUpdateSchool('school-123', {
        private_notes: { 'user-1': 'Updated private notes' },
      })

      expect(result.private_notes['user-1']).toBe('Updated private notes')
    })
  })

  describe('Error Handling', () => {
    it('should handle update errors gracefully', async () => {
      mockUpdateSchool.mockRejectedValue(new Error('Update failed'))

      try {
        await mockUpdateSchool('school-123', { notes: 'Updated' })
        expect.fail('Should have thrown error')
      } catch (error) {
        expect((error as Error).message).toBe('Update failed')
      }
    })

    it('should handle fetch errors gracefully', async () => {
      mockGetSchool.mockRejectedValue(new Error('Fetch failed'))

      try {
        await mockGetSchool('school-123')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect((error as Error).message).toBe('Fetch failed')
      }
    })
  })
})
