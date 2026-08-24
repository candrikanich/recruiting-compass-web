<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <PageHeader
      title="Recommendation Letters"
      description="Track recommendation letter requests and submissions"
    />

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <!-- Filters Section -->
      <div class="mb-8 rounded-lg bg-white p-6 shadow-sm">
        <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <!-- Status Filter -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700"
              >Status</label
            >
            <select
              v-model="filters.status"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="not_requested">Not Requested</option>
              <option value="requested">Requested</option>
              <option value="received">Received</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>

          <!-- Deadline Status -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700"
              >Deadline</label
            >
            <select
              v-model="filters.deadlineStatus"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="overdue">Overdue</option>
              <option value="urgent">Due Soon (7 days)</option>
              <option value="ok">OK</option>
            </select>
          </div>

          <!-- Clear Filters -->
          <div class="flex items-end">
            <button
              @click="clearFilters"
              class="w-full rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Add Letter Button -->
        <button
          @click="showAddForm = !showAddForm"
          class="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          {{ showAddForm ? "Hide Form" : "+ Request Letter" }}
        </button>
      </div>

      <!-- Add/Edit Form -->
      <div v-if="showAddForm" class="mb-8 rounded-lg bg-white p-6 shadow-sm">
        <h2 class="mb-6 text-2xl font-bold text-gray-900">
          {{
            editingId
              ? "Update Recommendation Letter"
              : "Request Recommendation Letter"
          }}
        </h2>
        <form @submit.prevent="handleSave" class="space-y-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <!-- Writer Name -->
            <div>
              <label
                for="writerName"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Writer Name <span class="text-red-600">*</span>
              </label>
              <input
                id="writerName"
                v-model="formData.writer_name"
                type="text"
                required
                placeholder="e.g., Coach Smith, Mr. Johnson"
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Writer Title -->
            <div>
              <label
                for="writerTitle"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Writer Title
              </label>
              <input
                id="writerTitle"
                v-model="formData.writer_title"
                type="text"
                placeholder="e.g., Head Coach, Teacher"
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Status -->
            <div>
              <label
                for="status"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Status <span class="text-red-600">*</span>
              </label>
              <select
                id="status"
                v-model="formData.status"
                required
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Status</option>
                <option value="not_requested">Not Requested</option>
                <option value="requested">Requested</option>
                <option value="received">Received</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>

            <!-- Requested Date -->
            <div>
              <label
                for="requestedDate"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Requested Date
              </label>
              <input
                id="requestedDate"
                v-model="formData.requested_date"
                type="date"
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Due Date -->
            <div>
              <label
                for="dueDate"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Due Date
              </label>
              <input
                id="dueDate"
                v-model="formData.due_date"
                type="date"
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Received Date -->
            <div>
              <label
                for="receivedDate"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Received Date
              </label>
              <input
                id="receivedDate"
                v-model="formData.received_date"
                type="date"
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Writer Email -->
            <div>
              <label
                for="email"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email"
                v-model="formData.writer_email"
                type="email"
                autocomplete="email"
                placeholder="writer@school.edu"
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>

            <!-- Relationship -->
            <div>
              <label
                for="relationship"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Relationship
              </label>
              <input
                id="relationship"
                v-model="formData.relationship"
                type="text"
                placeholder="e.g., Coach, Teacher, Mentor"
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label
              for="notes"
              class="mb-1 block text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              v-model="formData.notes"
              rows="3"
              placeholder="Any follow-up notes or special instructions..."
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-4">
            <button
              type="submit"
              :disabled="loading || !formData.writer_name || !formData.status"
              class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {{ loading ? "Saving..." : "Save Letter" }}
            </button>
            <button
              type="button"
              @click="cancelEdit"
              class="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading && letters.length === 0" class="py-12 text-center">
        <p class="text-gray-600">Loading recommendation letters...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="letters.length === 0"
        class="rounded-lg bg-white p-12 text-center shadow-sm"
      >
        <p class="mb-2 text-gray-600">No recommendation letters tracked yet</p>
        <p class="text-sm text-gray-500">
          Start requesting letters from coaches and teachers
        </p>
      </div>

      <!-- No Results -->
      <div
        v-else-if="filteredLetters.length === 0"
        class="rounded-lg bg-white p-12 text-center shadow-sm"
      >
        <p class="mb-2 text-gray-600">No letters match your filters</p>
        <p class="text-sm text-gray-500">
          Try adjusting your search or filters
        </p>
      </div>

      <!-- Letters List -->
      <div v-else class="space-y-4">
        <div
          v-for="letter in filteredLetters"
          :key="letter.id"
          class="rounded-lg bg-white p-6 shadow-sm transition hover:shadow-lg"
        >
          <div class="mb-4 flex items-start justify-between">
            <div class="flex-1">
              <div class="mb-2 flex items-center gap-3">
                <h3 class="text-lg font-bold text-gray-900">
                  {{ letter.writer_name }}
                </h3>
                <span
                  :class="[
                    'inline-block rounded-full px-3 py-1 text-xs font-semibold',
                    getStatusColor(letter.status ?? ''),
                  ]"
                >
                  {{ getStatusLabel(letter.status ?? "") }}
                </span>
                <span
                  v-if="isDeadlineUrgent(letter)"
                  class="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800"
                >
                  ⚠️ {{ getDeadlineStatus(letter) }}
                </span>
              </div>
              <p v-if="letter.writer_title" class="text-sm text-gray-600">
                {{ letter.writer_title }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="editLetter(letter)"
                class="rounded-sm bg-blue-100 px-3 py-1 text-sm text-blue-700 transition hover:bg-blue-200"
              >
                Edit
              </button>
              <button
                @click="handleDelete(letter.id)"
                class="rounded-sm bg-red-100 px-3 py-1 text-sm text-red-700 transition hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Details -->
          <div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div v-if="letter.requested_date">
              <p class="text-gray-600">Requested</p>
              <p class="font-semibold text-gray-900">
                {{ formatDate(letter.requested_date) }}
              </p>
            </div>
            <div v-if="letter.due_date">
              <p class="text-gray-600">Due</p>
              <p class="font-semibold text-gray-900">
                {{ formatDate(letter.due_date) }}
              </p>
            </div>
            <div v-if="letter.received_date">
              <p class="text-gray-600">Received</p>
              <p class="font-semibold text-gray-900">
                {{ formatDate(letter.received_date) }}
              </p>
            </div>
            <div v-if="letter.writer_email">
              <p class="text-gray-600">Email</p>
              <p class="cursor-pointer text-xs text-blue-600 hover:underline">
                {{ letter.writer_email }}
              </p>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="letter.notes" class="mt-4 border-t border-gray-200 pt-4">
            <p class="mb-2 text-sm text-gray-600">📝 Notes</p>
            <p class="text-sm text-gray-700">{{ letter.notes }}</p>
          </div>
        </div>
      </div>
    </main>

    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Recommendation Letter"
      message="Are you sure you want to delete this recommendation letter record? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRecommendationLetters } from "~/composables/useRecommendationLetters";
import { useAppToast } from "~/composables/useAppToast";
import { createClientLogger } from "~/utils/logger";
import type { Database } from "~/types/database";

const logger = createClientLogger("Recommendations");

definePageMeta({
  middleware: "auth",
});

type RecommendationLetter =
  Database["public"]["Tables"]["recommendation_letters"]["Row"];

const { letters, loading, error, fetchLetters, saveLetter, deleteLetter } =
  useRecommendationLetters();
const { showToast } = useAppToast();

const showAddForm = ref(false);
const editingId = ref<string | null>(null);

// Form
const formData = ref({
  writer_name: "",
  writer_email: "",
  writer_title: "",
  status: "",
  requested_date: "",
  due_date: "",
  received_date: "",
  relationship: "",
  schools_submitted_to: [] as string[],
  notes: "",
});

// Filters
const filters = ref({
  status: "",
  deadlineStatus: "",
});

// Filtered letters
const filteredLetters = computed(() => {
  return letters.value.filter((letter) => {
    if (filters.value.status && letter.status !== filters.value.status)
      return false;

    if (filters.value.deadlineStatus) {
      const status = getDeadlineStatus(letter);
      if (filters.value.deadlineStatus === "overdue" && status !== "Overdue")
        return false;
      if (filters.value.deadlineStatus === "urgent" && status !== "Due Soon")
        return false;
      if (
        filters.value.deadlineStatus === "ok" &&
        (status === "Overdue" || status === "Due Soon")
      )
        return false;
    }

    return true;
  });
});

// Helper functions
const clearFilters = () => {
  filters.value = { status: "", deadlineStatus: "" };
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    requested: "bg-blue-100 text-blue-800",
    submitted: "bg-yellow-100 text-yellow-800",
    received: "bg-green-100 text-green-800",
    pending: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    not_requested: "📋 Not Requested",
    requested: "📬 Requested",
    received: "✅ Received",
    submitted: "📤 Submitted",
  };
  return labels[status] || status;
};

const getDeadlineStatus = (letter: RecommendationLetter): string => {
  if (!letter.due_date) return "No Deadline";
  const deadline = new Date(letter.due_date);
  const today = new Date();
  const daysUntil = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntil < 0) return "Overdue";
  if (daysUntil <= 7) return "Due Soon";
  return "OK";
};

const isDeadlineUrgent = (letter: RecommendationLetter): boolean => {
  if (!letter.due_date) return false;
  const status = getDeadlineStatus(letter);
  return status === "Overdue" || status === "Due Soon";
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const editLetter = (letter: RecommendationLetter) => {
  editingId.value = letter.id;
  formData.value = {
    writer_name: letter.writer_name,
    writer_email: letter.writer_email ?? "",
    writer_title: letter.writer_title ?? "",
    status: letter.status ?? "",
    requested_date: letter.requested_date ?? "",
    due_date: letter.due_date ?? "",
    received_date: letter.received_date ?? "",
    relationship: letter.relationship ?? "",
    schools_submitted_to: letter.schools_submitted_to ?? [],
    notes: letter.notes ?? "",
  };
  showAddForm.value = true;
};

const cancelEdit = () => {
  editingId.value = null;
  formData.value = {
    writer_name: "",
    writer_email: "",
    writer_title: "",
    status: "",
    requested_date: "",
    due_date: "",
    received_date: "",
    relationship: "",
    schools_submitted_to: [],
    notes: "",
  };
  showAddForm.value = false;
};

const handleSave = async () => {
  await saveLetter(formData.value, editingId.value);
  if (!error.value) cancelEdit();
};

const isDeleteDialogOpen = ref(false);
const letterToDeleteId = ref<string | null>(null);

const handleDelete = (id: string) => {
  letterToDeleteId.value = id;
  isDeleteDialogOpen.value = true;
};

const confirmDelete = async () => {
  const id = letterToDeleteId.value;
  isDeleteDialogOpen.value = false;
  letterToDeleteId.value = null;
  if (!id) return;
  try {
    await deleteLetter(id);
  } catch (err) {
    logger.error("Failed to delete recommendation letter", err);
    showToast(
      "Something went wrong deleting this recommendation letter. Please try again.",
      "error",
    );
  }
};

const cancelDelete = () => {
  isDeleteDialogOpen.value = false;
  letterToDeleteId.value = null;
};

onMounted(() => {
  fetchLetters();
});
</script>
