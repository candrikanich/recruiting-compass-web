<template>
  <div class="min-h-screen bg-brand-slate-50">
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink
          to="/documents"
          class="font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to Documents
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !document" class="py-12 text-center">
        <p class="text-brand-slate-600">Loading document...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Document Not Found -->
      <div
        v-else-if="!document"
        class="rounded-lg bg-white p-12 text-center shadow-sm"
      >
        <p class="mb-2 text-brand-slate-600">Document not found</p>
        <NuxtLink
          to="/documents"
          class="font-semibold text-blue-600 hover:text-blue-700"
        >
          Return to Documents →
        </NuxtLink>
      </div>

      <!-- Document Detail -->
      <div v-else class="space-y-8">
        <!-- Document Header -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <div class="mb-6 flex items-start justify-between">
            <div class="flex-1">
              <div class="mb-2 flex items-center gap-3">
                <span
                  class="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"
                >
                  {{ getTypeLabel(document.type) }}
                </span>
                <h1 class="text-3xl font-bold text-brand-slate-900">
                  {{ document.title }}
                </h1>
              </div>
              <p v-if="document.description" class="text-brand-slate-600">
                {{ document.description }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                v-if="!isEditing"
                @click="isEditing = true"
                class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                v-else
                @click="isEditing = false"
                class="rounded-lg bg-brand-slate-300 px-4 py-2 font-semibold text-brand-slate-900 transition hover:bg-brand-slate-400"
              >
                Cancel
              </button>
              <button
                @click="showShareModal = true"
                class="rounded-lg bg-brand-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-emerald-700"
              >
                Share
              </button>
              <button
                @click="handleDeleteDocument"
                class="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div
            class="grid grid-cols-2 gap-4 border-t border-brand-slate-200 pt-6 md:grid-cols-4"
          >
            <div>
              <p class="mb-1 text-sm text-brand-slate-600">Version</p>
              <p class="font-semibold text-brand-slate-900">
                {{ document.version }}
              </p>
            </div>
            <div>
              <p class="mb-1 text-sm text-brand-slate-600">School</p>
              <p class="font-semibold text-brand-slate-900">{{ schoolName }}</p>
            </div>
            <div>
              <p class="mb-1 text-sm text-brand-slate-600">Uploaded</p>
              <p class="font-semibold text-brand-slate-900">
                {{ formatDate(document.created_at) }}
              </p>
            </div>
            <div>
              <p class="mb-1 text-sm text-brand-slate-600">File Type</p>
              <p class="font-semibold text-brand-slate-900">
                {{ document.file_type || "Unknown" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Document Preview -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl font-bold text-brand-slate-900">Preview</h2>

          <!-- Video -->
          <VideoPlayer v-if="isVideo" :src="document.file_url" />

          <!-- Image -->
          <img
            v-else-if="isImage"
            :src="document.file_url"
            :alt="`Preview of ${document.title}`"
            class="max-w-full rounded-lg"
            loading="lazy"
          />

          <!-- PDF -->
          <iframe
            v-else-if="isPDF"
            :src="document.file_url"
            :title="`PDF preview of ${document.title}`"
            class="h-96 w-full rounded-lg border border-brand-slate-300"
          />

          <!-- Download for other types -->
          <div v-else class="py-12 text-center">
            <p class="mb-4 text-brand-slate-600">
              File preview not available for this file type
            </p>
            <a
              :href="document.file_url"
              target="_blank"
              download
              class="inline-block rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              Download {{ document.title }}
            </a>
          </div>
        </div>

        <!-- Version History -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl font-bold text-brand-slate-900">
            Version History
          </h2>

          <div v-if="documentVersions.length > 0" class="space-y-2">
            <div
              v-for="version in documentVersions"
              :key="version.id"
              class="flex items-center justify-between border-b border-brand-slate-200 py-3"
            >
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <span class="font-semibold text-brand-slate-900"
                    >Version {{ version.version }}</span
                  >
                  <span
                    v-if="version.is_current"
                    class="inline-block rounded-sm bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800"
                  >
                    Current
                  </span>
                </div>
                <p class="mt-1 text-sm text-brand-slate-500">
                  {{ formatDate(version.created_at) }}
                </p>
              </div>
              <div class="flex gap-2">
                <a
                  :href="version.file_url"
                  target="_blank"
                  rel="noopener"
                  class="rounded-sm bg-blue-100 px-3 py-1 text-sm text-blue-700 transition hover:bg-blue-200"
                >
                  View
                </a>
                <button
                  v-if="!version.is_current"
                  @click="restoreVersion(version.id)"
                  class="rounded-sm bg-brand-slate-100 px-3 py-1 text-sm text-brand-slate-700 transition hover:bg-brand-slate-200"
                >
                  Restore
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-brand-slate-500">
            <p>No previous versions</p>
          </div>

          <button
            @click="showUploadNewVersion = true"
            class="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            + Upload New Version
          </button>
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-6 text-xl font-bold text-brand-slate-900">
            Edit Document
          </h2>
          <form @submit.prevent="saveDocument" class="space-y-6">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <!-- Title -->
              <div>
                <label
                  for="title"
                  class="mb-1 block text-sm font-medium text-brand-slate-700"
                >
                  Title
                </label>
                <input
                  id="title"
                  v-model="editForm.title"
                  type="text"
                  required
                  class="w-full rounded-lg border border-brand-slate-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- School -->
              <div>
                <label
                  for="school"
                  class="mb-1 block text-sm font-medium text-brand-slate-700"
                >
                  School
                </label>
                <select
                  id="school"
                  v-model="editForm.school_id"
                  class="w-full rounded-lg border border-brand-slate-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
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
                  class="mb-1 block text-sm font-medium text-brand-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  v-model="editForm.description"
                  rows="3"
                  placeholder="Add a description..."
                  class="w-full rounded-lg border border-brand-slate-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-4">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {{ loading ? "Saving..." : "Save Changes" }}
              </button>
              <button
                type="button"
                @click="isEditing = false"
                class="flex-1 rounded-lg bg-brand-slate-200 px-4 py-2 font-semibold text-brand-slate-900 transition hover:bg-brand-slate-300"
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
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div
          class="mx-4 max-h-96 w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        >
          <h3 class="mb-4 text-lg font-bold text-brand-slate-900">
            Share Document
          </h3>

          <!-- Currently Shared Schools -->
          <div
            v-if="(document?.shared_with_schools || []).length > 0"
            class="mb-6"
          >
            <h4 class="mb-3 text-sm font-semibold text-brand-slate-700">
              Shared With
            </h4>
            <div class="space-y-2">
              <div
                v-for="schoolId in document?.shared_with_schools || []"
                :key="schoolId"
                class="flex items-center justify-between rounded-sm bg-blue-50 p-2"
              >
                <span class="text-sm text-brand-slate-900">{{
                  getSchoolNameById(schoolId)
                }}</span>
                <button
                  @click="removeShare(schoolId)"
                  class="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- School Selector -->
          <div class="mb-6">
            <h4 class="mb-3 text-sm font-semibold text-brand-slate-700">
              Add Schools
            </h4>
            <div class="max-h-40 space-y-2 overflow-y-auto">
              <label
                v-for="school in availableSchools"
                :key="school.id"
                class="flex cursor-pointer items-center gap-3 rounded-sm p-2 hover:bg-brand-slate-50"
              >
                <input
                  :checked="selectedSchools.includes(school.id)"
                  @change="toggleSchoolSelection(school.id)"
                  type="checkbox"
                  class="h-4 w-4 rounded-sm"
                />
                <span class="text-sm text-brand-slate-900">{{
                  school.name
                }}</span>
              </label>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              @click="saveSharing"
              :disabled="loading"
              class="flex-1 rounded-lg bg-brand-emerald-600 py-2 font-medium text-white transition hover:bg-brand-emerald-700 disabled:opacity-50"
            >
              {{ loading ? "Saving..." : "Save" }}
            </button>
            <button
              @click="showShareModal = false"
              class="flex-1 rounded-lg bg-brand-slate-200 py-2 font-medium text-brand-slate-900 transition hover:bg-brand-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Document"
      message="Are you sure you want to delete this document? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteDocument"
      @cancel="cancelDeleteDocument"
    />

    <DesignSystemConfirmDialog
      :is-open="isRestoreDialogOpen"
      title="Restore Version"
      message="Restore this version? The current version will be marked as archived."
      confirm-text="Restore"
      cancel-text="Cancel"
      variant="warning"
      @confirm="confirmRestoreVersion"
      @cancel="cancelRestoreVersion"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useSchools } from "~/composables/useSchools";
import { useErrorHandler } from "~/composables/useErrorHandler";
import { useAppToast } from "~/composables/useAppToast";
import VideoPlayer from "~/components/VideoPlayer.vue";
import type { Document } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("DocumentView");

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
const { showToast } = useAppToast();

const isDeleteDialogOpen = ref(false);
const isRestoreDialogOpen = ref(false);
const versionToRestoreId = ref<string | null>(null);
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
    logger.error("Error saving document", err);
  }
};

const handleDeleteDocument = () => {
  isDeleteDialogOpen.value = true;
};

const confirmDeleteDocument = async () => {
  isDeleteDialogOpen.value = false;
  try {
    const success = await deleteDocumentAPI(documentId.value);
    if (success) {
      await router.push("/documents");
    } else {
      logError(new Error("Failed to delete document"));
      showToast(
        "Something went wrong deleting this document. Please try again.",
        "error",
      );
    }
  } catch (err) {
    logError(err);
    showToast(
      "Something went wrong deleting this document. Please try again.",
      "error",
    );
  }
};

const cancelDeleteDocument = () => {
  isDeleteDialogOpen.value = false;
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

const restoreVersion = (versionId: string) => {
  versionToRestoreId.value = versionId;
  isRestoreDialogOpen.value = true;
};

const confirmRestoreVersion = async () => {
  if (!versionToRestoreId.value) return;
  const restoringId = versionToRestoreId.value;
  isRestoreDialogOpen.value = false;
  versionToRestoreId.value = null;
  try {
    // Mark current version as not current
    if (document.value) {
      await updateDocument(document.value.id, { is_current: false });
    }

    // Mark restored version as current
    await updateDocument(restoringId, { is_current: true });

    await fetchDocuments();
    await fetchDocumentVersions();
  } catch (err) {
    logError(err);
    showToast(
      "Something went wrong restoring this version. Please try again.",
      "error",
    );
  }
};

const cancelRestoreVersion = () => {
  isRestoreDialogOpen.value = false;
  versionToRestoreId.value = null;
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
