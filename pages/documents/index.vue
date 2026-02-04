<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-2">
          <h1 data-testid="page-title" class="text-3xl font-bold text-gray-900">
            Documents
          </h1>
          <span class="text-sm text-gray-500"
            >{{ filteredDocuments.length }} of
            {{ documents.length }} total</span
          >
        </div>
        <p class="text-gray-600 mt-1">
          Manage videos, transcripts, and other recruiting documents
        </p>
      </div>

      <!-- Statistics Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-sm text-gray-600 mb-1">Total Documents</p>
          <p class="text-2xl font-bold text-blue-600">{{ documents.length }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-sm text-gray-600 mb-1">Shared Documents</p>
          <p class="text-2xl font-bold text-green-600">
            {{ sharedDocumentsCount }}
          </p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-sm text-gray-600 mb-1">Most Common Type</p>
          <p class="text-2xl font-bold text-purple-600">{{ mostCommonType }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-sm text-gray-600 mb-1">Total Storage</p>
          <p class="text-lg font-bold text-orange-600">Phase 5</p>
        </div>
      </div>

      <!-- Filter Panel with Chips -->
      <FilterPanel>
        <template #chips>
          <DesignSystemFilterChips
            :configs="filterConfigs"
            :filter-values="
              Object.fromEntries(Object.entries(filterValues.value || {}))
            "
            :has-active-filters="hasActiveFilters"
            :active-filter-count="activeFilterCount"
            :get-display-value="getFilterDisplayValue"
            @remove-filter="handleRemoveFilter"
            @clear-all="clearFilters"
          />
        </template>

        <template #filter>
          <div class="bg-white p-4 rounded-lg shadow">
            <UniversalFilter
              :configs="filterConfigs"
              :filter-values="
                Object.fromEntries(Object.entries(filterValues.value || {}))
              "
              :presets="presets"
              :filtered-count="filteredDocuments.length"
              :has-active-filters="hasActiveFilters"
              @update:filter="handleFilterUpdate"
              @clear-filters="clearFilters"
              @save-preset="handleSavePreset"
              @load-preset="handleLoadPreset"
            />

            <!-- Sort Options -->
            <div class="mt-6 pt-6 border-t">
              <label
                for="sort"
                class="text-sm font-medium text-gray-700 mb-2 block"
                >Sort By</label
              >
              <select
                v-model="sortBy"
                id="sort"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="type">Type</option>
                <option value="shared">Most Shared</option>
              </select>
            </div>
          </div>
        </template>
      </FilterPanel>

      <!-- View Toggle & Upload Button -->
      <div class="flex gap-4 mb-8">
        <div class="flex gap-2">
          <button
            @click="viewMode = 'grid'"
            :class="[
              'px-3 py-2 rounded-lg text-sm font-medium transition',
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300',
            ]"
          >
            ⊞ Grid
          </button>
          <button
            @click="viewMode = 'list'"
            :class="[
              'px-3 py-2 rounded-lg text-sm font-medium transition',
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300',
            ]"
          >
            ☰ List
          </button>
        </div>

        <!-- Upload Button -->
        <button
          @click="showUploadForm = !showUploadForm"
          class="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          {{ showUploadForm ? "Hide Form" : "+ Upload Document" }}
        </button>
      </div>

      <!-- Upload Form -->
      <div v-if="showUploadForm" class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Upload Document</h2>
        <form @submit.prevent="handleUpload" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Document Type -->
            <div>
              <label
                for="type"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Document Type <span class="text-red-600">*</span>
              </label>
              <select
                id="type"
                v-model="newDoc.type"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                <option value="highlight_video">Highlight Video</option>
                <option value="transcript">Transcript</option>
                <option value="resume">Resume</option>
                <option value="rec_letter">Recommendation Letter</option>
                <option value="questionnaire">Questionnaire</option>
                <option value="stats_sheet">Stats Sheet</option>
              </select>
            </div>

            <!-- Title -->
            <div>
              <label
                for="title"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Title <span class="text-red-600">*</span>
              </label>
              <input
                id="title"
                v-model="newDoc.title"
                type="text"
                required
                placeholder="e.g., Freshman Highlights 2025"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- School (Optional) -->
            <div>
              <label
                for="school"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                School (Optional)
              </label>
              <select
                id="school"
                v-model="newDoc.schoolId"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">General / Not School-Specific</option>
                <option
                  v-for="school in schools"
                  :key="school.id"
                  :value="school.id"
                >
                  {{ school.name }}
                </option>
              </select>
            </div>

            <!-- Version -->
            <div>
              <label
                for="version"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Version (Optional)
              </label>
              <input
                id="version"
                v-model.number="newDoc.version"
                type="number"
                min="1"
                placeholder="1"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Description -->
          <div>
            <label
              for="description"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              v-model="newDoc.description"
              rows="3"
              placeholder="Additional details about this document..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- File Upload -->
          <div>
            <label
              for="file"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Select File
            </label>
            <div class="relative">
              <input
                id="file"
                ref="fileInput"
                type="file"
                @change="handleFileSelect"
                class="sr-only"
              />
              <button
                type="button"
                @click="fileInput?.click()"
                :disabled="!newDoc.type"
                class="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ selectedFileName || "Click to select file" }}
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Allowed formats: {{ allowedFileTypes }}
            </p>
          </div>

          <!-- Buttons -->
          <div class="flex gap-4">
            <button
              type="submit"
              :disabled="
                loading || !newDoc.type || !newDoc.title || !selectedFile
              "
              class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {{ loading ? "Uploading..." : "Upload" }}
            </button>
            <button
              type="button"
              @click="showUploadForm = false"
              class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading && documents.length === 0" class="text-center py-12">
        <p class="text-gray-600">Loading documents...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="documents.length === 0"
        class="bg-white rounded-lg shadow p-12 text-center"
      >
        <p class="text-gray-600 mb-2">No documents yet</p>
        <p class="text-sm text-gray-500">
          Upload videos, transcripts, and other documents to share with coaches
        </p>
      </div>

      <!-- Documents View -->
      <div v-else>
        <!-- Grid View -->
        <div
          v-if="viewMode === 'grid'"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <DocumentCard
            v-for="doc in sortedAndFilteredDocuments"
            :key="doc.id"
            :document="doc"
            :school-name="getSchoolName(doc.school_id)"
            @delete="handleDeleteDocument"
          />
        </div>

        <!-- List View -->
        <div v-else class="space-y-2">
          <div
            v-for="doc in sortedAndFilteredDocuments"
            :key="doc.id"
            class="bg-white rounded-lg shadow p-4 hover:shadow-md transition flex items-center justify-between"
          >
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <span class="text-lg">
                  {{ getTypeEmoji(doc.type) }}
                </span>
                <div>
                  <p class="font-semibold text-gray-900">{{ doc.title }}</p>
                  <p class="text-sm text-gray-600">
                    {{ getSchoolName(doc.school_id) }} • v{{
                      doc.version || 1
                    }}
                    • {{ formatDate(doc.created_at) }}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span
                v-if="(doc.shared_with_schools || []).length > 0"
                class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded"
              >
                Shared: {{ (doc.shared_with_schools || []).length }}
              </span>
              <NuxtLink
                to="/documents/create"
                data-testid="add-document-button"
                class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
              >
                <PlusIcon class="w-5 h-5" />
                Add Document
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from "vue";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useSchools } from "~/composables/useSchools";
import { useUniversalFilter } from "~/composables/useUniversalFilter";
import { useFormValidation } from "~/composables/useFormValidation";
import { useErrorHandler } from "~/composables/useErrorHandler";
import FilterPanel from "~/components/Common/FilterPanel.vue";
import UniversalFilter from "~/components/Common/UniversalFilter.vue";
import { useUserStore } from "~/stores/user";
import type { Document } from "~/types/models";
import type { FilterConfig } from "~/types/filters";
import type { Database } from "~/types/database";

type DocumentType = Database["public"]["Enums"]["document_type"];

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const {
  documents,
  loading,
  isUploading,
  error,
  uploadError,
  fetchDocuments,
  uploadDocument,
  deleteDocument: deleteDocumentAPI,
} = useDocumentsConsolidated();
const { schools: allSchools, fetchSchools } = useSchools();
const { validateFile, fileErrors } = useFormValidation();
const { getErrorMessage, logError } = useErrorHandler();

const showUploadForm = ref(false);
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const schools = ref<any[]>([]);
const sortBy = ref("newest");
const viewMode = ref<"grid" | "list">("grid");

const newDoc = reactive({
  type: "",
  title: "",
  description: "",
  schoolId: "",
  version: 1,
});

// Filter configurations
const filterConfigs = computed<FilterConfig[]>(() => [
  {
    type: "text",
    field: "search",
    label: "Search",
    placeholder: "Title or description...",
  },
  {
    type: "select",
    field: "type",
    label: "Type",
    options: [
      { value: "highlight_video", label: "🎥 Highlight Video" },
      { value: "transcript", label: "📄 Transcript" },
      { value: "resume", label: "📄 Resume" },
      { value: "rec_letter", label: "💌 Rec Letter" },
      { value: "questionnaire", label: "📝 Questionnaire" },
      { value: "stats_sheet", label: "📊 Stats Sheet" },
    ],
  },
  {
    type: "select",
    field: "schoolId",
    label: "School",
    options: [
      { value: "general", label: "General (No School)" },
      ...schools.value.map((s) => ({ value: s.id, label: s.name })),
    ],
  },
  {
    type: "select",
    field: "shared",
    label: "Status",
    options: [
      { value: "true", label: "Shared" },
      { value: "false", label: "Not Shared" },
    ],
  },
]);

// Initialize filter composable
const {
  filterValues,
  activeFilterCount,
  hasActiveFilters,
  presets: readonlyPresets,
  setFilterValue,
  clearFilters,
  savePreset,
  loadPreset,
  getFilterDisplayValue,
} = useUniversalFilter(documents, filterConfigs, {
  storageKey: "documents-filters",
});

// Convert readonly presets to mutable array
const presets = computed(() => [...readonlyPresets.value]);

// Filter event handlers
const handleFilterUpdate = (field: string, value: any) => {
  setFilterValue(field, value);
};

const handleRemoveFilter = (field: string) => {
  setFilterValue(field, null);
};

const handleSavePreset = (name: string, description?: string) => {
  savePreset(name, description);
};

const handleLoadPreset = (presetId: string) => {
  loadPreset(presetId);
};

const filteredDocuments = computed(() => {
  return documents.value.filter((doc: Document) => {
    // Search filter
    const searchTerm = filterValues.value.search;
    if (searchTerm) {
      const query = String(searchTerm).toLowerCase();
      const titleMatch = doc.title.toLowerCase().includes(query);
      const descriptionMatch =
        doc.description?.toLowerCase().includes(query) || false;
      if (!titleMatch && !descriptionMatch) {
        return false;
      }
    }

    // Type filter
    const typeFilter = filterValues.value.type;
    if (typeFilter && doc.type !== typeFilter) {
      return false;
    }

    // School filter
    const schoolIdFilter = filterValues.value.schoolId;
    if (schoolIdFilter) {
      if (schoolIdFilter === "general") {
        if (doc.school_id) return false;
      } else if (doc.school_id !== schoolIdFilter) {
        return false;
      }
    }

    // Shared status filter
    const sharedFilter = filterValues.value.shared;
    if (sharedFilter !== undefined && sharedFilter !== null) {
      const isShared =
        doc.shared_with_schools && doc.shared_with_schools.length > 0;
      const shouldBeShared = sharedFilter === "true";
      if (isShared !== shouldBeShared) {
        return false;
      }
    }

    return true;
  });
});

const sortedAndFilteredDocuments = computed(() => {
  const sorted = [...filteredDocuments.value];

  sorted.sort((a, b) => {
    if (sortBy.value === "newest") {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    } else if (sortBy.value === "oldest") {
      return (
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
    } else if (sortBy.value === "name") {
      return a.title.localeCompare(b.title);
    } else if (sortBy.value === "type") {
      return a.type.localeCompare(b.type);
    } else if (sortBy.value === "shared") {
      const aCount = (a.shared_with_schools || []).length;
      const bCount = (b.shared_with_schools || []).length;
      return bCount - aCount;
    }
    return 0;
  });

  return sorted;
});

const sharedDocumentsCount = computed(() => {
  return documents.value.filter(
    (doc: Document) =>
      doc.shared_with_schools && doc.shared_with_schools.length > 0,
  ).length;
});

const mostCommonType = computed(() => {
  const typeCounts = documents.value.reduce(
    (acc: Record<string, number>, doc: Document) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (Object.keys(typeCounts).length === 0) return "N/A";

  const mostCommon = Object.entries(typeCounts).sort(
    (a, b) => (b[1] as number) - (a[1] as number),
  )[0] as [string, number] | undefined;

  if (!mostCommon) return "N/A";

  const typeNames: Record<string, string> = {
    highlight_video: "Video",
    transcript: "Transcript",
    resume: "Resume",
    rec_letter: "Rec Letter",
    questionnaire: "Form",
    stats_sheet: "Stats",
  };

  return typeNames[mostCommon[0]] || mostCommon[0];
});

const allowedFileTypes = computed(() => {
  const typeExtensions: Record<string, string[]> = {
    highlight_video: [".mp4", ".mov", ".avi"],
    transcript: [".pdf", ".txt"],
    resume: [".pdf", ".doc", ".docx"],
    rec_letter: [".pdf"],
    questionnaire: [".pdf", ".doc", ".docx"],
    stats_sheet: [".csv", ".xls", ".xlsx"],
  };

  if (!newDoc.type || !typeExtensions[newDoc.type]) {
    return "Select a document type first";
  }

  return typeExtensions[newDoc.type].join(", ");
});

const getTypeEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    highlight_video: "🎥",
    transcript: "📄",
    resume: "📋",
    rec_letter: "💌",
    questionnaire: "📝",
    stats_sheet: "📊",
  };
  return emojis[type] || "📎";
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getSchoolName = (schoolId: string | null | undefined): string => {
  if (!schoolId) return "General";
  return schools.value.find((s) => s.id === schoolId)?.name || "Unknown";
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];

    // Validate file
    try {
      validateFile(file, newDoc.type as DocumentType);
      selectedFile.value = file;
      selectedFileName.value = file.name;
    } catch (err) {
      console.error(
        "File validation failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
      selectedFile.value = null;
      selectedFileName.value = "";
    }
  }
};

const handleUpload = async () => {
  if (!selectedFile.value) return;

  try {
    const result = await uploadDocument(
      selectedFile.value,
      newDoc.type as DocumentType,
      newDoc.title,
      {
        description: newDoc.description || undefined,
        school_id: newDoc.schoolId || undefined,
        version: newDoc.version || 1,
      } as unknown as string,
    );

    if (result.success) {
      // Reset form
      newDoc.type = "";
      newDoc.title = "";
      newDoc.description = "";
      newDoc.schoolId = "";
      newDoc.version = 1;
      selectedFile.value = null;
      selectedFileName.value = "";
      showUploadForm.value = false;
    } else {
      console.error("Upload failed:", uploadError.value);
    }
  } catch (err) {
    console.error("Failed to upload document:", err);
  }
};

const handleDeleteDocument = async (docId: string) => {
  if (confirm("Delete this document?")) {
    try {
      const success = await deleteDocumentAPI(docId);
      if (!success) {
        const message = getErrorMessage(new Error("Failed to delete document"));
        error.value = message;
      }
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = message;
      logError(err);
    }
  }
};

onMounted(async () => {
  if (!userStore.user) return;
  try {
    await fetchSchools();
    schools.value = allSchools.value;
    await fetchDocuments();
  } catch (err) {
    console.error("Error loading data:", err);
  }
});
</script>
