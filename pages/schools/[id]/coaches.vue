<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          :to="`/schools/${id}`"
          class="text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          ← Back to School
        </NuxtLink>
      </div>

      <!-- Header with gradient -->
      <div
        class="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-8 rounded-2xl shadow-lg mb-8"
      >
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold">Coaches</h1>
            <p class="text-slate-300 mt-2">{{ schoolName }}</p>
          </div>
          <button
            @click="showAddForm = !showAddForm"
            class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition shadow-lg"
          >
            {{ showAddForm ? "Cancel" : "+ Add Coach" }}
          </button>
        </div>
      </div>

      <!-- Filter Section -->
      <div
        class="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search Input -->
          <div>
            <label
              for="search"
              class="block text-sm font-medium text-slate-700 mb-2"
            >
              Search
            </label>
            <input
              id="search"
              v-model="searchQuery"
              type="text"
              placeholder="Name, email, phone..."
              class="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Role Filter -->
          <div>
            <label
              for="roleFilter"
              class="block text-sm font-medium text-slate-700 mb-2"
            >
              Role
            </label>
            <select
              id="roleFilter"
              v-model="roleFilter"
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              :style="selectDropdownStyle"
            >
              <option value="">All Roles</option>
              <option value="head">Head Coach</option>
              <option value="assistant">Assistant Coach</option>
              <option value="recruiting">Recruiting Coordinator</option>
            </select>
          </div>

          <!-- Sort -->
          <div>
            <label
              for="sortFilter"
              class="block text-sm font-medium text-slate-700 mb-2"
            >
              Sort by
            </label>
            <select
              id="sortFilter"
              v-model="sortFilter"
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              :style="selectDropdownStyle"
            >
              <option value="name">Name (A-Z)</option>
              <option value="lastContact">Last Contact (Recent)</option>
              <option value="responsiveness">Responsiveness</option>
            </select>
          </div>
        </div>

        <!-- Clear Filters Button -->
        <div
          v-if="searchQuery || roleFilter || sortFilter !== 'name'"
          class="mt-4 flex justify-end"
        >
          <button
            @click="clearFilters"
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Add Coach Form -->
      <div
        v-if="showAddForm"
        class="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-slate-200"
      >
        <h2 class="text-2xl font-bold text-slate-900 mb-6">Add New Coach</h2>

        <CoachForm
          :loading="loading"
          @submit="handleCoachFormSubmit"
          @cancel="showAddForm = false"
        />
      </div>

      <!-- Results Summary -->
      <div v-if="coaches.length > 0" class="mb-6">
        <p class="text-sm text-slate-600">
          Showing
          <span class="font-semibold">{{ filteredCoaches.length }}</span> of
          <span class="font-semibold">{{ coaches.length }}</span>
          {{ coaches.length === 1 ? "coach" : "coaches" }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading && coaches.length === 0" class="text-center py-8">
        <p class="text-slate-600">Loading coaches...</p>
      </div>

      <!-- Empty State -->
      <div
        v-if="!loading && coaches.length === 0"
        class="bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200"
      >
        <p class="text-slate-600 mb-4">No coaches added yet</p>
      </div>

      <!-- No Results State -->
      <div
        v-if="!loading && coaches.length > 0 && filteredCoaches.length === 0"
        class="bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200"
      >
        <p class="text-slate-600">No coaches match your filters</p>
      </div>

      <!-- Coaches Grid -->
      <div
        v-if="filteredCoaches.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div v-for="coach in filteredCoaches" :key="coach.id" class="relative">
          <!-- Delete Button Overlay -->
          <button
            @click="deleteCoach(coach.id)"
            class="absolute -top-2 -right-2 z-10 w-8 h-8 bg-red-600 text-white rounded-full hover:bg-red-700 text-xs font-bold transition flex items-center justify-center"
            title="Delete coach"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
          <CoachCard
            :coach="coach"
            @email="sendEmail(coach)"
            @text="sendText(coach)"
            @tweet="openTwitter(coach)"
            @instagram="openInstagram(coach)"
            @view="viewCoach(coach)"
          />
        </div>
      </div>
    </div>

    <!-- Communication Panel Modal -->
    <CommunicationPanel
      v-if="showPanel && selectedCoach"
      :coach="selectedCoach"
      :school="school"
      :initial-type="communicationType"
      @close="showPanel = false"
      @interaction-logged="handleSchoolCoachInteractionLogged"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { XMarkIcon } from "@heroicons/vue/24/solid";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useInteractions } from "~/composables/useInteractions";
import { useCommunication } from "~/composables/useCommunication";
import { useUserStore } from "~/stores/user";
import type { School } from "~/types";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const id = route.params.id as string;

// Dropdown style for selects
const selectDropdownStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: "right 0.75rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1.5em 1.5em",
  paddingRight: "2.5rem",
}));

const {
  coaches,
  loading,
  error,
  fetchCoaches,
  createCoach,
  deleteCoach: deleteCoachAPI,
  getCoach,
} = useCoaches();
const { getSchool } = useSchools();
const { fetchInteractions } = useInteractions();
const {
  showPanel,
  selectedCoach,
  communicationType,
  openCommunication,
  handleInteractionLogged,
} = useCommunication();
const userStore = useUserStore();

const showAddForm = ref(false);
const schoolName = ref("");
const searchQuery = ref("");
const roleFilter = ref("");
const sortFilter = ref<"name" | "lastContact" | "responsiveness">("name");
const localError = ref("");

// Create a school object from schoolName for CommunicationPanel
const school = computed((): School | undefined => {
  if (!schoolName.value) return undefined;
  return {
    id: id,
    user_id: "",
    name: schoolName.value,
    location: null,
    division: null,
    conference: null,
    website: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    status: "researching",
    notes: null,
    pros: [],
    cons: [],
    is_favorite: false,
  };
});

const filteredCoaches = computed(() => {
  let result = [...coaches.value];

  // Apply search filter
  if (searchQuery.value) {
    const searchLower = searchQuery.value.toLowerCase();
    result = result.filter(
      (coach) =>
        coach.first_name.toLowerCase().includes(searchLower) ||
        coach.last_name.toLowerCase().includes(searchLower) ||
        coach.email?.toLowerCase().includes(searchLower) ||
        coach.phone?.includes(searchQuery.value),
    );
  }

  // Apply role filter
  if (roleFilter.value) {
    result = result.filter((coach) => coach.role === roleFilter.value);
  }

  // Apply sorting (create a new array to avoid mutation)
  if (sortFilter.value === "name") {
    result = result.sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } else if (sortFilter.value === "lastContact") {
    result = result.sort((a, b) => {
      const dateA = a.last_contact_date
        ? new Date(a.last_contact_date).getTime()
        : 0;
      const dateB = b.last_contact_date
        ? new Date(b.last_contact_date).getTime()
        : 0;
      return dateB - dateA; // Most recent first
    });
  } else if (sortFilter.value === "responsiveness") {
    result = result.sort((a, b) => {
      const scoreA = a.responsiveness_score || 0;
      const scoreB = b.responsiveness_score || 0;
      return scoreB - scoreA; // Highest responsiveness first
    });
  }

  return result;
});

const clearFilters = () => {
  searchQuery.value = "";
  roleFilter.value = "";
  sortFilter.value = "name";
};

const handleCoachFormSubmit = async (formData: any) => {
  try {
    await createCoach(id, {
      role: formData.role as "head" | "assistant" | "recruiting",
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || null,
      phone: formData.phone || null,
      twitter_handle: formData.twitter_handle || null,
      instagram_handle: formData.instagram_handle || null,
      notes: formData.notes || null,
      responsiveness_score: 0,
      last_contact_date: null,
    });

    showAddForm.value = false;

    // Refresh list
    await fetchCoaches(id);
  } catch (err) {
    console.error("Failed to add coach:", err);
  }
};

const deleteCoach = async (coachId: string) => {
  if (window.confirm("Are you sure you want to delete this coach?")) {
    try {
      await deleteCoachAPI(coachId);
    } catch (err) {
      console.error("Failed to delete coach:", err);
    }
  }
};

const sendEmail = (coach: (typeof coaches.value)[0]) => {
  if (coach.email) {
    window.location.href = `mailto:${coach.email}`;
  }
};

const sendText = (coach: (typeof coaches.value)[0]) => {
  if (coach.phone) {
    // Remove any non-digit characters for SMS URL
    const phone = coach.phone.replace(/\D/g, "");
    window.location.href = `sms:${phone}`;
  }
};

const handleSchoolCoachInteractionLogged = async (interactionData: any) => {
  try {
    const refreshData = async () => {
      await fetchCoaches(id);
    };

    await handleInteractionLogged(interactionData, refreshData);
  } catch (err) {
    localError.value =
      err instanceof Error ? err.message : "Failed to log interaction";
  }
};

const openTwitter = (coach: (typeof coaches.value)[0]) => {
  if (coach.twitter_handle) {
    const handle = coach.twitter_handle.replace("@", "");
    window.open(`https://twitter.com/${handle}`, "_blank");
  }
};

const openInstagram = (coach: (typeof coaches.value)[0]) => {
  if (coach.instagram_handle) {
    const handle = coach.instagram_handle.replace("@", "");
    window.open(`https://instagram.com/${handle}`, "_blank");
  }
};

const viewCoach = (coach: (typeof coaches.value)[0]) => {
  navigateTo(`/coaches/${coach.id}`);
};

// Expose reactive variables for testing
defineExpose({
  showAddForm,
  searchQuery,
  roleFilter,
  sortFilter,
  filteredCoaches,
  handleCoachFormSubmit,
});

onMounted(async () => {
  const school = await getSchool(id);
  if (school) {
    schoolName.value = school.name;
  }
  await fetchCoaches(id);
});
</script>
