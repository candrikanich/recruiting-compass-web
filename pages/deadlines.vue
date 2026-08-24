<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Deadlines</h1>
        <p class="mt-1 text-sm text-gray-500">
          Track application, offer, and recruiting deadlines
        </p>
      </div>
      <button
        @click="showAdd = true"
        class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
      >
        + Add Deadline
      </button>
    </div>

    <div v-if="loading" class="py-12 text-center text-gray-400">Loading...</div>
    <div v-else-if="error" class="py-8 text-center text-red-600">
      {{ error }}
    </div>
    <div
      v-else-if="sortedDeadlines.length === 0"
      class="py-16 text-center text-gray-400"
    >
      <p class="text-lg">No deadlines yet.</p>
      <p class="mt-2 text-sm">
        Add application deadlines, offer decisions, and other key dates.
      </p>
    </div>
    <ul v-else class="space-y-3">
      <li
        v-for="d in sortedDeadlines"
        :key="d.id"
        class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
      >
        <div>
          <p class="font-medium text-gray-900">{{ d.label }}</p>
          <p class="mt-0.5 text-sm text-gray-500">
            {{ d.deadline_date }} ·
            <span class="capitalize">{{
              d.category.replaceAll("_", " ")
            }}</span>
          </p>
        </div>
        <button
          @click="removeDeadline(d.id)"
          class="text-sm font-medium text-red-500 hover:text-red-700"
          :aria-label="`Remove ${d.label}`"
        >
          Remove
        </button>
      </li>
    </ul>

    <!-- Add deadline modal -->
    <div
      v-if="showAdd"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showAdd = false"
    >
      <form
        @submit.prevent="submitAdd"
        class="mx-4 w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 class="text-lg font-bold">Add Deadline</h2>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"
            >Label</label
          >
          <input
            v-model="newDeadline.label"
            type="text"
            required
            maxlength="200"
            placeholder="e.g. Application Deadline — Stanford"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"
            >Date</label
          >
          <input
            v-model="newDeadline.deadline_date"
            type="date"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"
            >Category</label
          >
          <select
            v-model="newDeadline.category"
            class="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="application">Application</option>
            <option value="decision">Decision</option>
            <option value="financial_aid">Financial Aid</option>
            <option value="visit">Visit</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="showAdd = false"
            class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="addingDeadline"
            class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ addingDeadline ? "Adding…" : "Add Deadline" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  deadlines,
  loading,
  error,
  fetchDeadlines,
  createDeadline,
  removeDeadline,
} = useDeadlines();
const showAdd = ref(false);
const addingDeadline = ref(false);
const newDeadline = reactive({
  label: "",
  deadline_date: "",
  category: "application",
});

onMounted(fetchDeadlines);

const sortedDeadlines = computed(() =>
  [...deadlines.value].sort((a, b) =>
    a.deadline_date.localeCompare(b.deadline_date),
  ),
);

async function submitAdd() {
  if (!newDeadline.label || !newDeadline.deadline_date) return;
  addingDeadline.value = true;
  try {
    await createDeadline({ ...newDeadline });
    showAdd.value = false;
    Object.assign(newDeadline, {
      label: "",
      deadline_date: "",
      category: "application",
    });
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to create deadline";
  } finally {
    addingDeadline.value = false;
  }
}
</script>
