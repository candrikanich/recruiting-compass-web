<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <div class="absolute inset-0">
      <!-- Grass texture with gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700"></div>

      <!-- Multi-Sport Field markings -->
      <svg
        class="absolute inset-0 w-full h-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <!-- Baseball: Infield dirt circle -->
        <circle cx="600" cy="800" r="350" fill="none" stroke="white" stroke-width="3" opacity="0.4" />

        <!-- Baseball: Foul lines -->
        <line x1="600" y1="800" x2="100" y2="100" stroke="white" stroke-width="2" opacity="0.5" />
        <line x1="600" y1="800" x2="1100" y2="100" stroke="white" stroke-width="2" opacity="0.5" />

        <!-- Baseball: Basepaths -->
        <line x1="600" y1="800" x2="750" y2="650" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="750" y1="650" x2="600" y2="500" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="600" y1="500" x2="450" y2="650" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="450" y1="650" x2="600" y2="800" stroke="white" stroke-width="2" opacity="0.3" />

        <!-- Baseball: Bases -->
        <rect x="595" y="795" width="10" height="10" fill="white" opacity="0.6" />
        <rect x="745" y="645" width="10" height="10" fill="white" opacity="0.6" />
        <rect x="595" y="495" width="10" height="10" fill="white" opacity="0.6" />
        <rect x="445" y="645" width="10" height="10" fill="white" opacity="0.6" />

        <!-- Football: Hash marks and yard lines -->
        <line x1="50" y1="150" x2="50" y2="650" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="50" y1="200" x2="100" y2="200" stroke="white" stroke-width="1" opacity="0.3" />
        <line x1="50" y1="300" x2="100" y2="300" stroke="white" stroke-width="1" opacity="0.3" />
        <line x1="50" y1="400" x2="120" y2="400" stroke="white" stroke-width="2" opacity="0.4" />

        <!-- Basketball: Court outline -->
        <rect x="100" y="50" width="300" height="200" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
        <path d="M 120 70 Q 180 100 120 180" fill="none" stroke="white" stroke-width="1" opacity="0.3" />

        <!-- Soccer: Center circle -->
        <circle cx="600" cy="200" r="60" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="300" y1="200" x2="900" y2="200" stroke="white" stroke-width="2" opacity="0.3" />
      </svg>

      <!-- Subtle pattern overlay -->
      <div
        class="absolute inset-0 opacity-5"
        :style="{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            rgba(255, 255, 255, 0.3) 20px,
            rgba(255, 255, 255, 0.3) 22px
          )`
        }"
      ></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
      <div class="w-full max-w-md">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2"
          >
            <ArrowLeftIcon class="w-4 h-4" />
            Back to Welcome
          </NuxtLink>
        </div>

        <!-- Login Card -->
        <div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <!-- Header -->
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <svg class="w-11 h-11 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                <polygon fill="currentColor" points="12,5 13,9 12,8 11,9" />
                <polygon fill="currentColor" points="12,19 11,15 12,16 13,15" />
                <polygon fill="currentColor" points="5,12 9,11 8,12 9,13" />
                <polygon fill="currentColor" points="19,12 15,13 16,12 15,11" />
              </svg>
            </div>
            <h1 class="text-slate-900 text-3xl font-bold mb-2">Recruiting Compass</h1>
            <p class="text-slate-600">Navigate your college recruiting journey</p>
          </div>

          <!-- Form error summary -->
          <FormErrorSummary v-if="hasErrors" :errors="errors" @dismiss="clearErrors" class="mb-6" />

          <!-- Form -->
          <form @submit.prevent="handleLogin" class="space-y-6">
            <!-- Email -->
            <div>
              <label for="email" class="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <div class="relative">
                <EnvelopeIcon class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                  :disabled="loading"
                  @blur="validateEmail"
                />
              </div>
              <FieldError :error="fieldErrors.email" />
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div class="relative">
                <LockClosedIcon class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  required
                  class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  :disabled="loading"
                  @blur="validatePassword"
                />
              </div>
              <FieldError :error="fieldErrors.password" />
            </div>

            <!-- Remember me / Forgot password -->
            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember me
              </label>
              <a href="#" class="text-blue-600 hover:text-blue-700">
                Forgot password?
              </a>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="loading || hasErrors"
              class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg"
            >
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-white px-4 text-slate-500">New to Recruiting Compass?</span>
            </div>
          </div>

          <!-- Create Account Link -->
          <div class="text-center">
            <p class="text-slate-600 text-sm">
              Don't have an account?
              <NuxtLink to="/signup" class="text-blue-600 hover:text-blue-700 font-medium">
                Create one now
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useUserStore } from '~/stores/user'
import { useValidation } from '~/composables/useValidation'
import { loginSchema } from '~/utils/validation/schemas'
import { z } from 'zod'
import { ArrowLeftIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import FormErrorSummary from '~/components/Validation/FormErrorSummary.vue'
import FieldError from '~/components/Validation/FieldError.vue'

const email = ref('')
const password = ref('')
const loading = ref(false)

const { signIn } = useAuth()
const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors, setErrors } = useValidation(loginSchema)

// Field-level validators
const emailSchema = z.object({ email: loginSchema.shape.email })
const passwordSchema = z.object({ password: loginSchema.shape.password })

const validateEmail = async () => {
  const emailValidator = validateField('email', emailSchema.shape.email)
  await emailValidator(email.value)
}

const validatePassword = async () => {
  const passwordValidator = validateField('password', passwordSchema.shape.password)
  await passwordValidator(password.value)
}

const handleLogin = async () => {
  // Validate entire form before submission
  const validated = await validate({ email: email.value, password: password.value })

  if (!validated) {
    return
  }

  loading.value = true

  try {
    await signIn(validated.email, validated.password)
    const userStore = useUserStore()
    await userStore.initializeUser()
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed'
    // Set auth error at form level
    setErrors([{ field: 'form', message }])
    loading.value = false
  }
}
</script>
