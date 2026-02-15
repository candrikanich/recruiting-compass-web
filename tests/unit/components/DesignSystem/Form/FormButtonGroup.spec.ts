import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FormButtonGroup from '~/components/DesignSystem/Form/FormButtonGroup.vue'

describe('FormButtonGroup', () => {
  it('renders with default labels', () => {
    const wrapper = mount(FormButtonGroup)
    expect(wrapper.text()).toContain('Submit')
    expect(wrapper.text()).toContain('Cancel')
  })

  it('renders with custom labels', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Add School',
        cancelLabel: 'Go Back',
      },
    })
    expect(wrapper.text()).toContain('Add School')
    expect(wrapper.text()).toContain('Go Back')
  })

  it('emits submit event when submit button clicked', async () => {
    const wrapper = mount(FormButtonGroup)
    const submitBtn = wrapper.findAll('button')[1]
    await submitBtn.trigger('click')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('emits cancel event when cancel button clicked', async () => {
    const wrapper = mount(FormButtonGroup)
    const cancelBtn = wrapper.findAll('button')[0]
    await cancelBtn.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('disables submit button when submitDisabled is true', () => {
    const wrapper = mount(FormButtonGroup, {
      props: { submitDisabled: true },
    })
    const submitBtn = wrapper.findAll('button')[1]
    expect(submitBtn.element.disabled).toBe(true)
  })

  it('disables both buttons when loading is true', () => {
    const wrapper = mount(FormButtonGroup, {
      props: { loading: true },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].element.disabled).toBe(true)
    expect(buttons[1].element.disabled).toBe(true)
  })

  it('shows loading state text for "Add School" → "Adding..."', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Add School',
        loading: true,
      },
    })
    expect(wrapper.text()).toContain('Adding School...')
  })

  it('shows loading state text for "Save" → "Saving..."', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Save',
        loading: true,
      },
    })
    expect(wrapper.text()).toContain('Saving...')
  })

  it('shows loading state text for "Update" → "Updating..."', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Update',
        loading: true,
      },
    })
    expect(wrapper.text()).toContain('Updating...')
  })

  it('shows generic "Loading..." for non-action verbs', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Continue',
        loading: true,
      },
    })
    expect(wrapper.text()).toContain('Loading...')
  })

  it('has proper button styling classes', () => {
    const wrapper = mount(FormButtonGroup)
    const cancelBtn = wrapper.findAll('button')[0]
    const submitBtn = wrapper.findAll('button')[1]

    expect(cancelBtn.classes()).toContain('bg-white')
    expect(cancelBtn.classes()).toContain('border-slate-300')
    expect(submitBtn.classes()).toContain('bg-gradient-to-r')
    expect(submitBtn.classes()).toContain('from-blue-500')
    expect(submitBtn.classes()).toContain('to-blue-600')
  })
})
