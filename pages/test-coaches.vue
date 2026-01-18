<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">Test Coaches</h1>

      <button
        @click="toggleForm"
        class="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Toggle Form
      </button>

      <div v-show="showForm" class="bg-white p-6 rounded shadow mb-8">
        <h2 class="text-xl font-bold mb-4">Add Coach</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Role</label>
            <select
              v-model="form.role"
              @change="onFormChange"
              class="w-full px-3 py-2 border rounded"
            >
              <option value="">Select Role</option>
              <option value="head">Head Coach</option>
              <option value="assistant">Assistant Coach</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">First Name</label>
            <input
              v-model="form.firstName"
              @input="onFormChange"
              type="text"
              class="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Last Name</label>
            <input
              v-model="form.lastName"
              @input="onFormChange"
              type="text"
              class="w-full px-3 py-2 border rounded"
            />
          </div>
          <button
            @click="addCoach"
            class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add Coach
          </button>
        </div>
      </div>

      <div v-if="coaches.length > 0" class="space-y-4">
        <h2 class="text-xl font-bold">Coaches ({{ coaches.length }})</h2>
        <div v-for="coach in coaches" :key="coach.id" class="bg-white p-4 rounded shadow">
          <h3 class="font-bold">{{ coach.firstName }} {{ coach.lastName }}</h3>
          <p class="text-sm text-gray-600">{{ coach.role }}</p>
          <button
            @click="deleteCoach(coach.id)"
            class="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
      <div v-else class="text-gray-600">No coaches yet</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showForm = ref(false)
const coaches = ref<any[]>([])
const form = ref({
  role: '',
  firstName: '',
  lastName: '',
})

const toggleForm = () => {
  showForm.value = !showForm.value
}

const onFormChange = () => {
  // Form changed
}

const addCoach = () => {
  if (!form.value.role || !form.value.firstName || !form.value.lastName) {
    alert('Fill all fields')
    return
  }

  coaches.value.push({
    id: Date.now(),
    role: form.value.role,
    firstName: form.value.firstName,
    lastName: form.value.lastName,
  })

  form.value = { role: '', firstName: '', lastName: '' }
  showForm.value = false
}

const deleteCoach = (id: number) => {
  coaches.value = coaches.value.filter(c => c.id !== id)
}
</script>
