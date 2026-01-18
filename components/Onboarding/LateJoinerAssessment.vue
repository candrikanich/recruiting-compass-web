<template>
  <div class="w-full max-w-2xl mx-auto py-12 px-4">
    <!-- Header -->
    <div class="mb-12 text-center">
      <h1 class="text-3xl font-bold text-gray-900 mb-3">Let's Catch You Up</h1>
      <p class="text-lg text-gray-600">
        We'll ask about your recruiting progress so far, then create a personalized plan.
      </p>
    </div>

    <!-- Progress Bar -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">Question {{ currentStep + 1 }} of {{ questions.length }}</span>
        <span class="text-sm text-gray-600">{{ Math.round((currentStep / questions.length) * 100) }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-blue-600 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${(currentStep / questions.length) * 100}%` }"
        />
      </div>
    </div>

    <!-- Questions Container -->
    <form @submit.prevent="handleSubmit" class="space-y-8">
      <!-- Question 1: Highlight Video -->
      <transition name="fade" mode="out-in">
        <div v-if="currentStep === 0" key="q1" class="bg-blue-50 p-8 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">
            {{ questions[0].question }}
          </h2>
          <p class="text-gray-600 mb-6">{{ questions[0].description }}</p>
          <div class="space-y-3">
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasHighlightVideo"
                type="radio"
                :value="true"
                class="w-5 h-5 text-blue-600"
              />
              <span class="ml-3 text-gray-700">Yes, I have a highlight video</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasHighlightVideo"
                type="radio"
                :value="false"
                class="w-5 h-5 text-blue-600"
              />
              <span class="ml-3 text-gray-700">No, I haven't created one yet</span>
            </label>
          </div>
        </div>
      </transition>

      <!-- Question 2: Contacted Coaches -->
      <transition name="fade" mode="out-in">
        <div v-if="currentStep === 1" key="q2" class="bg-green-50 p-8 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">
            {{ questions[1].question }}
          </h2>
          <p class="text-gray-600 mb-6">{{ questions[1].description }}</p>
          <div class="space-y-3">
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasContactedCoaches"
                type="radio"
                :value="true"
                class="w-5 h-5 text-green-600"
              />
              <span class="ml-3 text-gray-700">Yes, I've reached out to coaches</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasContactedCoaches"
                type="radio"
                :value="false"
                class="w-5 h-5 text-green-600"
              />
              <span class="ml-3 text-gray-700">No, not yet</span>
            </label>
          </div>
        </div>
      </transition>

      <!-- Question 3: Target Schools -->
      <transition name="fade" mode="out-in">
        <div v-if="currentStep === 2" key="q3" class="bg-purple-50 p-8 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">
            {{ questions[2].question }}
          </h2>
          <p class="text-gray-600 mb-6">{{ questions[2].description }}</p>
          <div class="space-y-3">
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasTargetSchools"
                type="radio"
                :value="true"
                class="w-5 h-5 text-purple-600"
              />
              <span class="ml-3 text-gray-700">Yes, I have a target school list</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasTargetSchools"
                type="radio"
                :value="false"
                class="w-5 h-5 text-purple-600"
              />
              <span class="ml-3 text-gray-700">No, I'm still researching</span>
            </label>
          </div>
        </div>
      </transition>

      <!-- Question 4: Eligibility Registration -->
      <transition name="fade" mode="out-in">
        <div v-if="currentStep === 3" key="q4" class="bg-orange-50 p-8 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">
            {{ questions[3].question }}
          </h2>
          <p class="text-gray-600 mb-6">{{ questions[3].description }}</p>
          <div class="space-y-3">
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasRegisteredEligibility"
                type="radio"
                :value="true"
                class="w-5 h-5 text-orange-600"
              />
              <span class="ml-3 text-gray-700">Yes, I'm registered</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasRegisteredEligibility"
                type="radio"
                :value="false"
                class="w-5 h-5 text-orange-600"
              />
              <span class="ml-3 text-gray-700">Not yet</span>
            </label>
          </div>
        </div>
      </transition>

      <!-- Question 5: Test Scores -->
      <transition name="fade" mode="out-in">
        <div v-if="currentStep === 4" key="q5" class="bg-red-50 p-8 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">
            {{ questions[4].question }}
          </h2>
          <p class="text-gray-600 mb-6">{{ questions[4].description }}</p>
          <div class="space-y-3">
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasTakenTestScores"
                type="radio"
                :value="true"
                class="w-5 h-5 text-red-600"
              />
              <span class="ml-3 text-gray-700">Yes, I've taken SAT/ACT</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                v-model="assessment.hasTakenTestScores"
                type="radio"
                :value="false"
                class="w-5 h-5 text-red-600"
              />
              <span class="ml-3 text-gray-700">Not yet</span>
            </label>
          </div>
        </div>
      </transition>

      <!-- Navigation Buttons -->
      <div class="flex justify-between pt-8 border-t border-gray-200">
        <button
          v-if="currentStep > 0"
          type="button"
          @click="previousStep"
          class="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
        >
          Back
        </button>
        <div v-else />

        <button
          v-if="currentStep < questions.length - 1"
          type="button"
          @click="nextStep"
          :disabled="!isCurrentAnswered"
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
        >
          Next
        </button>

        <button
          v-else
          type="submit"
          :disabled="isSubmitting"
          class="px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition flex items-center gap-2"
        >
          <span v-if="!isSubmitting">Create My Plan</span>
          <span v-else class="flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating plan...
          </span>
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {{ error }}
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOnboarding, type OnboardingAssessment } from '~/composables/useOnboarding'
import { useRouter } from 'vue-router'

const router = useRouter()
const { completeOnboarding, loading: isSubmitting } = useOnboarding()

const currentStep = ref(0)
const error = ref<string | null>(null)

const assessment = ref<OnboardingAssessment>({
  hasHighlightVideo: false,
  hasContactedCoaches: false,
  hasTargetSchools: false,
  hasRegisteredEligibility: false,
  hasTakenTestScores: false,
})

const questions = [
  {
    question: 'Have you created a highlight video?',
    description: 'Coaches want to see your athletic ability. Do you have a film/highlight video ready to share?',
  },
  {
    question: 'Have you contacted any coaches?',
    description: 'Have you reached out to coaches at colleges you\'re interested in?',
  },
  {
    question: 'Do you have a target school list?',
    description: 'Have you identified and researched schools you\'d like to attend?',
  },
  {
    question: 'Have you registered with the eligibility center?',
    description: 'NCAA requires registration. NAIA and JUCO have similar requirements.',
  },
  {
    question: 'Have you taken your SAT/ACT?',
    description: 'Official test scores are important for college applications.',
  },
]

const isCurrentAnswered = computed(() => {
  if (currentStep.value === 0) return assessment.value.hasHighlightVideo !== false
  if (currentStep.value === 1) return assessment.value.hasContactedCoaches !== false
  if (currentStep.value === 2) return assessment.value.hasTargetSchools !== false
  if (currentStep.value === 3) return assessment.value.hasRegisteredEligibility !== false
  if (currentStep.value === 4) return assessment.value.hasTakenTestScores !== false
  return false
})

const nextStep = () => {
  if (currentStep.value < questions.length - 1) {
    currentStep.value++
    error.value = null
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
    error.value = null
  }
}

const handleSubmit = async () => {
  error.value = null

  try {
    const result = await completeOnboarding(assessment.value)
    console.log('Onboarding completed:', result)
    // Redirect to dashboard
    await router.push('/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to complete onboarding'
    console.error('Onboarding submission error:', err)
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
