import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormDateInput from '~/components/DesignSystem/Form/FormDateInput.vue'

describe('FormDateInput', () => {
  it('renders with label', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Birth Date',
      },
    })
    expect(wrapper.text()).toContain('Birth Date')
  })

  it('renders date input with correct value', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '2024-01-15',
        label: 'Date',
      },
    })
    const input = wrapper.find('input[type="date"]')
    expect(input.element.value).toBe('2024-01-15')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
      },
    })
    const input = wrapper.find('input[type="date"]')
    await input.setValue('2024-02-20')
    expect(wrapper.emitted('update:modelValue')).toEqual([['2024-02-20']])
  })

  it('shows required asterisk when required is true', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
        required: true,
      },
    })
    const asterisk = wrapper.find('span[aria-hidden="true"]')
    expect(asterisk.exists()).toBe(true)
    expect(asterisk.text()).toBe('*')
    expect(asterisk.classes()).toContain('text-red-500')
  })

  it('sets required attribute on input when required is true', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
        required: true,
      },
    })
    const input = wrapper.find('input[type="date"]')
    expect(input.element.required).toBe(true)
  })

  it('disables input when disabled is true', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
        disabled: true,
      },
    })
    const input = wrapper.find('input[type="date"]')
    expect(input.element.disabled).toBe(true)
    expect(input.classes()).toContain('disabled:bg-slate-50')
  })

  it('displays error message when error prop is provided', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
        error: 'Date is required',
      },
      global: {
        stubs: {
          DesignSystemFieldError: {
            template: '<div class="error">{{ error }}</div>',
            props: ['error'],
          },
        },
      },
    })
    expect(wrapper.text()).toContain('Date is required')
  })

  it('applies error styling when error prop is provided', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
        error: 'Invalid date',
      },
    })
    const input = wrapper.find('input[type="date"]')
    expect(input.classes()).toContain('border-red-500')
  })

  it('has proper styling classes', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
      },
    })
    const input = wrapper.find('input[type="date"]')
    expect(input.classes()).toContain('w-full')
    expect(input.classes()).toContain('px-4')
    expect(input.classes()).toContain('py-2.5')
    expect(input.classes()).toContain('border-2')
    expect(input.classes()).toContain('border-slate-300')
    expect(input.classes()).toContain('rounded-xl')
  })

  it('associates label with input using unique id', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
      },
    })
    const input = wrapper.find('input[type="date"]')
    const label = wrapper.find('label')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('id')).toBeTruthy()
  })
})
