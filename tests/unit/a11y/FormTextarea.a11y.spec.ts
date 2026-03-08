import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import FormTextarea from '~/components/DesignSystem/Form/FormTextarea.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

describe('FormTextarea accessibility', () => {
  it('has no violations in default state', async () => {
    const wrapper = mount(FormTextarea, {
      props: { modelValue: '', label: 'Notes' },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when required', async () => {
    const wrapper = mount(FormTextarea, {
      props: { modelValue: '', label: 'Notes', required: true },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when showing an error', async () => {
    const wrapper = mount(FormTextarea, {
      props: { modelValue: '', label: 'Notes', error: 'Notes are required' },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
