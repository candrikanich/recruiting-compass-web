<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-3xl font-bold text-gray-900">
            Recommendation Letters
          </h1>
          <span class="text-sm text-gray-500"
            >{{ filteredLetters.length }} total</span
          >
        </div>
        <p class="text-gray-600">
          Track recommendation letter requests and submissions
        </p>
      </div>

      <!-- Filters Section -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Status</label
            >
            <select
              v-model="filters.status"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Deadline</label
            >
            <select
              v-model="filters.deadlineStatus"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              class="w-full px-3 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Add Letter Button -->
        <button
          @click="showAddForm = !showAddForm"
          class="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          {{ showAddForm ? "Hide Form" : "+ Request Letter" }}
        </button>
      </div>

      <!-- Add/Edit Form -->
      <div v-if="showAddForm" class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          {{
            editingId
              ? "Update Recommendation Letter"
              : "Request Recommendation Letter"
          }}
        </h2>
        <form @submit.prevent="handleSave" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Writer Name -->
            <div>
              <label
                for="writerName"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Writer Name <span class="text-red-600">*</span>
              </label>
              <input
                id="writerName"
                v-model="formData.writer_name"
                type="text"
                required
                placeholder="e.g., Coach Smith, Mr. Johnson"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Writer Title -->
            <div>
              <label
                for="writerTitle"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Writer Title
              </label>
              <input
                id="writerTitle"
                v-model="formData.writer_title"
                type="text"
                placeholder="e.g., Head Coach, Teacher"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Status -->
            <div>
              <label
                for="status"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Status <span class="text-red-600">*</span>
              </label>
              <select
                id="status"
                v-model="formData.status"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Requested Date
              </label>
              <input
                id="requestedDate"
                v-model="formData.requested_date"
                type="date"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Due Date -->
            <div>
              <label
                for="dueDate"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Due Date
              </label>
              <input
                id="dueDate"
                v-model="formData.due_date"
                type="date"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Received Date -->
            <div>
              <label
                for="receivedDate"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Received Date
              </label>
              <input
                id="receivedDate"
                v-model="formData.received_date"
                type="date"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Writer Email -->
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                v-model="formData.writer_email"
                type="email"
                placeholder="writer@school.edu"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Relationship -->
            <div>
              <label
                for="relationship"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Relationship
              </label>
              <input
                id="relationship"
                v-model="formData.relationship"
                type="text"
                placeholder="e.g., Coach, Teacher, Mentor"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label
              for="notes"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              v-model="formData.notes"
              rows="3"
              placeholder="Any follow-up notes or special instructions..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-4">
            <button
              type="submit"
              :disabled="loading || !formData.writer_name || !formData.status"
              class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {{ loading ? "Saving..." : "Save Letter" }}
            </button>
            <button
              type="button"
              @click="cancelEdit"
              class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading && letters.length === 0" class="text-center py-12">
        <p class="text-gray-600">Loading recommendation letters...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="letters.length === 0"
        class="bg-white rounded-lg shadow p-12 text-center"
      >
        <p class="text-gray-600 mb-2">No recommendation letters tracked yet</p>
        <p class="text-sm text-gray-500">
          Start requesting letters from coaches and teachers
        </p>
      </div>

      <!-- No Results -->
      <div
        v-else-if="filteredLetters.length === 0"
        class="bg-white rounded-lg shadow p-12 text-center"
      >
        <p class="text-gray-600 mb-2">No letters match your filters</p>
        <p class="text-sm text-gray-500">
          Try adjusting your search or filters
        </p>
      </div>

      <!-- Letters List -->
      <div v-else class="space-y-4">
        <div
          v-for="letter in filteredLetters"
          :key="letter.id"
          class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-bold text-gray-900">
                  {{ letter.writer_name }}
                </h3>
                <span
                  :class="[
                    'inline-block px-3 py-1 text-xs font-semibold rounded-full',
                    getStatusColor(letter.status ?? ''),
                  ]"
                >
                  {{ getStatusLabel(letter.status ?? "") }}
                </span>
                <span
                  v-if="isDeadlineUrgent(letter)"
                  class="inline-block px-3 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full"
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
                class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
              >
                Edit
              </button>
              <button
                @click="deleteLetter(letter.id)"
                class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Details -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
              <p class="text-xs text-blue-600 hover:underline cursor-pointer">
                {{ letter.writer_email }}
              </p>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="letter.notes" class="border-t border-gray-200 pt-4 mt-4">
            <p class="text-sm text-gray-600 mb-2">📝 Notes</p>
            <p class="text-sm text-gray-700">{{ letter.notes }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useSchools } from "~/composables/useSchools";
import { useUserStore } from "~/stores/user";
import type { Database } from "~/types/database";

definePageMeta({
  middleware: "auth",
});

type RecommendationLetter =
  Database["public"]["Tables"]["recommendation_letters"]["Row"];

const userStore = useUserStore();
const supabase = useSupabase();

// Data
const letters = ref<RecommendationLetter[]>([]);
const loading = ref(false);
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
  try {
    loading.value = true;

    if (editingId.value) {
      const { error } = await supabase
        .from("recommendation_letters")
        .update(formData.value as any)
        .eq("id", editingId.value);

      if (error) throw error;
    } else {
      const response = (await supabase
        .from("recommendation_letters")
        .insert([
          { ...formData.value, user_id: userStore.user?.id },
        ])) as unknown as { data: any; error: any };

      const { error } = response;
      if (error) throw error;
    }

    await loadLetters();
    cancelEdit();
  } catch (err) {
    console.error("Error saving letter:", err);
  } finally {
    loading.value = false;
  }
};

const deleteLetter = async (id: string) => {
  if (confirm("Delete this recommendation letter record?")) {
    try {
      const { error } = await supabase
        .from("recommendation_letters")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadLetters();
    } catch (err) {
      console.error("Error deleting letter:", err);
    }
  }
};

const loadLetters = async () => {
  try {
    loading.value = true;
    const response = await supabase
      .from("recommendation_letters")
      .select("*")
      .eq("user_id", userStore.user?.id ?? "")
      .order("requested_date", { ascending: false });

    const { data, error } = response as {
      data: RecommendationLetter[];
      error: any;
    };
    if (error) throw error;
    letters.value = data || [];
  } catch (err) {
    console.error("Error loading letters:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  if (!userStore.user) return;
  try {
    await loadLetters();
  } catch (err) {
    console.error("Error loading data:", err);
  }
});
</script>
