import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormCheckbox from '~/components/DesignSystem/Form/FormCheckbox.vue'

describe('FormCheckbox', () => {
  it('renders with label', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Accept terms',
      },
    })
    expect(wrapper.text()).toContain('Accept terms')
  })

  it('is checked when modelValue is true', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: true,
        label: 'Test',
      },
    })
    const input = wrapper.find('input[type="checkbox"]')
    expect(input.element.checked).toBe(true)
  })

  it('is unchecked when modelValue is false', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Test',
      },
    })
    const input = wrapper.find('input[type="checkbox"]')
    expect(input.element.checked).toBe(false)
  })

  it('emits update:modelValue with true when checked', async () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Test',
      },
    })
    const input = wrapper.find('input[type="checkbox"]')
    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('emits update:modelValue with false when unchecked', async () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: true,
        label: 'Test',
      },
    })
    const input = wrapper.find('input[type="checkbox"]')
    await input.setValue(false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('disables checkbox when disabled prop is true', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Test',
        disabled: true,
      },
    })
    const input = wrapper.find('input[type="checkbox"]')
    expect(input.element.disabled).toBe(true)
  })

  it('has proper styling classes on checkbox', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Test',
      },
    })
    const input = wrapper.find('input[type="checkbox"]')
    expect(input.classes()).toContain('w-4')
    expect(input.classes()).toContain('h-4')
    expect(input.classes()).toContain('border-2')
    expect(input.classes()).toContain('border-slate-300')
    expect(input.classes()).toContain('rounded')
    expect(input.classes()).toContain('text-blue-600')
  })

  it('associates label with input using unique id', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Test',
      },
    })
    const input = wrapper.find('input[type="checkbox"]')
    const label = wrapper.find('label')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('id')).toBeTruthy()
  })

  it('applies opacity to label when disabled', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Test',
        disabled: true,
      },
    })
    const label = wrapper.find('label')
    expect(label.classes()).toContain('opacity-50')
    expect(label.classes()).toContain('cursor-not-allowed')
  })
})
