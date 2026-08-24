<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <PageHeader
      title="Documents"
      description="Manage videos, transcripts, and other recruiting documents"
    >
      <template #actions>
        <NuxtLink
          to="/documents/add"
          class="flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
        >
          <UIcon name="i-heroicons-plus" class="h-4 w-4" />
          + Add Document
        </NuxtLink>
      </template>
    </PageHeader>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <!-- Statistics Row -->
      <div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-lg bg-white p-4 shadow-sm">
          <p class="mb-1 text-sm text-gray-600">Total Documents</p>
          <p class="text-2xl font-bold text-blue-600">{{ documents.length }}</p>
        </div>
        <div class="rounded-lg bg-white p-4 shadow-sm">
          <p class="mb-1 text-sm text-gray-600">Shared Documents</p>
          <p class="text-2xl font-bold text-green-600">
            {{ sharedDocumentsCount }}
          </p>
        </div>
        <div class="rounded-lg bg-white p-4 shadow-sm">
          <p class="mb-1 text-sm text-gray-600">Most Common Type</p>
          <p class="text-2xl font-bold text-purple-600">{{ mostCommonType }}</p>
        </div>
        <div class="rounded-lg bg-white p-4 shadow-sm">
          <p class="mb-1 text-sm text-gray-600">Total Storage</p>
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
          <div class="rounded-lg bg-white p-4 shadow-sm">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <!-- Search -->
              <div>
                <label
                  for="search"
                  class="mb-2 block text-sm font-medium text-gray-700"
                  >Search</label
                >
                <input
                  id="search"
                  :value="searchValue"
                  @input="
                    handleFilterUpdate(
                      'search',
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                  type="text"
                  placeholder="Title or description..."
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Type -->
              <div>
                <label
                  for="type"
                  class="mb-2 block text-sm font-medium text-gray-700"
                  >Type</label
                >
                <select
                  id="type"
                  :value="typeValue"
                  @change="
                    handleFilterUpdate(
                      'type',
                      ($event.target as HTMLSelectElement).value || null,
                    )
                  "
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- All --</option>
                  <option value="highlight_video">🎥 Highlight Video</option>
                  <option value="transcript">📄 Transcript</option>
                  <option value="resume">📄 Resume</option>
                  <option value="rec_letter">💌 Rec Letter</option>
                  <option value="questionnaire">📝 Questionnaire</option>
                  <option value="stats_sheet">📊 Stats Sheet</option>
                </select>
              </div>

              <!-- School -->
              <div>
                <label
                  for="schoolId"
                  class="mb-2 block text-sm font-medium text-gray-700"
                  >School</label
                >
                <select
                  id="schoolId"
                  :value="schoolIdValue"
                  @change="
                    handleFilterUpdate(
                      'schoolId',
                      ($event.target as HTMLSelectElement).value || null,
                    )
                  "
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- All --</option>
                  <option value="general">General (No School)</option>
                  <option
                    v-for="school in schools"
                    :key="school.id"
                    :value="school.id"
                  >
                    {{ school.name }}
                  </option>
                </select>
              </div>

              <!-- Status -->
              <div>
                <label
                  for="shared"
                  class="mb-2 block text-sm font-medium text-gray-700"
                  >Status</label
                >
                <select
                  id="shared"
                  :value="sharedValue"
                  @change="
                    handleFilterUpdate(
                      'shared',
                      ($event.target as HTMLSelectElement).value || null,
                    )
                  "
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- All --</option>
                  <option value="true">Shared</option>
                  <option value="false">Not Shared</option>
                </select>
              </div>

              <!-- Sort By -->
              <div>
                <label
                  for="sort"
                  class="mb-2 block text-sm font-medium text-gray-700"
                  >Sort By</label
                >
                <select
                  v-model="sortBy"
                  id="sort"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="type">Type</option>
                  <option value="shared">Most Shared</option>
                </select>
              </div>
            </div>
          </div>
        </template>
      </FilterPanel>

      <!-- View Toggle -->
      <div class="mb-8 flex gap-2">
        <button
          @click="viewMode = 'grid'"
          :class="[
            'rounded-lg px-3 py-2 text-sm font-medium transition',
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
            'rounded-lg px-3 py-2 text-sm font-medium transition',
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300',
          ]"
        >
          ☰ List
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading && documents.length === 0" class="py-12 text-center">
        <p class="text-gray-600">Loading documents...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="documents.length === 0"
        class="rounded-lg bg-white p-12 text-center shadow-sm"
      >
        <p class="mb-2 text-gray-600">No documents yet</p>
        <p class="text-sm text-gray-500">
          Upload videos, transcripts, and other documents to share with coaches
        </p>
      </div>

      <!-- Documents View -->
      <div v-else>
        <!-- Grid View -->
        <div
          v-if="viewMode === 'grid'"
          class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          <DocumentCard
            v-for="doc in sortedAndFilteredDocuments"
            :key="doc.id"
            v-memo="[doc.updated_at]"
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
            v-memo="[doc.updated_at]"
            class="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md"
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
                class="rounded-sm bg-green-100 px-2 py-1 text-xs text-green-700"
              >
                Shared: {{ (doc.shared_with_schools || []).length }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from "vue";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useSchools } from "~/composables/useSchools";
import { useUniversalFilter } from "~/composables/useUniversalFilter";
import { useFormValidation } from "~/composables/useFormValidation";
import { useErrorHandler } from "~/composables/useErrorHandler";
import { useAppToast } from "~/composables/useAppToast";
import FilterPanel from "~/components/FilterPanel.vue";
import UniversalFilter from "~/components/UniversalFilter.vue";
import { useUserStore } from "~/stores/user";
import type { Document } from "~/types/models";
import type { FilterConfig } from "~/types/filters";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("DocumentsList");

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const {
  documents,
  loading,
  error,
  fetchDocuments,
  deleteDocument: deleteDocumentAPI,
} = useDocumentsConsolidated();
const { schools: allSchools, fetchSchools } = useSchools();
const { getErrorMessage, logError } = useErrorHandler();
const { showToast } = useAppToast();

const schools = ref<any[]>([]);
const sortBy = ref("newest");
const viewMode = ref<"grid" | "list">("grid");

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

// Computed helpers for type-safe filter access
const searchValue = computed(() => String(filterValues.value?.search || ""));
const typeValue = computed(() => String(filterValues.value?.type || ""));
const schoolIdValue = computed(() =>
  String(filterValues.value?.schoolId || ""),
);
const sharedValue = computed(() => String(filterValues.value?.shared || ""));

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

// DocumentCard already gates deletion behind its own confirmation dialog
// and only emits `delete` after the user confirms once — do not add a
// second confirmation here.
const handleDeleteDocument = async (docId: string) => {
  try {
    const success = await deleteDocumentAPI(docId);
    if (!success) {
      const message = getErrorMessage(new Error("Failed to delete document"));
      error.value = message;
      showToast(
        "Something went wrong deleting this document. Please try again.",
        "error",
      );
    }
  } catch (err) {
    const message = getErrorMessage(err);
    error.value = message;
    logError(err);
    showToast(
      "Something went wrong deleting this document. Please try again.",
      "error",
    );
  }
};

onMounted(async () => {
  if (!userStore.user) return;
  try {
    await fetchSchools();
    schools.value = allSchools.value;
    await fetchDocuments();
  } catch (err) {
    logger.error("Error loading data", err);
  }
});
</script>
