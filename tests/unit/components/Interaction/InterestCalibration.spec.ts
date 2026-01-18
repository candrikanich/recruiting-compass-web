import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InterestCalibration from '~/components/Interaction/InterestCalibration.vue'

describe('InterestCalibration', () => {
  it('renders all 6 questions', () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(6)
  })

  it('displays initial "not_set" state', () => {
    const wrapper = mount(InterestCalibration)
    const result = wrapper.find('p')
    expect(wrapper.vm.interestLevel).toBe('not_set')
  })

  it('calculates "low" interest for 0-1 yes answers', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    // Answer first question as yes
    await checkboxes[0].setValue(true)
    expect(wrapper.vm.interestLevel).toBe('low')

    // Keep at 1 yes
    expect(wrapper.vm.yesCount).toBe(1)
  })

  it('calculates "medium" interest for 2-3 yes answers', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    // Answer 2 questions as yes
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    expect(wrapper.vm.interestLevel).toBe('medium')
    expect(wrapper.vm.yesCount).toBe(2)

    // Answer 3 questions as yes
    await checkboxes[2].setValue(true)
    expect(wrapper.vm.interestLevel).toBe('medium')
    expect(wrapper.vm.yesCount).toBe(3)
  })

  it('calculates "high" interest for 4+ yes answers', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    // Answer 4 questions as yes
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    await checkboxes[2].setValue(true)
    await checkboxes[3].setValue(true)
    expect(wrapper.vm.interestLevel).toBe('high')
    expect(wrapper.vm.yesCount).toBe(4)

    // Answer 5 questions as yes
    await checkboxes[4].setValue(true)
    expect(wrapper.vm.interestLevel).toBe('high')
    expect(wrapper.vm.yesCount).toBe(5)

    // Answer all 6 questions as yes
    await checkboxes[5].setValue(true)
    expect(wrapper.vm.interestLevel).toBe('high')
    expect(wrapper.vm.yesCount).toBe(6)
  })

  it('handles toggling answers on and off', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    // Answer 2 questions
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    expect(wrapper.vm.yesCount).toBe(2)
    expect(wrapper.vm.interestLevel).toBe('medium')

    // Toggle off one answer
    await checkboxes[0].setValue(false)
    expect(wrapper.vm.yesCount).toBe(1)
    expect(wrapper.vm.interestLevel).toBe('low')

    // Toggle back on
    await checkboxes[0].setValue(true)
    expect(wrapper.vm.yesCount).toBe(2)
    expect(wrapper.vm.interestLevel).toBe('medium')
  })

  it('displays correct result description for low interest', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    await checkboxes[0].setValue(true)
    const description = wrapper.vm.getResultDescription()
    expect(description).toContain('Limited signals detected')
  })

  it('displays correct result description for medium interest', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    const description = wrapper.vm.getResultDescription()
    expect(description).toContain('Coach seems interested')
  })

  it('displays correct result description for high interest', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    await checkboxes[2].setValue(true)
    await checkboxes[3].setValue(true)
    const description = wrapper.vm.getResultDescription()
    expect(description).toContain('Coach showing strong signals')
  })

  it('displays correct result description when not set', () => {
    const wrapper = mount(InterestCalibration)
    const description = wrapper.vm.getResultDescription()
    expect(description).toContain('Answer questions to see coach interest level')
  })

  it('exposes interest level, yesCount, and answers to parent', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)

    expect(wrapper.vm.interestLevel).toBe('medium')
    expect(wrapper.vm.yesCount).toBe(2)
    expect(wrapper.vm.answers).toEqual([true, true, false, false, false, false])
  })

  it('applies correct styling based on interest level', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    // Check not_set styling - find the div that contains the result text
    let resultDiv = wrapper.find('div[class*="rounded-xl p-4"]')
    if (!resultDiv.exists()) {
      // Try alternative selector
      const divs = wrapper.findAll('div')
      resultDiv = divs.find((d) => d.classes().includes('rounded-xl') && d.classes().includes('p-4')) || divs[0]
    }

    expect(resultDiv.classes()).toContain('bg-slate-50')
    expect(resultDiv.classes()).toContain('border-slate-200')

    // Set to high interest
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    await checkboxes[2].setValue(true)
    await checkboxes[3].setValue(true)

    // Re-find the result div
    resultDiv = wrapper.find('div[class*="rounded-xl p-4"]')
    if (!resultDiv.exists()) {
      const divs = wrapper.findAll('div')
      resultDiv = divs.find((d) => d.classes().includes('rounded-xl') && d.classes().includes('p-4')) || divs[0]
    }

    expect(resultDiv.classes()).toContain('bg-green-50')
    expect(resultDiv.classes()).toContain('border-green-200')
  })

  it('displays emoji icons corresponding to interest level', async () => {
    const wrapper = mount(InterestCalibration)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    // not_set: —
    let iconSpan = wrapper.find('span.text-lg')
    expect(iconSpan.text()).toContain('—')

    // low: ❄️
    await checkboxes[0].setValue(true)
    iconSpan = wrapper.find('span.text-lg')
    expect(iconSpan.text()).toContain('❄️')

    // medium: ⚡
    await checkboxes[1].setValue(true)
    iconSpan = wrapper.find('span.text-lg')
    expect(iconSpan.text()).toContain('⚡')

    // high: 🔥
    await checkboxes[2].setValue(true)
    await checkboxes[3].setValue(true)
    iconSpan = wrapper.find('span.text-lg')
    expect(iconSpan.text()).toContain('🔥')
  })
})
