<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Deadlines</h1>
        <p class="text-gray-500 text-sm mt-1">Track application, offer, and recruiting deadlines</p>
      </div>
      <button
        @click="showAdd = true"
        class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
      >
        + Add Deadline
      </button>
    </div>

    <div v-if="loading" class="text-gray-400 py-12 text-center">Loading...</div>
    <div v-else-if="error" class="text-red-600 py-8 text-center">{{ error }}</div>
    <div v-else-if="sortedDeadlines.length === 0" class="text-gray-400 text-center py-16">
      <p class="text-lg">No deadlines yet.</p>
      <p class="text-sm mt-2">Add application deadlines, offer decisions, and other key dates.</p>
    </div>
    <ul v-else class="space-y-3">
      <li
        v-for="d in sortedDeadlines"
        :key="d.id"
        class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
      >
        <div>
          <p class="font-medium text-gray-900">{{ d.label }}</p>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ d.deadline_date }} · <span class="capitalize">{{ d.category.replaceAll('_', ' ') }}</span>
          </p>
        </div>
        <button
          @click="removeDeadline(d.id)"
          class="text-red-500 hover:text-red-700 text-sm font-medium"
          :aria-label="`Remove ${d.label}`"
        >
          Remove
        </button>
      </li>
    </ul>

    <!-- Add deadline modal -->
    <div
      v-if="showAdd"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showAdd = false"
    >
      <form
        @submit.prevent="submitAdd"
        class="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 mx-4"
      >
        <h2 class="text-lg font-bold">Add Deadline</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            v-model="newDeadline.label"
            type="text"
            required
            maxlength="200"
            placeholder="e.g. Application Deadline — Stanford"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            v-model="newDeadline.deadline_date"
            type="date"
            required
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select v-model="newDeadline.category" class="w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="application">Application</option>
            <option value="decision">Decision</option>
            <option value="financial_aid">Financial Aid</option>
            <option value="visit">Visit</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div class="flex gap-3 justify-end pt-2">
          <button
            type="button"
            @click="showAdd = false"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="addingDeadline"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ addingDeadline ? 'Adding…' : 'Add Deadline' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const { deadlines, loading, error, fetchDeadlines, createDeadline, removeDeadline } = useDeadlines()
const showAdd = ref(false)
const addingDeadline = ref(false)
const newDeadline = reactive({ label: '', deadline_date: '', category: 'application' })

onMounted(fetchDeadlines)

const sortedDeadlines = computed(() =>
  [...deadlines.value].sort((a, b) => a.deadline_date.localeCompare(b.deadline_date))
)

async function submitAdd() {
  if (!newDeadline.label || !newDeadline.deadline_date) return
  addingDeadline.value = true
  try {
    await createDeadline({ ...newDeadline })
    showAdd.value = false
    Object.assign(newDeadline, { label: '', deadline_date: '', category: 'application' })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create deadline'
  } finally {
    addingDeadline.value = false
  }
}
</script>
