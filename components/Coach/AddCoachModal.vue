<script setup lang="ts">
import type { Coach } from "~/types/models";

interface Props {
  show: boolean;
  schoolId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  "coach-created": [coach: Coach];
}>();

const { createCoach } = useCoaches();

const firstName = ref("");
const lastName = ref("");
const role = ref("assistant");
const loading = ref(false);
const error = ref<string | null>(null);

const handleSubmit = async () => {
  error.value = null;

  if (!firstName.value.trim() || !lastName.value.trim()) {
    error.value = "First name and last name are required";
    return;
  }

  loading.value = true;

  try {
    const newCoach = await createCoach(props.schoolId, {
      school_id: props.schoolId,
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      role: role.value as "head" | "assistant" | "recruiting",
      email: null,
      phone: null,
      twitter_handle: null,
      instagram_handle: null,
      notes: null,
      responsiveness_score: 0,
      last_contact_date: null,
    });

    emit("coach-created", newCoach);
    handleClose();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to create coach";
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  firstName.value = "";
  lastName.value = "";
  role.value = "assistant";
  error.value = null;
  loading.value = false;
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        @click.stop
      >
        <div
          class="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white"
        >
          <h2 class="text-xl font-bold">Add New Coach</h2>
          <p class="mt-1 text-sm text-white/90">Add a coach for this school</p>
        </div>

        <div class="p-6">
          <form @submit.prevent="handleSubmit">
            <div
              v-if="error"
              class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
            >
              {{ error }}
            </div>

            <div class="space-y-4">
              <div>
                <label
                  for="firstName"
                  class="block text-sm font-medium text-slate-700"
                >
                  First Name <span class="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  v-model="firstName"
                  type="text"
                  required
                  :disabled="loading"
                  class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label
                  for="lastName"
                  class="block text-sm font-medium text-slate-700"
                >
                  Last Name <span class="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  v-model="lastName"
                  type="text"
                  required
                  :disabled="loading"
                  class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label
                  for="role"
                  class="block text-sm font-medium text-slate-700"
                >
                  Role
                </label>
                <select
                  id="role"
                  v-model="role"
                  :disabled="loading"
                  class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="head">Head Coach</option>
                  <option value="assistant">Assistant Coach</option>
                  <option value="recruiting">Recruiting Coordinator</option>
                </select>
              </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                :disabled="loading"
                class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ loading ? "Adding..." : "Add Coach" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
