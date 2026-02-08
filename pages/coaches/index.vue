<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
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
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              CSV
            </button>
            <button
              v-if="filteredCoaches.length > 0"
              @click="handleExportPDF"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Filter Bar -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Search</label
            >
            <div class="relative">
              <MagnifyingGlassIcon
                class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                :value="filterValues.get('search') || ''"
                @input="
                  handleFilterUpdate(
                    'search',
                    ($event.target as HTMLInputElement).value,
                  )
                "
                placeholder="Name, email, phone..."
                class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <!-- Role -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Role</label
            >
            <select
              :value="filterValues.get('role') || ''"
              @change="
                handleFilterUpdate(
                  'role',
                  ($event.target as HTMLSelectElement).value || null,
                )
              "
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="head">Head Coach</option>
              <option value="assistant">Assistant Coach</option>
              <option value="recruiting">Recruiting Coordinator</option>
            </select>
          </div>

          <!-- Last Contact -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Last Contact</label
            >
            <select
              :value="filterValues.get('lastContact') || ''"
              @change="
                handleFilterUpdate(
                  'lastContact',
                  ($event.target as HTMLSelectElement).value || null,
                )
              "
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <!-- Responsiveness -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Responsiveness</label
            >
            <select
              :value="filterValues.get('responsiveness') || ''"
              @change="
                handleFilterUpdate(
                  'responsiveness',
                  ($event.target as HTMLSelectElement).value || null,
                )
              "
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="high">High (75%+)</option>
              <option value="medium">Medium (50-74%)</option>
              <option value="low">Low (&lt;50%)</option>
            </select>
          </div>

          <!-- Sort -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Sort By</label
            >
            <select
              v-model="sortBy"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Last Name (A-Z)</option>
              <option value="school">School (A-Z)</option>
              <option value="last-contacted">Last Contacted</option>
              <option value="responsiveness">Responsiveness</option>
              <option value="role">Role</option>
            </select>
          </div>
        </div>

        <!-- Active Filters -->
        <div
          v-if="hasActiveFilters"
          class="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 flex-wrap"
        >
          <span class="text-sm text-slate-500">Active filters:</span>
          <button
            v-if="filterValues.get('search')"
            @click="handleFilterUpdate('search', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            Search: {{ filterValues.get("search") }}
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            v-if="filterValues.get('role')"
            @click="handleFilterUpdate('role', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            Role: {{ getRoleLabel(filterValues.get("role") as string) }}
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            v-if="filterValues.get('lastContact')"
            @click="handleFilterUpdate('lastContact', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            Last {{ filterValues.get("lastContact") }} days
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            v-if="filterValues.get('responsiveness')"
            @click="handleFilterUpdate('responsiveness', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            {{
              getResponsivenessLabel(
                filterValues.get("responsiveness") as string,
              )
            }}
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            @click="clearFilters"
            class="text-xs text-slate-500 hover:text-slate-700 underline ml-2"
          >
            Clear all
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading && allCoaches.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading coaches...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="allCoaches.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <UserGroupIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-900 font-medium mb-2">No coaches found</p>
        <p class="text-sm text-slate-500">
          Add coaches through school detail pages
        </p>
      </div>

      <!-- No Results State -->
      <div
        v-else-if="filteredCoaches.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <MagnifyingGlassIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-900 font-medium mb-2">
          No coaches match your filters
        </p>
        <p class="text-sm text-slate-500">
          Try adjusting your search or filters
        </p>
      </div>

      <!-- Coaches Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
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
                    {{ getSchoolName(coach.school_id) }}
                  </p>
                </div>
              </div>
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getRoleBadgeClass(coach.role)"
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
              <span class="text-sm text-slate-500">Responsiveness</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :class="
                      getResponsivenessBarClass(coach.responsiveness_score || 0)
                    "
                    :style="{ width: `${coach.responsiveness_score || 0}%` }"
                  ></div>
                </div>
                <span
                  class="text-sm font-medium"
                  :class="
                    getResponsivenessTextClass(coach.responsiveness_score || 0)
                  "
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
              <span class="text-slate-700">{{
                formatDate(coach.last_contact_date)
              }}</span>
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
                class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Send email"
              >
                <EnvelopeIcon class="w-5 h-5" />
              </button>
              <button
                v-if="coach.phone"
                @click="handleCoachAction('text', coach)"
                class="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                title="Send text"
              >
                <ChatBubbleLeftIcon class="w-5 h-5" />
              </button>
              <button
                v-if="coach.twitter_handle"
                @click="handleCoachAction('tweet', coach)"
                class="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition"
                title="View Twitter"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
              </button>
              <button
                v-if="coach.instagram_handle"
                @click="handleCoachAction('instagram', coach)"
                class="p-2 text-slate-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition"
                title="View Instagram"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                  />
                </svg>
              </button>
              <button
                @click="openDeleteModal(coach)"
                data-test="coach-delete-btn"
                class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete coach"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
        </div>
      </div>
    </main>

    <!-- Communication Panel Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPanel && selectedCoach"
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          @click="showPanel = false"
        >
          <div
            class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            @click.stop
          >
            <div
              class="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between"
            >
              <h2 class="text-xl font-semibold text-slate-900">
                Quick Communication
              </h2>
              <button
                @click="showPanel = false"
                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <XMarkIcon class="w-5 h-5" />
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
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";
import Header from "~/components/Header.vue";
import StatusSnippet from "~/components/Timeline/StatusSnippet.vue";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";
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
const filterValues = ref(new Map<string, string | null>());

// Delete modal state
const deleteModalOpen = ref(false);
const selectedDeleteCoach = ref<Coach | null>(null);
const isDeleting = ref(false);

const hasActiveFilters = computed(() => {
  for (const [, value] of filterValues.value) {
    if (value) return true;
  }
  return false;
});

const handleFilterUpdate = (field: string, value: string | null) => {
  const newMap = new Map(filterValues.value);
  if (value) {
    newMap.set(field, value);
  } else {
    newMap.delete(field);
  }
  filterValues.value = newMap;
};

const clearFilters = () => {
  filterValues.value = new Map();
};

const getResponsivenessLabel = (value: string): string => {
  const labels: Record<string, string> = {
    high: "High (75%+)",
    medium: "Medium (50-74%)",
    low: "Low (<50%)",
  };
  return labels[value] || value;
};

const getRoleBadgeClass = (role: string): string => {
  const classes: Record<string, string> = {
    head: "bg-purple-100 text-purple-700",
    assistant: "bg-blue-100 text-blue-700",
    recruiting: "bg-emerald-100 text-emerald-700",
  };
  return classes[role] || "bg-slate-100 text-slate-700";
};

const getResponsivenessBarClass = (score: number): string => {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
};

const getResponsivenessTextClass = (score: number): string => {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
};

const getInitials = (coach: Coach): string => {
  return `${coach.first_name[0]}${coach.last_name[0]}`.toUpperCase();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Filter and sort coaches
const filteredCoaches = computed(() => {
  let result = allCoaches.value.filter((coach) => {
    // Search filter
    const searchTerm = filterValues.value.get("search");
    const searchLower = String(searchTerm || "").toLowerCase();
    const matchesSearch =
      !searchTerm ||
      coach.first_name.toLowerCase().includes(searchLower) ||
      coach.last_name.toLowerCase().includes(searchLower) ||
      coach.email?.toLowerCase().includes(searchLower) ||
      coach.phone?.includes(String(searchTerm)) ||
      coach.notes?.toLowerCase().includes(searchLower) ||
      coach.twitter_handle?.toLowerCase().includes(searchLower) ||
      coach.instagram_handle?.toLowerCase().includes(searchLower);

    // Role filter
    const roleFilter = filterValues.value.get("role");
    const matchesRole = !roleFilter || coach.role === roleFilter;

    // Last contact filter
    let matchesLastContact = true;
    const lastContactFilter = filterValues.value.get("lastContact");
    if (lastContactFilter) {
      const days = parseInt(String(lastContactFilter), 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      if (coach.last_contact_date) {
        matchesLastContact = new Date(coach.last_contact_date) >= cutoffDate;
      }
    }

    // Responsiveness filter
    let matchesResponsiveness = true;
    const responsivenessFilter = filterValues.value.get("responsiveness");
    if (responsivenessFilter) {
      const score = coach.responsiveness_score || 0;
      switch (responsivenessFilter) {
        case "high":
          matchesResponsiveness = score >= 75;
          break;
        case "medium":
          matchesResponsiveness = score >= 50 && score < 75;
          break;
        case "low":
          matchesResponsiveness = score < 50;
          break;
      }
    }

    return (
      matchesSearch &&
      matchesRole &&
      matchesLastContact &&
      matchesResponsiveness
    );
  });

  // Sort results
  result.sort((a, b) => {
    switch (sortBy.value) {
      case "name":
        return (
          a.last_name.localeCompare(b.last_name) ||
          a.first_name.localeCompare(b.first_name)
        );
      case "school": {
        const schoolA = getSchoolName(a.school_id) || "";
        const schoolB = getSchoolName(b.school_id) || "";
        return schoolA.localeCompare(schoolB);
      }
      case "last-contacted": {
        const dateA = a.last_contact_date
          ? new Date(a.last_contact_date).getTime()
          : 0;
        const dateB = b.last_contact_date
          ? new Date(b.last_contact_date).getTime()
          : 0;
        return dateB - dateA;
      }
      case "responsiveness":
        return (b.responsiveness_score || 0) - (a.responsiveness_score || 0);
      case "role": {
        const roleOrder = { head: 0, assistant: 1, recruiting: 2 };
        return (
          (roleOrder[a.role as keyof typeof roleOrder] || 3) -
          (roleOrder[b.role as keyof typeof roleOrder] || 3)
        );
      }
      default:
        return 0;
    }
  });

  return result;
});

const getSchool = (schoolId?: string): School | undefined => {
  if (!schoolId) return undefined;
  return schools.value.find((s) => s.id === schoolId);
};

const getSchoolName = (schoolId?: string): string => {
  const school = getSchool(schoolId);
  return school?.name || "Unknown";
};

const selectedCoachSchool = computed(() => {
  return selectedCoach.value
    ? getSchool(selectedCoach.value.school_id)
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

const handleExportCSV = () => {
  // TODO: Implement CSV export
  console.log("Export CSV");
};

const handleExportPDF = () => {
  // TODO: Implement PDF export
  console.log("Export PDF");
};

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
