import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParentOnboardingBanner from '~/components/Dashboard/ParentOnboardingBanner.vue'

const nuxtLinkStub = { template: '<a :href="to"><slot /></a>', props: ['to'] }

describe('ParentOnboardingBanner', () => {
  it('renders the banner with correct message', () => {
    const wrapper = mount(ParentOnboardingBanner, {
      global: { stubs: { NuxtLink: nuxtLinkStub } },
    })
    expect(wrapper.text()).toContain("Connect your athlete to get started")
  })

  it('has a link to family management', () => {
    const wrapper = mount(ParentOnboardingBanner, {
      global: { stubs: { NuxtLink: nuxtLinkStub } },
    })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/settings/family-management')
  })

  it('has role="region" with aria-label', () => {
    const wrapper = mount(ParentOnboardingBanner, {
      global: { stubs: { NuxtLink: nuxtLinkStub } },
    })
    const root = wrapper.find('[role="region"]')
    expect(root.exists()).toBe(true)
    expect(root.attributes('aria-label')).toBe('Athlete onboarding')
  })
})
