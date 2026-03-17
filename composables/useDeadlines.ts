import { ref } from 'vue'

export function useDeadlines() {
  const deadlines = ref<Array<{
    id: string
    label: string
    deadline_date: string
    category: string
    school_id?: string
  }>>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDeadlines() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<typeof deadlines.value>('/api/deadlines')
      deadlines.value = data
    } catch {
      error.value = 'Failed to load deadlines'
    } finally {
      loading.value = false
    }
  }

  async function createDeadline(payload: {
    label: string
    deadline_date: string
    category: string
    school_id?: string
  }) {
    const created = await $fetch('/api/deadlines', { method: 'POST', body: payload })
    await fetchDeadlines()
    return created
  }

  async function removeDeadline(id: string) {
    await $fetch(`/api/deadlines/${id}`, { method: 'DELETE' })
    deadlines.value = deadlines.value.filter(d => d.id !== id)
  }

  return { deadlines, loading, error, fetchDeadlines, createDeadline, removeDeadline }
}
