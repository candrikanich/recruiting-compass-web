import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormTimeInput from '~/components/DesignSystem/Form/FormTimeInput.vue'

describe('FormTimeInput', () => {
  it('renders with label', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Event Time',
      },
    })
    expect(wrapper.text()).toContain('Event Time')
  })

  it('renders time input with correct value', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '14:30',
        label: 'Time',
      },
    })
    const input = wrapper.find('input[type="time"]')
    expect(input.element.value).toBe('14:30')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Time',
      },
    })
    const input = wrapper.find('input[type="time"]')
    await input.setValue('09:15')
    expect(wrapper.emitted('update:modelValue')).toEqual([['09:15']])
  })

  it('shows required asterisk when required is true', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Time',
        required: true,
      },
    })
    const asterisk = wrapper.find('span[aria-hidden="true"]')
    expect(asterisk.exists()).toBe(true)
    expect(asterisk.text()).toBe('*')
    expect(asterisk.classes()).toContain('text-red-500')
  })

  it('sets required attribute on input when required is true', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Time',
        required: true,
      },
    })
    const input = wrapper.find('input[type="time"]')
    expect(input.element.required).toBe(true)
  })

  it('disables input when disabled is true', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Time',
        disabled: true,
      },
    })
    const input = wrapper.find('input[type="time"]')
    expect(input.element.disabled).toBe(true)
    expect(input.classes()).toContain('disabled:bg-slate-50')
  })

  it('displays error message when error prop is provided', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Time',
        error: 'Time is required',
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
    expect(wrapper.text()).toContain('Time is required')
  })

  it('applies error styling when error prop is provided', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Time',
        error: 'Invalid time',
      },
    })
    const input = wrapper.find('input[type="time"]')
    expect(input.classes()).toContain('border-red-500')
  })

  it('has proper styling classes', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Time',
      },
    })
    const input = wrapper.find('input[type="time"]')
    expect(input.classes()).toContain('w-full')
    expect(input.classes()).toContain('px-4')
    expect(input.classes()).toContain('py-2.5')
    expect(input.classes()).toContain('border-2')
    expect(input.classes()).toContain('border-slate-300')
    expect(input.classes()).toContain('rounded-xl')
  })

  it('associates label with input using unique id', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Time',
      },
    })
    const input = wrapper.find('input[type="time"]')
    const label = wrapper.find('label')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('id')).toBeTruthy()
  })
})
