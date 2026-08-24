<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-8 text-3xl font-bold">Test Coaches</h1>

      <button
        @click="toggleForm"
        class="mb-6 rounded-sm bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Toggle Form
      </button>

      <div v-show="showForm" class="mb-8 rounded-sm bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-xl font-bold">Add Coach</h2>
        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium">Role</label>
            <select
              v-model="form.role"
              @change="onFormChange"
              class="w-full rounded-sm border px-3 py-2"
            >
              <option value="">Select Role</option>
              <option value="head">Head Coach</option>
              <option value="assistant">Assistant Coach</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">First Name</label>
            <input
              v-model="form.firstName"
              @input="onFormChange"
              type="text"
              class="w-full rounded-sm border px-3 py-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Last Name</label>
            <input
              v-model="form.lastName"
              @input="onFormChange"
              type="text"
              class="w-full rounded-sm border px-3 py-2"
            />
          </div>
          <button
            @click="addCoach"
            class="w-full rounded-sm bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Add Coach
          </button>
        </div>
      </div>

      <div v-if="coaches.length > 0" class="space-y-4">
        <h2 class="text-xl font-bold">Coaches ({{ coaches.length }})</h2>
        <div
          v-for="coach in coaches"
          :key="coach.id"
          class="rounded-sm bg-white p-4 shadow-sm"
        >
          <h3 class="font-bold">{{ coach.firstName }} {{ coach.lastName }}</h3>
          <p class="text-sm text-gray-600">{{ coach.role }}</p>
          <button
            @click="deleteCoach(coach.id)"
            class="mt-2 rounded-sm bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
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
import { ref } from "vue";
import { useAppToast } from "~/composables/useAppToast";

const { showToast } = useAppToast();

const showForm = ref(false);
const coaches = ref<any[]>([]);
const form = ref({
  role: "",
  firstName: "",
  lastName: "",
});

const toggleForm = () => {
  showForm.value = !showForm.value;
};

const onFormChange = () => {
  // Form changed
};

const addCoach = () => {
  if (!form.value.role || !form.value.firstName || !form.value.lastName) {
    showToast("Fill all fields", "warning");
    return;
  }

  coaches.value.push({
    id: Date.now(),
    role: form.value.role,
    firstName: form.value.firstName,
    lastName: form.value.lastName,
  });

  form.value = { role: "", firstName: "", lastName: "" };
  showForm.value = false;
};

const deleteCoach = (id: number) => {
  coaches.value = coaches.value.filter((c) => c.id !== id);
};
</script>
