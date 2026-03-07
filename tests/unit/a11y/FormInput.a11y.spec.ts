import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import FormInput from '~/components/DesignSystem/Form/FormInput.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

const fieldErrorStub = {
  template: '<div :id="id" role="alert">{{ error }}</div>',
  props: ['error', 'id'],
}

describe('FormInput accessibility', () => {
  it('has no violations in default state', async () => {
    const wrapper = mount(FormInput, {
      props: { modelValue: '', label: 'Email address' },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when required', async () => {
    const wrapper = mount(FormInput, {
      props: { modelValue: '', label: 'Email address', required: true },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when showing an error', async () => {
    const wrapper = mount(FormInput, {
      props: { modelValue: '', label: 'Email address', error: 'This field is required' },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when disabled', async () => {
    const wrapper = mount(FormInput, {
      props: { modelValue: '', label: 'Email address', disabled: true },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
