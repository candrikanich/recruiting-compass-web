import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormFileInput from '~/components/DesignSystem/Form/FormFileInput.vue'

describe('FormFileInput', () => {
  it('renders with label', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'Upload Document',
      },
    })
    expect(wrapper.text()).toContain('Upload Document')
  })

  it('shows required asterisk when required is true', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
        required: true,
      },
    })
    const asterisk = wrapper.find('span[aria-hidden="true"]')
    expect(asterisk.exists()).toBe(true)
    expect(asterisk.text()).toBe('*')
    expect(asterisk.classes()).toContain('text-red-500')
  })

  it('sets required attribute on input when required is true', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
        required: true,
      },
    })
    const input = wrapper.find('input[type="file"]')
    expect(input.element.required).toBe(true)
  })

  it('sets accept attribute when provided', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
        accept: '.pdf,.doc,.docx',
      },
    })
    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('accept')).toBe('.pdf,.doc,.docx')
  })

  it('sets multiple attribute when multiple is true', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'Files',
        multiple: true,
      },
    })
    const input = wrapper.find('input[type="file"]')
    expect(input.element.multiple).toBe(true)
  })

  it('disables input when disabled is true', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
        disabled: true,
      },
    })
    const input = wrapper.find('input[type="file"]')
    expect(input.element.disabled).toBe(true)
  })

  it('displays helper text when provided', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
        helperText: 'Accepted formats: PDF, DOC, DOCX',
      },
    })
    expect(wrapper.text()).toContain('Accepted formats: PDF, DOC, DOCX')
    const helperText = wrapper.find('p.text-xs')
    expect(helperText.exists()).toBe(true)
    expect(helperText.classes()).toContain('text-slate-500')
  })

  it('emits change event with files when file selected', async () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
      },
    })
    const input = wrapper.find('input[type="file"]')

    // Create a mock file
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
    } as FileList

    // Manually set the files property and trigger change
    Object.defineProperty(input.element, 'files', {
      value: fileList,
      writable: false,
    })
    await input.trigger('change')

    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')?.[0][0]).toBe(fileList)
  })

  it('has proper styling classes', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
      },
    })
    const input = wrapper.find('input[type="file"]')
    expect(input.classes()).toContain('w-full')
    expect(input.classes()).toContain('px-3')
    expect(input.classes()).toContain('py-2')
    expect(input.classes()).toContain('border-2')
    expect(input.classes()).toContain('border-slate-300')
    expect(input.classes()).toContain('rounded-lg')
  })

  it('associates label with input using unique id', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
      },
    })
    const input = wrapper.find('input[type="file"]')
    const label = wrapper.find('label')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('id')).toBeTruthy()
  })

  it('does not show helper text when not provided', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'File',
      },
    })
    const helperText = wrapper.find('p.text-xs')
    expect(helperText.exists()).toBe(false)
  })
})
