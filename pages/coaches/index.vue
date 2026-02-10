<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
    >
      Skip to main content
    </a>

    <!-- Global Navigation -->

    <!-- Timeline Status Snippet -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="coaches" />
    </div>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">Coaches</h1>
            <p class="text-slate-600">
              {{ filteredCoaches.length }} coach{{
                filteredCoaches.length !== 1 ? "es" : ""
              }}
              found
            </p>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink
              to="/coaches/new"
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2 shadow-sm"
            >
              <PlusIcon class="w-4 h-4" />
              Add Coach
            </NuxtLink>
            <button
              v-if="filteredCoaches.length > 0"
              @click="handleExportCSV"
              :disabled="exportLoading"
              :aria-busy="exportLoading"
              aria-label="Export coaches to CSV"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
              {{ exportLoading ? "Exporting..." : "CSV" }}
            </button>
            <button
              v-if="filteredCoaches.length > 0"
              @click="handleExportPDF"
              :disabled="exportLoading"
              :aria-busy="exportLoading"
              aria-label="Export coaches to PDF"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
              {{ exportLoading ? "Exporting..." : "PDF" }}
            </button>

            <!-- Export Status Announcement -->
            <div
              v-if="exportMessage"
              role="status"
              aria-live="polite"
              class="text-sm mt-2 text-green-700"
            >
              {{ exportMessage }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <main
      id="main-content"
      class="max-w-7xl mx-auto px-4 sm:px-6 py-8"
      :aria-busy="loading"
    >
      <!-- Filter Bar -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6"
      >
        <CoachFilters
          :filter-values="filterValues"
          :sort-by="sortBy"
          @update:filter="handleFilterUpdate"
          @update:sort="sortBy = $event"
        />

        <ActiveCoachFilterChips
          :filter-values="filterValues"
          :has-active-filters="hasActiveFilters"
          :active-filter-count="activeFilterCount"
          :filtered-count="filteredCoaches.length"
          @remove:filter="handleFilterUpdate($event, null)"
          @clear:all="clearFilters"
        />
      </div>

      <!-- Loading State -->
      <div
        v-if="loading && allCoaches.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
          aria-hidden="true"
        ></div>
        <p class="text-slate-600">Loading coaches...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border-l-4 border-red-600 p-4 mb-6"
        role="alert"
        aria-live="assertive"
      >
        <div class="flex items-start gap-3">
          <svg
            class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 class="font-semibold text-red-800 mb-1">
              Error loading coaches
            </h3>
            <p class="text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="allCoaches.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
        role="status"
      >
        <UserGroupIcon
          class="w-12 h-12 text-slate-400 mx-auto mb-4"
          aria-hidden="true"
        />
        <h2 class="text-slate-900 font-semibold mb-2">No coaches found</h2>
        <p class="text-slate-700">Add coaches through school detail pages</p>
      </div>

      <!-- No Results State -->
      <div
        v-else-if="filteredCoaches.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
        role="status"
      >
        <MagnifyingGlassIcon
          class="w-12 h-12 text-slate-400 mx-auto mb-4"
          aria-hidden="true"
        />
        <h2 class="text-slate-900 font-semibold mb-2">
          No coaches match your filters
        </h2>
        <p class="text-slate-700">Try adjusting your search or filters</p>
      </div>

      <!-- Result Count Announcement -->
      <div
        v-if="filteredCoaches.length > 0"
        class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p class="text-sm text-blue-900">
          {{ filteredCoaches.length }} coach{{
            filteredCoaches.length !== 1 ? "es" : ""
          }}
          found
        </p>
      </div>

      <!-- Coaches Grid -->
      <ul
        v-if="filteredCoaches.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <li
          v-for="coach in filteredCoaches"
          :key="coach.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
        >
          <!-- Coach Header -->
          <div class="p-4 border-b border-slate-100">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold"
                >
                  {{ getInitials(coach) }}
                </div>
                <div>
                  <h3 class="font-semibold text-slate-900">
                    {{ coach.first_name }} {{ coach.last_name }}
                  </h3>
                  <p class="text-sm text-slate-500">
                    {{ getSchoolName(coach.school_id, schools) }}
                  </p>
                </div>
              </div>
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getRoleBadgeClass(coach.role)"
                :aria-label="`Coach role: ${getRoleLabel(coach.role)}`"
              >
                {{ getRoleLabel(coach.role) }}
              </span>
            </div>
          </div>

          <!-- Coach Info -->
          <div class="p-4 space-y-3">
            <!-- Contact Info -->
            <div v-if="coach.email" class="flex items-center gap-2 text-sm">
              <EnvelopeIcon class="w-4 h-4 text-slate-400" />
              <span class="text-slate-600 truncate">{{ coach.email }}</span>
            </div>
            <div v-if="coach.phone" class="flex items-center gap-2 text-sm">
              <PhoneIcon class="w-4 h-4 text-slate-400" />
              <span class="text-slate-600">{{ coach.phone }}</span>
            </div>

            <!-- Responsiveness -->
            <div class="flex items-center justify-between">
              <label
                :for="`coach-responsiveness-${coach.id}`"
                class="text-sm text-slate-500"
              >
                Responsiveness
              </label>
              <div class="flex items-center gap-2">
                <div
                  :id="`coach-responsiveness-${coach.id}`"
                  class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-300"
                  role="progressbar"
                  :aria-valuenow="coach.responsiveness_score || 0"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="`${coach.responsiveness_score || 0}% responsiveness score`"
                >
                  <div
                    class="h-full rounded-full transition-all relative"
                    :class="
                      getResponsivenessBarClass(coach.responsiveness_score || 0)
                    "
                    :style="{ width: `${coach.responsiveness_score || 0}%` }"
                    aria-hidden="true"
                  >
                    <!-- Pattern for color-blind accessibility -->
                    <div
                      class="h-full opacity-20"
                      style="
                        background-image: repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 2px,
                          rgba(0, 0, 0, 0.1) 2px,
                          rgba(0, 0, 0, 0.1) 4px
                        );
                      "
                    ></div>
                  </div>
                </div>
                <span
                  class="text-sm font-medium tabular-nums"
                  :class="
                    getResponsivenessTextClass(coach.responsiveness_score || 0)
                  "
                  aria-hidden="true"
                >
                  {{ coach.responsiveness_score || 0 }}%
                </span>
              </div>
            </div>

            <!-- Last Contact -->
            <div
              v-if="coach.last_contact_date"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-slate-500">Last contact</span>
              <time :datetime="coach.last_contact_date" class="text-slate-700">
                {{ formatCoachDate(coach.last_contact_date) }}
                ({{ getDaysAgoExact(coach.last_contact_date) }})
              </time>
            </div>
          </div>

          <!-- Actions -->
          <div
            class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between"
          >
            <div class="flex items-center gap-1">
              <button
                v-if="coach.email"
                @click="handleCoachAction('email', coach)"
                :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
                class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <EnvelopeIcon class="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                v-if="coach.phone"
                @click="handleCoachAction('text', coach)"
                :aria-label="`Send text message to ${coach.first_name} ${coach.last_name}`"
                class="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <ChatBubbleLeftIcon class="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                v-if="coach.twitter_handle"
                @click="handleCoachAction('tweet', coach)"
                :aria-label="`View ${coach.first_name}'s Twitter profile`"
                class="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                <svg
                  class="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
              </button>
              <button
                v-if="coach.instagram_handle"
                @click="handleCoachAction('instagram', coach)"
                :aria-label="`View ${coach.first_name}'s Instagram profile`"
                class="p-2 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
              >
                <svg
                  class="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                  />
                </svg>
              </button>
              <button
                @click="openDeleteModal(coach)"
                data-test="coach-delete-btn"
                :aria-label="`Delete ${coach.first_name} ${coach.last_name}`"
                class="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
            <button
              @click="handleCoachAction('view', coach)"
              class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              View
            </button>
          </div>
        </li>
      </ul>
    </main>

    <!-- Communication Panel Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPanel && selectedCoach"
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          @click="showPanel = false"
          aria-hidden="true"
          role="presentation"
        >
          <div
            class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            @click.stop
            role="dialog"
            aria-modal="true"
            aria-labelledby="communication-panel-title"
            @keydown.escape="showPanel = false"
          >
            <div
              class="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl"
            >
              <h2
                id="communication-panel-title"
                class="text-xl font-semibold text-slate-900"
              >
                Quick Communication
              </h2>
              <button
                @click="showPanel = false"
                aria-label="Close Quick Communication dialog"
                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <XMarkIcon class="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div class="p-6">
              <CommunicationPanel
                :coach="selectedCoach"
                :school="selectedCoachSchool"
                :initial-type="communicationType"
                @close="showPanel = false"
                @interaction-logged="handleCoachInteractionLogged"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      :is-open="deleteModalOpen"
      :item-name="
        selectedDeleteCoach
          ? `${selectedDeleteCoach.first_name} ${selectedDeleteCoach.last_name}`
          : ''
      "
      item-type="coach"
      :is-loading="isDeleting"
      @cancel="closeDeleteModal"
      @confirm="deleteCoach"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from "vue";
import { navigateTo } from "#app";
import { useSupabase } from "~/composables/useSupabase";
import { useCommunication } from "~/composables/useCommunication";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { useCoaches } from "~/composables/useCoaches";
import { useCoachPageFilters } from "~/composables/useCoachPageFilters";
import { useCoachExport } from "~/composables/useCoachExport";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";
import Header from "~/components/Header.vue";
import StatusSnippet from "~/components/Timeline/StatusSnippet.vue";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";
import CoachFilters from "~/components/Coach/CoachFilters.vue";
import ActiveCoachFilterChips from "~/components/Coach/ActiveCoachFilterChips.vue";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  PlusIcon,
} from "@heroicons/vue/24/outline";
import { getRoleLabel } from "~/utils/coachLabels";
import {
  formatCoachDate,
  getDaysAgoExact,
  getRoleBadgeClass,
  getResponsivenessBarClass,
  getResponsivenessTextClass,
} from "~/utils/coachFormatters";
import {
  getInitials,
  getSchoolById,
  getSchoolName,
} from "~/utils/coachHelpers";
import type { Coach, School } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const supabase = useSupabase();
const userStore = useUserStore();
// Inject family context provided at app.vue level (with singleton fallback)
const activeFamily = (inject<UseActiveFamilyReturn>("activeFamily") ||
  useFamilyContext()) as UseActiveFamilyReturn;
const { activeFamilyId } = activeFamily;
const {
  showPanel,
  selectedCoach,
  communicationType,
  openCommunication,
  handleInteractionLogged,
} = useCommunication();
const { smartDelete } = useCoaches();

const allCoaches = ref<Coach[]>([]);
const schools = ref<School[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const sortBy = ref("name");

// Use filter composable for stateful filter management
const {
  filterValues,
  filteredCoaches,
  hasActiveFilters,
  activeFilterCount,
  handleFilterUpdate,
  clearFilters,
} = useCoachPageFilters(allCoaches, schools, sortBy);

// Use export composable for CSV/PDF exports
const { handleExportCSV, handleExportPDF } = useCoachExport({
  filteredCoaches,
  schools,
});

// Delete modal state
const deleteModalOpen = ref(false);
const selectedDeleteCoach = ref<Coach | null>(null);
const isDeleting = ref(false);

// Export state
const exportLoading = ref(false);
const exportMessage = ref("");

const selectedCoachSchool = computed(() => {
  return selectedCoach.value
    ? getSchoolById(selectedCoach.value.school_id, schools.value)
    : undefined;
});

const handleCoachInteractionLogged = async (interactionData: any) => {
  try {
    await handleInteractionLogged(interactionData, fetchData);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to log interaction";
  }
};

const handleCoachAction = async (action: string, coach: Coach) => {
  switch (action) {
    case "email":
      openCommunication(coach, "email");
      break;
    case "text":
      openCommunication(coach, "text");
      break;
    case "tweet":
      if (coach.twitter_handle) {
        const handle = coach.twitter_handle.replace("@", "");
        window.open(`https://twitter.com/${handle}`, "_blank");
      }
      break;
    case "instagram":
      if (coach.instagram_handle) {
        const handle = coach.instagram_handle.replace("@", "");
        window.open(`https://instagram.com/${handle}`, "_blank");
      }
      break;
    case "view":
      await navigateTo(`/coaches/${coach.id}`);
      break;
  }
};

// Export functions now provided by useCoachExport composable

const openDeleteModal = (coach: Coach) => {
  selectedDeleteCoach.value = coach;
  deleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  deleteModalOpen.value = false;
  selectedDeleteCoach.value = null;
};

const deleteCoach = async () => {
  if (!selectedDeleteCoach.value?.id) return;

  isDeleting.value = true;
  try {
    await smartDelete(selectedDeleteCoach.value.id);
    // Remove coach from local list
    allCoaches.value = allCoaches.value.filter(
      (c) => c.id !== selectedDeleteCoach.value?.id,
    );
    closeDeleteModal();
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete coach";
    error.value = message;
    console.error("Failed to delete coach:", err);
  } finally {
    isDeleting.value = false;
  }
};

const fetchData = async () => {
  if (!userStore.user || !activeFamilyId.value) return;

  loading.value = true;
  error.value = null;

  try {
    // Fetch all schools for this family
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("schools")
      .select("*")
      .eq("family_unit_id", activeFamilyId.value);

    if (schoolsError) throw schoolsError;

    schools.value = schoolsData || [];

    // Fetch coaches for all family's schools
    if (schools.value.length > 0) {
      const schoolIds = schools.value.map((s) => s.id);
      const { data: coachesData, error: coachesError } = await supabase
        .from("coaches")
        .select("*")
        .in("school_id", schoolIds)
        .order("last_name", { ascending: true });

      if (coachesError) throw coachesError;
      allCoaches.value = coachesData || [];
    } else {
      allCoaches.value = [];
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load coaches";
    error.value = message;
    console.error("Error loading coaches:", err);
  } finally {
    loading.value = false;
  }
};

// Re-fetch coaches when active athlete changes (for parents switching between children)
watch(
  () => activeFamilyId.value,
  async (newFamilyId) => {
    if (newFamilyId) {
      console.debug(
        `[Coaches] Family changed: familyId=${newFamilyId}, re-fetching coaches`,
      );
      await fetchData();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await fetchData();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
