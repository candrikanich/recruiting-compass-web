import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CoachesPage from '~/pages/coaches.vue'
import type { Coach } from '~/types/models'
import type { School } from '~/types/models'

// Mock composables
const mockFetchAllCoaches = vi.fn()
const mockFetchSchools = vi.fn()

vi.mock('~/composables/useCoaches', () => ({
  useCoaches: () => ({
    coaches: mockCoaches,
    loading: mockLoading,
    fetchAllCoaches: mockFetchAllCoaches,
  }),
}))

vi.mock('~/composables/useSchools', () => ({
  useSchools: () => ({
    schools: mockSchools,
    fetchSchools: mockFetchSchools,
  }),
}))

// Mock reactive data
const mockCoaches = { value: [] as Coach[] }
const mockSchools = { value: [] as School[] }
const mockLoading = { value: false }

// Mock Header component
vi.mock('~/components/Header.vue', () => ({
  default: {
    name: 'Header',
    template: '<div>Header</div>',
  },
}))

// Mock CoachCard component
vi.mock('~/components/CoachCard.vue', () => ({
  default: {
    name: 'CoachCard',
    props: ['coach', 'schoolName'],
    emits: ['email', 'text', 'tweet', 'instagram'],
    template: '<div class="coach-card">{{ coach.first_name }} {{ coach.last_name }}</div>',
  },
}))

describe('pages/coaches.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Reset mock data
    mockCoaches.value = []
    mockSchools.value = []
    mockLoading.value = false

    // Mock window methods
    global.window = Object.create(window)
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    })
    Object.defineProperty(window, 'open', {
      writable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createMockCoach = (overrides = {}): Coach => ({
    id: 'coach-1',
    school_id: 'school-1',
    user_id: 'user-1',
    role: 'head',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@university.edu',
    phone: '555-1234',
    twitter_handle: '@coachsmith',
    instagram_handle: 'coachsmith',
    notes: 'Head coach',
    responsiveness_score: 85,
    last_contact_date: '2024-01-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  })

  const createMockSchool = (overrides = {}): School => ({
    id: 'school-1',
    user_id: 'user-1',
    name: 'University of Test',
    location: 'Test City, TS',
    division: 'D1',
    conference: 'Test Conference',
    ranking: null,
    is_favorite: false,
    website: 'https://test.edu',
    twitter_handle: null,
    instagram_handle: null,
    status: 'researching',
    notes: null,
    pros: [],
    cons: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  })

  describe('Page Load', () => {
    it('should render page with header', () => {
      const wrapper = mount(CoachesPage)

      expect(wrapper.text()).toContain('All Coaches')
      expect(wrapper.text()).toContain('Search and manage coaches across all schools')
    })

    it('should fetch coaches and schools on mount', async () => {
      mount(CoachesPage)
      await flushPromises()

      expect(mockFetchSchools).toHaveBeenCalledOnce()
      expect(mockFetchAllCoaches).toHaveBeenCalledOnce()
    })

    it('should display loading state', () => {
      mockLoading.value = true
      const wrapper = mount(CoachesPage)

      expect(wrapper.text()).toContain('Loading coaches...')
    })

    it('should display empty state when no coaches', () => {
      mockCoaches.value = []
      mockLoading.value = false
      const wrapper = mount(CoachesPage)

      expect(wrapper.text()).toContain('No coaches found')
    })

    it('should display coaches when loaded', () => {
      mockCoaches.value = [
        createMockCoach(),
        createMockCoach({ id: 'coach-2', first_name: 'Jane' }),
      ]
      const wrapper = mount(CoachesPage)

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(2)
    })
  })

  describe('Search Filtering', () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', first_name: 'John', last_name: 'Smith', email: 'john@test.edu' }),
        createMockCoach({ id: 'coach-2', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.edu' }),
        createMockCoach({ id: 'coach-3', first_name: 'Bob', last_name: 'Johnson', phone: '555-9999' }),
      ]
    })

    it('should filter coaches by first name', async () => {
      const wrapper = mount(CoachesPage)
      const searchInput = wrapper.find('#search')

      await searchInput.setValue('John')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(2) // John Smith and Bob Johnson
    })

    it('should filter coaches by last name', async () => {
      const wrapper = mount(CoachesPage)
      const searchInput = wrapper.find('#search')

      await searchInput.setValue('Smith')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(1)
      expect(wrapper.text()).toContain('John Smith')
    })

    it('should filter coaches by email', async () => {
      const wrapper = mount(CoachesPage)
      const searchInput = wrapper.find('#search')

      await searchInput.setValue('jane@test.edu')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(1)
      expect(wrapper.text()).toContain('Jane Doe')
    })

    it('should filter coaches by phone', async () => {
      const wrapper = mount(CoachesPage)
      const searchInput = wrapper.find('#search')

      await searchInput.setValue('555-9999')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(1)
      expect(wrapper.text()).toContain('Bob Johnson')
    })

    it('should be case insensitive', async () => {
      const wrapper = mount(CoachesPage)
      const searchInput = wrapper.find('#search')

      await searchInput.setValue('JOHN')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards.length).toBeGreaterThan(0)
    })

    it('should show no results when search matches nothing', async () => {
      const wrapper = mount(CoachesPage)
      const searchInput = wrapper.find('#search')

      await searchInput.setValue('NonExistentCoach')
      await flushPromises()

      expect(wrapper.text()).toContain('No coaches found')
    })

    it('should update results count based on search', async () => {
      const wrapper = mount(CoachesPage)
      const searchInput = wrapper.find('#search')

      // Initially shows all 3
      expect(wrapper.text()).toContain('Showing 3')

      await searchInput.setValue('John')
      await flushPromises()

      // After filtering
      expect(wrapper.text()).toContain('Showing 2')
    })
  })

  describe('Role Filtering', () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', role: 'head' }),
        createMockCoach({ id: 'coach-2', role: 'assistant' }),
        createMockCoach({ id: 'coach-3', role: 'recruiting' }),
      ]
    })

    it('should filter coaches by head coach role', async () => {
      const wrapper = mount(CoachesPage)
      const roleSelect = wrapper.find('#role')

      await roleSelect.setValue('head')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(1)
    })

    it('should filter coaches by assistant role', async () => {
      const wrapper = mount(CoachesPage)
      const roleSelect = wrapper.find('#role')

      await roleSelect.setValue('assistant')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(1)
    })

    it('should filter coaches by recruiting coordinator role', async () => {
      const wrapper = mount(CoachesPage)
      const roleSelect = wrapper.find('#role')

      await roleSelect.setValue('recruiting')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(1)
    })

    it('should show all coaches when role is empty', async () => {
      const wrapper = mount(CoachesPage)
      const roleSelect = wrapper.find('#role')

      await roleSelect.setValue('')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(3)
    })
  })

  describe('School Filtering', () => {
    beforeEach(() => {
      mockSchools.value = [
        createMockSchool({ id: 'school-1', name: 'University A' }),
        createMockSchool({ id: 'school-2', name: 'University B' }),
      ]

      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', school_id: 'school-1' }),
        createMockCoach({ id: 'coach-2', school_id: 'school-1' }),
        createMockCoach({ id: 'coach-3', school_id: 'school-2' }),
      ]
    })

    it('should filter coaches by school', async () => {
      const wrapper = mount(CoachesPage)
      const schoolSelect = wrapper.find('#school')

      await schoolSelect.setValue('school-1')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(2)
    })

    it('should show all coaches when school is empty', async () => {
      const wrapper = mount(CoachesPage)
      const schoolSelect = wrapper.find('#school')

      await schoolSelect.setValue('')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(3)
    })

    it('should display school options in dropdown', () => {
      const wrapper = mount(CoachesPage)
      const schoolSelect = wrapper.find('#school')

      expect(schoolSelect.html()).toContain('University A')
      expect(schoolSelect.html()).toContain('University B')
    })
  })

  describe('Sorting', () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({
          id: 'coach-1',
          first_name: 'Charlie',
          responsiveness_score: 60,
          last_contact_date: '2024-01-10',
        }),
        createMockCoach({
          id: 'coach-2',
          first_name: 'Alice',
          responsiveness_score: 90,
          last_contact_date: '2024-01-20',
        }),
        createMockCoach({
          id: 'coach-3',
          first_name: 'Bob',
          responsiveness_score: 40,
          last_contact_date: '2024-01-15',
        }),
      ]
    })

    it('should sort by name (A-Z) by default', () => {
      const wrapper = mount(CoachesPage)

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards[0].text()).toContain('Alice')
      expect(coachCards[1].text()).toContain('Bob')
      expect(coachCards[2].text()).toContain('Charlie')
    })

    it('should sort by name when selected', async () => {
      const wrapper = mount(CoachesPage)
      const sortSelect = wrapper.find('#sort')

      await sortSelect.setValue('name')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards[0].text()).toContain('Alice')
    })

    it('should sort by last contact (recent first)', async () => {
      const wrapper = mount(CoachesPage)
      const sortSelect = wrapper.find('#sort')

      await sortSelect.setValue('lastContact')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards[0].text()).toContain('Alice') // 2024-01-20
      expect(coachCards[1].text()).toContain('Bob') // 2024-01-15
      expect(coachCards[2].text()).toContain('Charlie') // 2024-01-10
    })

    it('should sort by responsiveness (highest first)', async () => {
      const wrapper = mount(CoachesPage)
      const sortSelect = wrapper.find('#sort')

      await sortSelect.setValue('responsiveness')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards[0].text()).toContain('Alice') // 90
      expect(coachCards[1].text()).toContain('Charlie') // 60
      expect(coachCards[2].text()).toContain('Bob') // 40
    })

    it('should handle null last_contact_date in sorting', async () => {
      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', last_contact_date: '2024-01-15' }),
        createMockCoach({ id: 'coach-2', last_contact_date: null }),
      ]

      const wrapper = mount(CoachesPage)
      const sortSelect = wrapper.find('#sort')

      await sortSelect.setValue('lastContact')
      await flushPromises()

      // Should not crash
      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(2)
    })

    it('should handle null responsiveness_score in sorting', async () => {
      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', responsiveness_score: 80 }),
        createMockCoach({ id: 'coach-2', responsiveness_score: 0 }),
      ]

      const wrapper = mount(CoachesPage)
      const sortSelect = wrapper.find('#sort')

      await sortSelect.setValue('responsiveness')
      await flushPromises()

      // Should not crash
      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(2)
    })
  })

  describe('Clear Filters', () => {
    beforeEach(() => {
      mockCoaches.value = [createMockCoach()]
    })

    it('should reset all filters when clicked', async () => {
      const wrapper = mount(CoachesPage)

      // Set filters
      await wrapper.find('#search').setValue('John')
      await wrapper.find('#role').setValue('head')
      await wrapper.find('#sort').setValue('responsiveness')
      await flushPromises()

      // Click clear
      const clearButton = wrapper.find('button').filter((btn: any) => btn.text() === 'Clear Filters')[0]
      await clearButton.trigger('click')
      await flushPromises()

      // Check filters are cleared
      expect((wrapper.find('#search').element as HTMLInputElement).value).toBe('')
      expect((wrapper.find('#role').element as HTMLSelectElement).value).toBe('')
      expect((wrapper.find('#sort').element as HTMLSelectElement).value).toBe('name')
    })
  })

  describe('Results Summary', () => {
    it('should show correct count for single coach', () => {
      mockCoaches.value = [createMockCoach()]
      const wrapper = mount(CoachesPage)

      expect(wrapper.text()).toContain('Showing 1 coach')
    })

    it('should show correct count for multiple coaches', () => {
      mockCoaches.value = [
        createMockCoach({ id: 'coach-1' }),
        createMockCoach({ id: 'coach-2' }),
        createMockCoach({ id: 'coach-3' }),
      ]
      const wrapper = mount(CoachesPage)

      expect(wrapper.text()).toContain('Showing 3 coaches')
    })

    it('should update count based on filters', async () => {
      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', first_name: 'John' }),
        createMockCoach({ id: 'coach-2', first_name: 'Jane' }),
      ]
      const wrapper = mount(CoachesPage)

      expect(wrapper.text()).toContain('Showing 2 coaches')

      await wrapper.find('#search').setValue('John')
      await flushPromises()

      expect(wrapper.text()).toContain('Showing 1 coach')
    })
  })

  describe('Quick Action Handlers', () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({
          email: 'test@test.edu',
          phone: '555-1234',
          twitter_handle: '@coach',
          instagram_handle: 'coach',
        }),
      ]
    })

    it('should handle email action', async () => {
      const wrapper = mount(CoachesPage)

      // Find CoachCard and emit email event
      const coachCard = wrapper.findComponent({ name: 'CoachCard' })
      await coachCard.vm.$emit('email', mockCoaches.value[0])

      expect(window.location.href).toBe('mailto:test@test.edu')
    })

    it('should handle text action', async () => {
      const wrapper = mount(CoachesPage)

      const coachCard = wrapper.findComponent({ name: 'CoachCard' })
      await coachCard.vm.$emit('text', mockCoaches.value[0])

      expect(window.location.href).toBe('sms:5551234')
    })

    it('should handle twitter action', async () => {
      const wrapper = mount(CoachesPage)

      const coachCard = wrapper.findComponent({ name: 'CoachCard' })
      await coachCard.vm.$emit('tweet', mockCoaches.value[0])

      expect(window.open).toHaveBeenCalledWith('https://twitter.com/coach', '_blank')
    })

    it('should handle instagram action', async () => {
      const wrapper = mount(CoachesPage)

      const coachCard = wrapper.findComponent({ name: 'CoachCard' })
      await coachCard.vm.$emit('instagram', mockCoaches.value[0])

      expect(window.open).toHaveBeenCalledWith('https://instagram.com/coach', '_blank')
    })

    it('should strip @ from Twitter handle', async () => {
      mockCoaches.value[0].twitter_handle = '@coach'
      const wrapper = mount(CoachesPage)

      const coachCard = wrapper.findComponent({ name: 'CoachCard' })
      await coachCard.vm.$emit('tweet', mockCoaches.value[0])

      expect(window.open).toHaveBeenCalledWith('https://twitter.com/coach', '_blank')
    })

    it('should strip non-numeric characters from phone', async () => {
      mockCoaches.value[0].phone = '(555) 123-4567'
      const wrapper = mount(CoachesPage)

      const coachCard = wrapper.findComponent({ name: 'CoachCard' })
      await coachCard.vm.$emit('text', mockCoaches.value[0])

      expect(window.location.href).toBe('sms:5551234567')
    })
  })

  describe('School Name Display', () => {
    beforeEach(() => {
      mockSchools.value = [
        createMockSchool({ id: 'school-1', name: 'University A' }),
        createMockSchool({ id: 'school-2', name: 'University B' }),
      ]

      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', school_id: 'school-1' }),
        createMockCoach({ id: 'coach-2', school_id: 'school-2' }),
        createMockCoach({ id: 'coach-3', school_id: undefined }),
      ]
    })

    it('should pass correct school name to CoachCard', () => {
      const wrapper = mount(CoachesPage)

      const coachCards = wrapper.findAllComponents({ name: 'CoachCard' })
      expect(coachCards[0].props('schoolName')).toBe('University A')
      expect(coachCards[1].props('schoolName')).toBe('University B')
    })

    it('should return "Unknown School" for undefined school_id', () => {
      const wrapper = mount(CoachesPage)

      const coachCards = wrapper.findAllComponents({ name: 'CoachCard' })
      expect(coachCards[2].props('schoolName')).toBe('Unknown School')
    })

    it('should return "Unknown School" for non-existent school_id', () => {
      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', school_id: 'non-existent-id' }),
      ]

      const wrapper = mount(CoachesPage)

      const coachCard = wrapper.findComponent({ name: 'CoachCard' })
      expect(coachCard.props('schoolName')).toBe('Unknown School')
    })
  })

  describe('Combined Filters', () => {
    beforeEach(() => {
      mockSchools.value = [
        createMockSchool({ id: 'school-1', name: 'University A' }),
      ]

      mockCoaches.value = [
        createMockCoach({ id: 'coach-1', first_name: 'John', role: 'head', school_id: 'school-1' }),
        createMockCoach({ id: 'coach-2', first_name: 'Jane', role: 'assistant', school_id: 'school-1' }),
        createMockCoach({ id: 'coach-3', first_name: 'Bob', role: 'head', school_id: 'school-2' }),
      ]
    })

    it('should apply search and role filters together', async () => {
      const wrapper = mount(CoachesPage)

      await wrapper.find('#search').setValue('John')
      await wrapper.find('#role').setValue('head')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(1)
      expect(wrapper.text()).toContain('John')
    })

    it('should apply all filters together', async () => {
      const wrapper = mount(CoachesPage)

      await wrapper.find('#search').setValue('John')
      await wrapper.find('#role').setValue('head')
      await wrapper.find('#school').setValue('school-1')
      await flushPromises()

      const coachCards = wrapper.findAll('.coach-card')
      expect(coachCards).toHaveLength(1)
    })

    it('should show no results when combined filters match nothing', async () => {
      const wrapper = mount(CoachesPage)

      await wrapper.find('#search').setValue('John')
      await wrapper.find('#role').setValue('assistant')
      await flushPromises()

      expect(wrapper.text()).toContain('No coaches found')
    })
  })
})
