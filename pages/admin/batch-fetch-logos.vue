<template>
  <div class="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Batch Fetch School Logos</h1>
        <p class="text-gray-600 mt-2">Fetch favicons for all schools in the database</p>
      </div>

      <!-- Status Card -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <!-- Idle State -->
        <div v-if="status === 'idle'" class="space-y-4">
          <p class="text-gray-600">
            This utility will fetch and store favicon URLs for all schools in your database that don't have one yet.
          </p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-800">
              <strong>Note:</strong> This process may take a minute or two depending on the number of schools. The page
              can be left open while it processes.
            </p>
          </div>
          <button
            @click="startBatchFetch"
            class="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Start Batch Fetch
          </button>
        </div>

        <!-- Loading State -->
        <div v-else-if="status === 'loading'" class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="spinner"></div>
            <span class="text-lg font-medium text-gray-900">Fetching logos...</span>
          </div>
          <p class="text-gray-600">{{ statusMessage }}</p>
          <div class="bg-gray-100 rounded h-2 overflow-hidden">
            <div
              class="bg-blue-600 h-full transition-all duration-300"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </div>

        <!-- Success State -->
        <div v-else-if="status === 'success'" class="space-y-4">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <CheckIcon class="w-5 h-5 text-green-800" />
            <p class="text-sm text-green-800 font-medium">Batch fetch completed successfully!</p>
          </div>
          <div v-if="result" class="space-y-2 text-sm">
            <p><strong>Total schools:</strong> {{ result.processed }}</p>
            <p><strong>Logos fetched:</strong> {{ result.fetched }}</p>
            <p v-if="result.message" class="text-gray-600">{{ result.message }}</p>
          </div>
          <button
            @click="resetForm"
            class="w-full px-6 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Run Again
          </button>
        </div>

        <!-- Error State -->
        <div v-else-if="status === 'error'" class="space-y-4">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <XMarkIcon class="w-5 h-5 text-red-800 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-sm text-red-800 font-medium">Error during batch fetch</p>
              <p v-if="error" class="text-sm text-red-700 mt-2">{{ error }}</p>
            </div>
          </div>
          <button
            @click="resetForm"
            class="w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Info Section -->
      <div class="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">How it works</h2>
        <ol class="space-y-2 text-sm text-gray-600">
          <li class="flex gap-3">
            <span class="font-medium text-gray-900 flex-shrink-0">1.</span>
            <span>Fetches all schools from your database</span>
          </li>
          <li class="flex gap-3">
            <span class="font-medium text-gray-900 flex-shrink-0">2.</span>
            <span>For each school without a favicon URL, attempts to fetch from their website</span>
          </li>
          <li class="flex gap-3">
            <span class="font-medium text-gray-900 flex-shrink-0">3.</span>
            <span>Tries multiple sources (favicon.ico, DuckDuckGo, Google)</span>
          </li>
          <li class="flex gap-3">
            <span class="font-medium text-gray-900 flex-shrink-0">4.</span>
            <span>Saves found favicons to the database</span>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import { useUserStore } from '~/stores/user'
import { useSupabase } from '~/composables/useSupabase'

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const statusMessage = ref('')
const progress = ref(0)
const error = ref<string | null>(null)
const result = ref<any>(null)

const startBatchFetch = async () => {
  status.value = 'loading'
  statusMessage.value = 'Initializing...'
  progress.value = 0
  error.value = null

  try {
    // Get authenticated user from store and get their session token
    const userStore = useUserStore()
    const supabase = useSupabase()

    if (!userStore.user) {
      throw new Error('User not authenticated')
    }

    // Get session token for server-side auth
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const response = await $fetch('/api/admin/batch-fetch-logos', {
      method: 'POST',
      body: { userId: userStore.user.id, token },
    })

    // Simulate progress
    for (let i = progress.value; i < 90; i += 10) {
      progress.value = i
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    statusMessage.value = 'Processing results...'
    progress.value = 95

    result.value = response
    progress.value = 100
    status.value = 'success'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
    status.value = 'error'
  }
}

const resetForm = () => {
  status.value = 'idle'
  statusMessage.value = ''
  progress.value = 0
  error.value = null
  result.value = null
}
</script>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
