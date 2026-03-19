import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.mock('~/composables/useSchools', () => ({
  useSchools: vi.fn(),
}))

vi.mock('~/composables/useCoaches', () => ({
  useCoaches: vi.fn(),
}))

describe('useEntityNames', () => {
  const mockSchools = ref([{ id: 's1', name: 'Stanford' }])
  const mockCoaches = ref([{ id: 'c1', first_name: 'John', last_name: 'Smith' }])

  beforeEach(async () => {
    const { useSchools } = await import('~/composables/useSchools')
    const { useCoaches } = await import('~/composables/useCoaches')
    vi.mocked(useSchools).mockReturnValue({ schools: mockSchools } as any)
    vi.mocked(useCoaches).mockReturnValue({ coaches: mockCoaches } as any)
  })

  describe('getSchoolName', () => {
    it('returns "Unknown" when schoolId is undefined', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getSchoolName } = useEntityNames()
      expect(getSchoolName(undefined)).toBe('Unknown')
    })

    it('returns "Unknown" when schoolId is not in the list', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getSchoolName } = useEntityNames()
      expect(getSchoolName('s999')).toBe('Unknown')
    })

    it('returns school name when schoolId is found', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getSchoolName } = useEntityNames()
      expect(getSchoolName('s1')).toBe('Stanford')
    })
  })

  describe('getCoachName', () => {
    it('returns "Unknown" when coachId is undefined', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getCoachName } = useEntityNames()
      expect(getCoachName(undefined)).toBe('Unknown')
    })

    it('returns "Unknown" when coachId is not in the list', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getCoachName } = useEntityNames()
      expect(getCoachName('c999')).toBe('Unknown')
    })

    it('returns full name when coachId is found with both names', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getCoachName } = useEntityNames()
      expect(getCoachName('c1')).toBe('John Smith')
    })

    it('returns only last name when first_name is empty string', async () => {
      mockCoaches.value = [{ id: 'c2', first_name: '', last_name: 'Smith' }]
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getCoachName } = useEntityNames()
      expect(getCoachName('c2')).toBe('Smith')
    })

    it('returns "Unknown" when both first_name and last_name are empty', async () => {
      mockCoaches.value = [{ id: 'c3', first_name: '', last_name: '' }]
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getCoachName } = useEntityNames()
      expect(getCoachName('c3')).toBe('Unknown')
    })

    it('returns "Unknown" when both first_name and last_name are undefined', async () => {
      mockCoaches.value = [{ id: 'c4', first_name: undefined, last_name: undefined }] as any
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { getCoachName } = useEntityNames()
      expect(getCoachName('c4')).toBe('Unknown')
    })
  })

  describe('formatCoachName', () => {
    it('returns "First Last" when both names are provided', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { formatCoachName } = useEntityNames()
      expect(formatCoachName('First', 'Last')).toBe('First Last')
    })

    it('returns only first name when lastName is undefined', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { formatCoachName } = useEntityNames()
      expect(formatCoachName('First', undefined)).toBe('First')
    })

    it('returns only last name when firstName is undefined', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { formatCoachName } = useEntityNames()
      expect(formatCoachName(undefined, 'Last')).toBe('Last')
    })

    it('returns "Unknown" when both names are undefined', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { formatCoachName } = useEntityNames()
      expect(formatCoachName(undefined, undefined)).toBe('Unknown')
    })

    it('returns "Unknown" when both names are empty strings', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { formatCoachName } = useEntityNames()
      expect(formatCoachName('', '')).toBe('Unknown')
    })

    it('returns "Unknown" when both names are whitespace-only', async () => {
      const { useEntityNames } = await import('~/composables/useEntityNames')
      const { formatCoachName } = useEntityNames()
      expect(formatCoachName('   ', '   ')).toBe('Unknown')
    })
  })
})
