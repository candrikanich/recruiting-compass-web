<template>
  <div class="min-h-screen bg-gray-50">
    <Header />

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-start">
        <div>
          <h1 class="text-4xl font-bold text-gray-900">Social Media Monitoring</h1>
          <p class="text-gray-600 mt-2">Track posts from coaches and programs across Twitter & Instagram</p>
        </div>
        <div class="flex gap-3">
          <NuxtLink
            to="/social/analytics"
            class="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
          >
            Analytics
          </NuxtLink>
          <button
            @click="syncPosts"
            :disabled="syncing"
            class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            <span v-if="syncing">Syncing...</span>
            <span v-else>Sync Posts</span>
          </button>
        </div>
      </div>

      <!-- Sync Status Message -->
      <div v-if="syncMessage" :class="['mb-4 p-4 rounded-lg', syncMessageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800']">
        {{ syncMessage }}
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-sm font-medium text-gray-600">Total Posts</p>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ allPosts.length }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-sm font-medium text-gray-600">Twitter/X Posts</p>
          <p class="text-3xl font-bold text-blue-600 mt-2">{{ twitterCount }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-sm font-medium text-gray-600">Instagram Posts</p>
          <p class="text-3xl font-bold text-pink-600 mt-2">{{ instagramCount }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-sm font-medium text-gray-600">Flagged for Review</p>
          <p class="text-3xl font-bold text-amber-600 mt-2">{{ flaggedCount }}</p>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <!-- Search Bar -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Search Posts</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search post content..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <!-- Platform Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <select
              v-model="selectedPlatform"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Platforms</option>
              <option value="twitter">Twitter/X</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          <!-- School Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">School</label>
            <select
              v-model="selectedSchool"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Schools</option>
              <option v-for="school in schools" :key="school.id" :value="school.id">
                {{ school.name }}
              </option>
            </select>
          </div>

          <!-- Filter by Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              v-model="filterType"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Posts</option>
              <option value="flagged">Flagged Only</option>
              <option value="recruiting">Recruiting Only</option>
            </select>
          </div>

          <!-- Sentiment Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Sentiment</label>
            <select
              v-model="selectedSentiment"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sentiment</option>
              <option value="very_positive">🔥 Very Positive</option>
              <option value="positive">👍 Positive</option>
              <option value="neutral">😐 Neutral</option>
              <option value="negative">👎 Negative</option>
            </select>
          </div>

          <!-- Clear Filters -->
          <div class="flex items-end">
            <button
              @click="clearFilters"
              class="w-full px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading social posts...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPosts.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
        <p class="text-gray-600 mb-2">No posts found</p>
        <p class="text-sm text-gray-500">
          Social posts will appear here once coaches and programs are tracked
        </p>
      </div>

      <!-- Posts List -->
      <div v-else class="space-y-4">
        <SocialPostCard
          v-for="post in filteredPosts"
          :key="post.id"
          :post="post"
          :school-name="getSchoolName(post.school_id)"
          :coach-name="getCoachName(post.coach_id)"
          @flag-toggle="togglePostFlag(post.id, $event)"
          @delete="deletePost(post.id)"
          @notes-save="savePostNotes(post.id, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSocialMedia } from '~/composables/useSocialMedia'
import { useSchools } from '~/composables/useSchools'
import { useCoaches } from '~/composables/useCoaches'

definePageMeta({
  middleware: 'auth',
})

const {
  posts: allPosts,
  loading,
  fetchPosts,
  toggleFlagged,
  deletePost: deleteSocialPost,
  updatePost,
  twitterPosts,
  instagramPosts,
  flaggedPosts,
} = useSocialMedia()

const { schools, fetchSchools } = useSchools()
const { coaches, fetchAllCoaches } = useCoaches()

const selectedPlatform = ref('')
const selectedSchool = ref('')
const filterType = ref('')
const selectedSentiment = ref('')
const searchQuery = ref('')

const schoolMap = ref<Record<string, string>>({})
const coachMap = ref<Record<string, string>>({})

const syncing = ref(false)
const syncMessage = ref('')
const syncMessageType = ref<'success' | 'error'>('success')

const twitterCount = computed(() => twitterPosts.value.length)
const instagramCount = computed(() => instagramPosts.value.length)
const flaggedCount = computed(() => flaggedPosts.value.length)

const filteredPosts = computed(() => {
  let filtered = allPosts.value

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((p) =>
      p.post_content.toLowerCase().includes(query) ||
      p.author_name.toLowerCase().includes(query) ||
      p.author_handle.toLowerCase().includes(query)
    )
  }

  if (selectedPlatform.value) {
    filtered = filtered.filter((p) => p.platform === selectedPlatform.value)
  }

  if (selectedSchool.value) {
    filtered = filtered.filter((p) => p.school_id === selectedSchool.value)
  }

  if (filterType.value === 'flagged') {
    filtered = filtered.filter((p) => p.flagged_for_review)
  } else if (filterType.value === 'recruiting') {
    filtered = filtered.filter((p) => p.is_recruiting_related)
  }

  if (selectedSentiment.value) {
    filtered = filtered.filter((p) => p.sentiment === selectedSentiment.value)
  }

  return filtered
})

const clearFilters = () => {
  selectedPlatform.value = ''
  selectedSchool.value = ''
  filterType.value = ''
  selectedSentiment.value = ''
  searchQuery.value = ''
}

const getSchoolName = (schoolId: string): string => {
  return schoolMap.value[schoolId] || 'Unknown School'
}

const getCoachName = (coachId?: string | null): string => {
  if (!coachId) return ''
  return coachMap.value[coachId] || ''
}

const togglePostFlag = async (postId: string, flagged: boolean) => {
  try {
    await toggleFlagged(postId, flagged)
  } catch (err) {
    console.error('Failed to toggle post flag:', err)
  }
}

const deletePost = async (postId: string) => {
  try {
    await deleteSocialPost(postId)
  } catch (err) {
    console.error('Failed to delete post:', err)
  }
}

const savePostNotes = async (postId: string, notes: string) => {
  try {
    await updatePost(postId, { notes })
  } catch (err) {
    console.error('Failed to save notes:', err)
  }
}

const syncPosts = async () => {
  try {
    syncing.value = true
    syncMessage.value = ''

    // Get the current session token
    const supabase = useSupabase()
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    if (!token) {
      throw new Error('Not authenticated. Please log in again.')
    }

    const response = await $fetch('/api/social/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    syncMessageType.value = 'success'
    syncMessage.value = response.message || 'Posts synced successfully'

    // Refresh posts
    await fetchPosts()

    // Clear message after 5 seconds
    setTimeout(() => {
      syncMessage.value = ''
    }, 5000)
  } catch (err) {
    syncMessageType.value = 'error'
    syncMessage.value = err instanceof Error ? err.message : 'Failed to sync posts'
    console.error('Sync error:', err)
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  try {
    // Fetch schools
    await fetchSchools()
    schools.value.forEach((school) => {
      schoolMap.value[school.id] = school.name
    })

    // Fetch coaches
    for (const school of schools.value) {
      await fetchAllCoaches({ schoolId: school.id })
    }
    coaches.value.forEach((coach) => {
      coachMap.value[coach.id] = `${coach.first_name} ${coach.last_name}`
    })

    // Fetch social posts
    await fetchPosts()
  } catch (err) {
    console.error('Error loading data:', err)
  }
})
</script>
