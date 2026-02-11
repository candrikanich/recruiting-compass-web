<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink
          to="/documents"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Documents
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !document" class="text-center py-12">
        <p class="text-gray-600">Loading document...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Document Not Found -->
      <div
        v-else-if="!document"
        class="bg-white rounded-lg shadow p-12 text-center"
      >
        <p class="text-gray-600 mb-2">Document not found</p>
        <NuxtLink
          to="/documents"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          Return to Documents →
        </NuxtLink>
      </div>

      <!-- Document Detail -->
      <div v-else class="space-y-8">
        <!-- Document Header -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-start justify-between mb-6">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span
                  class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                >
                  {{ getTypeLabel(document.type) }}
                </span>
                <h1 class="text-3xl font-bold text-gray-900">
                  {{ document.title }}
                </h1>
              </div>
              <p v-if="document.description" class="text-gray-600">
                {{ document.description }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                v-if="!isEditing"
                @click="isEditing = true"
                class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Edit
              </button>
              <button
                v-else
                @click="isEditing = false"
                class="px-4 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                @click="showShareModal = true"
                class="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                Share
              </button>
              <button
                @click="handleDeleteDocument"
                class="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200"
          >
            <div>
              <p class="text-gray-600 text-sm mb-1">Version</p>
              <p class="font-semibold text-gray-900">{{ document.version }}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm mb-1">School</p>
              <p class="font-semibold text-gray-900">{{ schoolName }}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm mb-1">Uploaded</p>
              <p class="font-semibold text-gray-900">
                {{ formatDate(document.created_at) }}
              </p>
            </div>
            <div>
              <p class="text-gray-600 text-sm mb-1">File Type</p>
              <p class="font-semibold text-gray-900">
                {{ document.file_type || "Unknown" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Document Preview -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Preview</h2>

          <!-- Video -->
          <VideoPlayer v-if="isVideo" :src="document.file_url" />

          <!-- Image -->
          <img
            v-else-if="isImage"
            :src="document.file_url"
            class="max-w-full rounded-lg"
          />

          <!-- PDF -->
          <iframe
            v-else-if="isPDF"
            :src="document.file_url"
            class="w-full h-96 rounded-lg border border-gray-300"
          />

          <!-- Download for other types -->
          <div v-else class="text-center py-12">
            <p class="text-gray-600 mb-4">
              File preview not available for this file type
            </p>
            <a
              :href="document.file_url"
              target="_blank"
              download
              class="inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Download {{ document.title }}
            </a>
          </div>
        </div>

        <!-- Version History -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Version History</h2>

          <div v-if="documentVersions.length > 0" class="space-y-2">
            <div
              v-for="version in documentVersions"
              :key="version.id"
              class="flex items-center justify-between py-3 border-b border-gray-200"
            >
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <span class="font-semibold text-gray-900"
                    >Version {{ version.version }}</span
                  >
                  <span
                    v-if="version.is_current"
                    class="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded"
                  >
                    Current
                  </span>
                </div>
                <p class="text-sm text-gray-500 mt-1">
                  {{ formatDate(version.created_at) }}
                </p>
              </div>
              <div class="flex gap-2">
                <a
                  :href="version.file_url"
                  target="_blank"
                  rel="noopener"
                  class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                >
                  View
                </a>
                <button
                  v-if="!version.is_current"
                  @click="restoreVersion(version.id)"
                  class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                >
                  Restore
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-gray-500">
            <p>No previous versions</p>
          </div>

          <button
            @click="showUploadNewVersion = true"
            class="mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            + Upload New Version
          </button>
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Edit Document</h2>
          <form @submit.prevent="saveDocument" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Title -->
              <div>
                <label
                  for="title"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="title"
                  v-model="editForm.title"
                  type="text"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- School -->
              <div>
                <label
                  for="school"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  School
                </label>
                <select
                  id="school"
                  v-model="editForm.school_id"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select School (Optional)</option>
                  <option
                    v-for="school in schools"
                    :key="school.id"
                    :value="school.id"
                  >
                    {{ school.name }}
                  </option>
                </select>
              </div>

              <!-- Description -->
              <div class="md:col-span-2">
                <label
                  for="description"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  v-model="editForm.description"
                  rows="3"
                  placeholder="Add a description..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-4">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ loading ? "Saving..." : "Save Changes" }}
              </button>
              <button
                type="button"
                @click="isEditing = false"
                class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Share Modal -->
      <div
        v-if="showShareModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div
          class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4 max-h-96 overflow-y-auto"
        >
          <h3 class="text-lg font-bold text-gray-900 mb-4">Share Document</h3>

          <!-- Currently Shared Schools -->
          <div
            v-if="(document?.shared_with_schools || []).length > 0"
            class="mb-6"
          >
            <h4 class="text-sm font-semibold text-gray-700 mb-3">
              Shared With
            </h4>
            <div class="space-y-2">
              <div
                v-for="schoolId in document?.shared_with_schools || []"
                :key="schoolId"
                class="flex items-center justify-between p-2 bg-blue-50 rounded"
              >
                <span class="text-sm text-gray-900">{{
                  getSchoolNameById(schoolId)
                }}</span>
                <button
                  @click="removeShare(schoolId)"
                  class="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- School Selector -->
          <div class="mb-6">
            <h4 class="text-sm font-semibold text-gray-700 mb-3">
              Add Schools
            </h4>
            <div class="space-y-2 max-h-40 overflow-y-auto">
              <label
                v-for="school in availableSchools"
                :key="school.id"
                class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  :checked="selectedSchools.includes(school.id)"
                  @change="toggleSchoolSelection(school.id)"
                  type="checkbox"
                  class="w-4 h-4 rounded"
                />
                <span class="text-sm text-gray-900">{{ school.name }}</span>
              </label>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              @click="saveSharing"
              :disabled="loading"
              class="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
            >
              {{ loading ? "Saving..." : "Save" }}
            </button>
            <button
              @click="showShareModal = false"
              class="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useSchools } from "~/composables/useSchools";
import { useErrorHandler } from "~/composables/useErrorHandler";
import VideoPlayer from "~/components/VideoPlayer.vue";
import type { Document } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();
const {
  documents,
  loading,
  error,
  fetchDocuments,
  updateDocument,
  deleteDocument: deleteDocumentAPI,
  fetchVersions,
  shareDocument,
  revokeAccess: removeSchoolAccess,
} = useDocumentsConsolidated();
const { schools, fetchSchools } = useSchools();
const { getErrorMessage, logError } = useErrorHandler();

const isEditing = ref(false);
const showUploadNewVersion = ref(false);
const showShareModal = ref(false);
const documentVersions = ref<Document[]>([]);
const selectedSchools = ref<string[]>([]);

const documentId = computed(() => {
  const id = route.query.id;
  if (Array.isArray(id)) {
    return decodeURIComponent(id.join("/"));
  }
  return decodeURIComponent(id as string);
});

const document = computed(() => {
  const id = documentId.value;
  // If ID contains a slash, it's actually a file_url path, search by that instead
  if (id.includes("/")) {
    return documents.value.find((d: Document) => d.file_url === id);
  }
  return documents.value.find((d: Document) => d.id === id);
});

const schoolName = computed(() => {
  if (!document.value || !document.value.school_id) return "Not specified";
  return (
    schools.value.find((s) => s.id === document.value!.school_id)?.name ||
    "Unknown School"
  );
});

const isVideo = computed(() => {
  if (!document.value) return false;
  return (
    document.value.type === "highlight_video" ||
    document.value.file_type?.includes("video")
  );
});

const isImage = computed(() => {
  if (!document.value) return false;
  return document.value.file_type?.includes("image");
});

const isPDF = computed(() => {
  if (!document.value) return false;
  return document.value.file_type === "application/pdf";
});

const availableSchools = computed(() => {
  return schools.value.filter(
    (s) => !(document.value?.shared_with_schools || []).includes(s.id),
  );
});

const editForm = reactive({
  title: "",
  description: "",
  school_id: "",
});

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    highlight_video: "Highlight Video",
    transcript: "Transcript",
    resume: "Resume",
    rec_letter: "Recommendation Letter",
    questionnaire: "Questionnaire",
    stats_sheet: "Stats Sheet",
  };
  return labels[type] || type;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const saveDocument = async () => {
  if (!document.value) return;
  try {
    await updateDocument(documentId.value, {
      title: editForm.title,
      description: editForm.description || null,
      school_id: editForm.school_id || null,
    });
    isEditing.value = false;
    await fetchDocuments();
  } catch (err) {
    error.value = "Failed to save document";
    console.error("Error saving document:", err);
  }
};

const handleDeleteDocument = async () => {
  if (
    confirm(
      "Are you sure you want to delete this document? This action cannot be undone.",
    )
  ) {
    try {
      const success = await deleteDocumentAPI(documentId.value);
      if (success) {
        await router.push("/documents");
      } else {
        logError(new Error("Failed to delete document"));
      }
    } catch (err) {
      logError(err);
    }
  }
};

const loadDocumentData = () => {
  if (document.value) {
    editForm.title = document.value.title;
    editForm.description = document.value.description || "";
    editForm.school_id = document.value.school_id || "";
  }
};

const fetchDocumentVersions = async () => {
  if (!document.value) return;

  try {
    const versions = await fetchVersions(document.value.id);
    documentVersions.value = versions || [];
  } catch (err) {
    logError(err);
  }
};

const restoreVersion = async (versionId: string) => {
  if (
    confirm(
      "Restore this version? The current version will be marked as archived.",
    )
  ) {
    try {
      // Mark current version as not current
      if (document.value) {
        await updateDocument(document.value.id, { is_current: false });
      }

      // Mark restored version as current
      await updateDocument(versionId, { is_current: true });

      await fetchDocuments();
      await fetchDocumentVersions();
    } catch (err) {
      logError(err);
    }
  }
};

const getSchoolNameById = (schoolId: string): string => {
  return schools.value.find((s) => s.id === schoolId)?.name || "Unknown School";
};

const toggleSchoolSelection = (schoolId: string) => {
  const index = selectedSchools.value.indexOf(schoolId);
  if (index > -1) {
    selectedSchools.value.splice(index, 1);
  } else {
    selectedSchools.value.push(schoolId);
  }
};

const removeShare = async (schoolId: string) => {
  if (!document.value) return;
  try {
    const updatedSchools = (document.value.shared_with_schools || []).filter(
      (id) => id !== schoolId,
    );
    const result = await removeSchoolAccess(document.value.id, updatedSchools);
    if (result) {
      await fetchDocuments();
    } else {
      logError(new Error("Failed to remove school access"));
    }
  } catch (err) {
    logError(err);
  }
};

const saveSharing = async () => {
  if (!document.value) return;
  try {
    const allSharedSchools = [
      ...(document.value.shared_with_schools || []),
      ...selectedSchools.value,
    ];
    const result = await shareDocument(document.value.id, allSharedSchools);
    if (result) {
      selectedSchools.value = [];
      showShareModal.value = false;
      await fetchDocuments();
    }
  } catch (err) {
    logError(err);
  }
};

onMounted(async () => {
  await Promise.all([fetchSchools(), fetchDocuments()]);
  loadDocumentData();
  await fetchDocumentVersions();
});
</script>
