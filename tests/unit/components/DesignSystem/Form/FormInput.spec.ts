import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormInput from '~/components/DesignSystem/Form/FormInput.vue'

describe('FormInput', () => {
  it('renders label and input correctly', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: 'Test Value',
        label: 'School Name',
        placeholder: 'Enter school name'
      }
    })

    const label = wrapper.find('label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toContain('School Name')

    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('Enter school name')
    expect(input.element.value).toBe('Test Value')
  })

  it('shows required indicator when required is true', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'Email',
        required: true
      }
    })

    const label = wrapper.find('label')
    expect(label.html()).toContain('text-red-500')
    expect(label.html()).toContain('*')
    expect(label.html()).toContain('(required)')

    const input = wrapper.find('input')
    expect(input.attributes('required')).toBeDefined()
  })

  it('displays error message and applies error styling', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'School Name',
        error: 'School name is required'
      },
      global: {
        stubs: {
          DesignSystemFieldError: {
            template: '<div class="error">{{ error }}</div>',
            props: ['error', 'id']
          }
        }
      }
    })

    const input = wrapper.find('input')
    expect(input.classes()).toContain('border-red-500')
    expect(input.attributes('aria-invalid')).toBe('true')
    // useId() generates a unique ID, so we just check that aria-describedby is set
    expect(input.attributes('aria-describedby')).toContain('-error')

    // Check for error component
    const errorDiv = wrapper.find('.error')
    expect(errorDiv.exists()).toBe(true)
    expect(errorDiv.text()).toBe('School name is required')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'School Name'
      }
    })

    const input = wrapper.find('input')
    await input.setValue('New Value')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['New Value'])
  })

  it('shows auto-filled indicator when autoFilled is true', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: 'Auto-filled Value',
        label: 'School Name',
        autoFilled: true
      }
    })

    const label = wrapper.find('label')
    expect(label.html()).toContain('(auto-filled)')
    expect(label.html()).toContain('text-blue-700')
  })

  it('disables input when disabled is true', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'School Name',
        disabled: true
      }
    })

    const input = wrapper.find('input')
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('emits blur event when input loses focus', async () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'School Name'
      }
    })

    const input = wrapper.find('input')
    await input.trigger('blur')

    expect(wrapper.emitted('blur')).toBeTruthy()
    expect(wrapper.emitted('blur')?.[0]).toEqual([])
  })
})
