<template>
  <FormPageLayout
    back-to="/events"
    back-text="Back to Events"
    title="Add New Event"
    description="Track camps, showcases, visits, and other recruiting events"
    header-color="blue"
  >
    <EventForm
      :loading="loading"
      :schools="schools"
      @submit="handleFormSubmit"
      @cancel="handleCancel"
    />
  </FormPageLayout>
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
