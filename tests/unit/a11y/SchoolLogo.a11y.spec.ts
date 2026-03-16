import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import { vi } from 'vitest'
import SchoolLogo from '~/components/School/SchoolLogo.vue'
import type { School } from '~/types/models'

vi.mock('~/composables/useSchoolLogos', () => ({
  useSchoolLogos: () => ({
    fetchSchoolLogo: vi.fn().mockResolvedValue(null),
    getSchoolLogoCached: vi.fn().mockReturnValue(null),
    isLoading: { value: false },
  }),
}))

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

const mockSchool = {
  id: '1',
  name: 'Stanford University',
} as School

describe('SchoolLogo accessibility', () => {
  it('has no violations in fallback state (no logo)', async () => {
    const wrapper = mount(SchoolLogo, {
      props: { school: mockSchool, fetchOnMount: false },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
