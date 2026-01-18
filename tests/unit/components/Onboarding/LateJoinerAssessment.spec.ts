import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import LateJoinerAssessment from '~/components/Onboarding/LateJoinerAssessment.vue'

// Mock useRouter
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock useOnboarding
vi.mock('~/composables/useOnboarding', () => ({
  useOnboarding: () => ({
    completeOnboarding: vi.fn().mockResolvedValue({
      assessment: {
        hasHighlightVideo: true,
        hasContactedCoaches: true,
        hasTargetSchools: true,
        hasRegisteredEligibility: true,
        hasTakenTestScores: true,
      },
      completedTaskIds: ['task-1', 'task-2'],
      phase: 'junior',
    }),
    loading: ref(false),
    error: ref(null),
  }),
}))

describe('LateJoinerAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders component with initial state', () => {
    const wrapper = mount(LateJoinerAssessment)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain("Let's Catch You Up")
  })

  it('displays first question on initial render', () => {
    const wrapper = mount(LateJoinerAssessment)
    expect(wrapper.text()).toContain('Have you created a highlight video?')
  })

  it('shows progress bar with correct percentage', () => {
    const wrapper = mount(LateJoinerAssessment)
    const progressBar = wrapper.find('[style*="width"]')
    expect(progressBar.exists()).toBe(true)
    expect(wrapper.text()).toContain('Question 1 of 5')
  })

  it('progresses to next question on Next button click', async () => {
    const wrapper = mount(LateJoinerAssessment)

    // Select an answer to enable Next button
    const radioButtons = wrapper.findAll('input[type="radio"]')
    await radioButtons[0].setValue(true)

    // Click Next
    const nextButton = wrapper.find('button:contains("Next")')
    if (nextButton.exists()) {
      await nextButton.trigger('click')
    } else {
      // Try alternative selector
      const buttons = wrapper.findAll('button')
      const next = buttons.find(b => b.text() === 'Next')
      if (next) {
        await next.trigger('click')
      }
    }

    // Should show question 2
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Question 2 of 5')
  })

  it('disables Next button when no answer selected', () => {
    const wrapper = mount(LateJoinerAssessment)
    const buttons = wrapper.findAll('button')
    const nextButton = buttons.find(b => b.text() === 'Next')
    expect(nextButton?.attributes('disabled')).toBeDefined()
  })

  it('enables Next button after selecting answer', async () => {
    const wrapper = mount(LateJoinerAssessment)
    const radioButtons = wrapper.findAll('input[type="radio"]')
    await radioButtons[0].setValue(true)
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    const nextButton = buttons.find(b => b.text() === 'Next')
    expect(nextButton?.attributes('disabled')).toBeUndefined()
  })

  it('goes back to previous question on Back button', async () => {
    const wrapper = mount(LateJoinerAssessment)

    // Progress to question 2
    const radioButtons = wrapper.findAll('input[type="radio"]')
    await radioButtons[0].setValue(true)
    const buttons = wrapper.findAll('button')
    const nextBtn = buttons.find(b => b.text() === 'Next')
    if (nextBtn) await nextBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // Should be on question 2
    expect(wrapper.text()).toContain('Question 2 of 5')

    // Click Back
    const backBtn = wrapper.findAll('button').find(b => b.text() === 'Back')
    if (backBtn) await backBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // Should be back on question 1
    expect(wrapper.text()).toContain('Question 1 of 5')
  })

  it('shows Create My Plan button on last question', async () => {
    const wrapper = mount(LateJoinerAssessment)

    // Navigate to last question (question 5)
    for (let i = 0; i < 4; i++) {
      const radioButtons = wrapper.findAll('input[type="radio"]')
      await radioButtons[0].setValue(true)
      const buttons = wrapper.findAll('button')
      const nextBtn = buttons.find(b => b.text() === 'Next')
      if (nextBtn) await nextBtn.trigger('click')
      await wrapper.vm.$nextTick()
    }

    // Answer last question
    const radioButtons = wrapper.findAll('input[type="radio"]')
    await radioButtons[0].setValue(true)
    await wrapper.vm.$nextTick()

    // Should show Create My Plan button
    const buttons = wrapper.findAll('button')
    const submitBtn = buttons.find(b => b.text().includes('Create My Plan'))
    expect(submitBtn).toBeDefined()
  })

  it('renders all 5 questions with proper content', () => {
    const wrapper = mount(LateJoinerAssessment)
    const expectedQuestions = [
      'Have you created a highlight video?',
      'Have you contacted any coaches?',
      'Do you have a target school list?',
      'Have you registered with the eligibility center?',
      'Have you taken your SAT/ACT?',
    ]

    expectedQuestions.forEach(question => {
      expect(wrapper.vm.questions.map((q: any) => q.question)).toContain(question)
    })
  })

  it('persists answers when navigating between questions', async () => {
    const wrapper = mount(LateJoinerAssessment)

    // Answer question 1
    const radioButtons1 = wrapper.findAll('input[type="radio"]')
    await radioButtons1[0].setValue(true) // Yes to highlight video
    expect(wrapper.vm.assessment.hasHighlightVideo).toBe(true)

    // Go to question 2
    const buttons = wrapper.findAll('button')
    const nextBtn = buttons.find(b => b.text() === 'Next')
    if (nextBtn) await nextBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // Answer question 2
    const radioButtons2 = wrapper.findAll('input[type="radio"]')
    await radioButtons2[1].setValue(true) // No to coaches
    expect(wrapper.vm.assessment.hasContactedCoaches).toBe(false)

    // Go back to question 1
    const backBtn = wrapper.findAll('button').find(b => b.text() === 'Back')
    if (backBtn) await backBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // Question 1 answer should still be true
    expect(wrapper.vm.assessment.hasHighlightVideo).toBe(true)
  })

  it('shows error message on submission failure', async () => {
    // Re-mock with error
    vi.mocked(useOnboarding).mockReturnValue({
      completeOnboarding: vi.fn().mockRejectedValue(new Error('Test error')),
      loading: ref(false),
    })

    const wrapper = mount(LateJoinerAssessment)

    // Navigate to last question and submit
    for (let i = 0; i < 4; i++) {
      const radioButtons = wrapper.findAll('input[type="radio"]')
      await radioButtons[0].setValue(true)
      const buttons = wrapper.findAll('button')
      const nextBtn = buttons.find(b => b.text() === 'Next')
      if (nextBtn) await nextBtn.trigger('click')
      await wrapper.vm.$nextTick()
    }

    // Answer and submit
    const radioButtons = wrapper.findAll('input[type="radio"]')
    await radioButtons[0].setValue(true)
    await wrapper.vm.$nextTick()

    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('Create My Plan'))
    if (submitBtn) await submitBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // Error should be displayed
    expect(wrapper.text()).toContain('Test error')
  })

  it('displays fade transition when changing questions', () => {
    const wrapper = mount(LateJoinerAssessment)
    const transition = wrapper.findComponent({ name: 'transition' })
    expect(transition.exists()).toBe(true)
    expect(transition.attributes('name')).toBe('fade')
  })

  it('clears error when navigating questions', async () => {
    const wrapper = mount(LateJoinerAssessment)
    wrapper.vm.error = 'Test error'
    await wrapper.vm.$nextTick()

    // Select answer and go to next
    const radioButtons = wrapper.findAll('input[type="radio"]')
    await radioButtons[0].setValue(true)
    wrapper.vm.nextStep()
    await wrapper.vm.$nextTick()

    // Error should be cleared
    expect(wrapper.vm.error).toBeNull()
  })
})
