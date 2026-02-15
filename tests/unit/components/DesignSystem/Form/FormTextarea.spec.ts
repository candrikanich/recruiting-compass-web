import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FormTextarea from '~/components/DesignSystem/Form/FormTextarea.vue'

describe('FormTextarea', () => {
  it('renders label and textarea correctly', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Description',
        placeholder: 'Enter description'
      }
    })

    expect(wrapper.find('label').text()).toContain('Description')
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toBe('Enter description')
    expect(wrapper.find('span[aria-hidden="true"]').exists()).toBe(false)
  })

  it('sets correct number of rows', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Notes',
        rows: 6
      }
    })

    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('rows')).toBe('6')
  })

  it('shows character counter when showCounter is true', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: 'Hello',
        label: 'Bio',
        maxlength: 100,
        showCounter: true
      }
    })

    const counter = wrapper.find('.text-xs')
    expect(counter.exists()).toBe(true)
    expect(counter.text()).toBe('5/100 characters')
    expect(counter.classes()).toContain('text-slate-500')
  })

  it('applies warning color when approaching max length', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: 'a'.repeat(92), // 92/100 = 92% > 90%
        label: 'Bio',
        maxlength: 100,
        showCounter: true
      }
    })

    const counter = wrapper.find('.text-xs')
    expect(counter.exists()).toBe(true)
    expect(counter.text()).toBe('92/100 characters')
    expect(counter.classes()).toContain('text-red-600')
  })

  it('displays error message and applies error styling', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Description',
        error: 'Description is required',
        required: true
      }
    })

    const textarea = wrapper.find('textarea')
    expect(textarea.classes()).toContain('border-red-500')
    expect(textarea.attributes('aria-invalid')).toBe('true')

    const errorMessage = wrapper.find('[role="alert"]')
    expect(errorMessage.exists()).toBe(true)
    expect(errorMessage.text()).toBe('Description is required')

    expect(wrapper.find('span[aria-hidden="true"]').text()).toBe('*')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Notes'
      }
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('New text content')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['New text content'])
  })

  it('emits blur on textarea blur', async () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Notes'
      }
    })

    const textarea = wrapper.find('textarea')
    await textarea.trigger('blur')

    expect(wrapper.emitted('blur')).toBeTruthy()
    expect(wrapper.emitted('blur')?.length).toBe(1)
  })

  it('verifies aria-describedby when error present', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Description',
        error: 'This field is required'
      }
    })

    const textarea = wrapper.find('textarea')
    const id = textarea.attributes('id')
    expect(textarea.attributes('aria-describedby')).toBe(`${id}-error`)

    const errorElement = wrapper.find(`#${id}-error`)
    expect(errorElement.exists()).toBe(true)
    expect(errorElement.text()).toBe('This field is required')
  })

  it('hides counter when showCounter is false', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: 'Hello',
        label: 'Bio',
        maxlength: 100,
        showCounter: false
      }
    })

    const counter = wrapper.find('.text-xs')
    expect(counter.exists()).toBe(false)
  })

  it('disables textarea when disabled is true', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Notes',
        disabled: true
      }
    })

    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('disabled')).toBeDefined()
    expect(textarea.classes()).toContain('disabled:opacity-50')
    expect(textarea.classes()).toContain('disabled:cursor-not-allowed')
  })
})
