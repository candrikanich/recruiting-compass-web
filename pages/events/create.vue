<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          to="/events"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Events
        </NuxtLink>
      </div>

      <!-- Page Card -->
      <div class="bg-white rounded-lg shadow p-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Add New Event</h1>

        <!-- EventForm Component -->
        <EventForm
          :loading="loading"
          :schools="schools"
          @submit="handleFormSubmit"
          @cancel="handleCancel"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useEvents } from '~/composables/useEvents'
import { useSchools } from '~/composables/useSchools'
import { useRouter } from 'vue-router'

definePageMeta({
  middleware: 'auth'
})

const { createEvent, loading } = useEvents()
const { schools, fetchSchools } = useSchools()
const router = useRouter()

const handleFormSubmit = async (data: any) => {
  try {
    const newEvent = await createEvent(data)
    await router.push(`/events/${newEvent.id}`)
  } catch (err) {
    console.error('Failed to create event:', err)
  }
}

const handleCancel = () => {
  router.push('/events')
}

onMounted(async () => {
  await fetchSchools()
})
</script>
