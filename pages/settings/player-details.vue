<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
    :class="{ 'pb-32 sm:pb-20': true }"
  >
    <!-- Sticky Status Header (Offsets global header which is top-0) -->
    <div
      class="sticky top-16 z-30 bg-white/90 backdrop-blur-lg border-b border-slate-200"
    >
      <div
        class="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center"
      >
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/settings"
            class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
            title="Back to Settings"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <div class="flex items-center gap-2">
            <h1 class="text-sm font-bold text-slate-900 hidden sm:block">
              Player Details
            </h1>
            <div
              v-if="saving || isSaving"
              class="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-blue-600 font-bold"
            >
              <div
                class="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
              ></div>
              Saving
            </div>
            <div
              v-else
              class="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-600 font-bold"
            >
              <UIcon name="i-heroicons-check-circle" class="w-3 h-3" />
              Saved
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <SettingsProfileEditHistory />
        </div>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <!-- Profile Completeness Hero -->
      <div
        class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8"
      >
        <ProfileCompleteness :percentage="profileCompleteness" />
      </div>

      <!-- Desktop Tab Navigation (Hidden on Mobile) -->
      <nav class="hidden sm:flex p-1 bg-slate-200/50 rounded-xl mb-8 gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="currentTab = tab.id"
          :class="[
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all',
            currentTab === tab.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50',
          ]"
        >
          <UIcon :name="tab.icon" class="w-4 h-4" />
          <span>{{ tab.name }}</span>
        </button>
      </nav>

      <!-- Mobile Tab Bar (Sticky Bottom, iOS Style) -->
      <nav
        class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]"
      >
        <div class="flex justify-around items-center h-16">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="currentTab = tab.id"
            class="flex flex-col items-center justify-center flex-1 gap-1"
            :class="currentTab === tab.id ? 'text-blue-600' : 'text-slate-400'"
          >
            <UIcon
              :name="tab.icon"
              class="w-6 h-6"
              :class="currentTab === tab.id ? 'fill-blue-50' : ''"
            />
            <span class="text-[10px] font-bold uppercase tracking-tighter">{{
              tab.name
            }}</span>
          </button>
        </div>
      </nav>

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600 font-medium">Loading your profile...</p>
      </div>

      <!-- Error summary -->
      <FormErrorSummary
        v-if="hasErrors && !isLoading"
        :errors="errors"
        @dismiss="clearErrors"
      />

      <div v-if="!isLoading" class="space-y-6">
        <!-- TAB: BASICS -->
        <div
          v-show="currentTab === 'basics'"
          class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <PlayerDetailsBasicsTab
            :form="form"
            :is-parent-role="isReadOnly"
            :graduation-years="graduationYears"
            :common-sports="commonSports"
            :campus-size-options="CAMPUS_SIZE_OPTIONS"
            :cost-sensitivity-options="COST_SENSITIVITY_OPTIONS"
            :gender-options="GENDER_OPTIONS"
            :trigger-save="triggerSave"
            :social-inputs="socialInputs"
            :handle-social-blur="handleSocialBlur"
          />
        </div>

        <!-- TAB: ATHLETICS -->
        <div
          v-show="currentTab === 'athletics'"
          class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <PlayerDetailsAthleticsTab
            :form="form"
            :is-parent-role="isReadOnly"
            :available-positions="availablePositions"
            :player-name="userStore.user?.full_name ?? ''"
            :home-state="homeState"
            :trigger-save="triggerSave"
            :toggle-position="togglePosition"
            :is-position-selected="isPositionSelected"
            :move-position="movePosition"
            v-model:height-feet="heightFeet"
            v-model:height-inches="heightInches"
          />
        </div>

        <!-- TAB: ACADEMICS -->
        <div
          v-show="currentTab === 'academics'"
          class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <PlayerDetailsAcademicsTab
            :form="form"
            :is-parent-role="isReadOnly"
            :trigger-save="triggerSave"
            :add-course="addCourse"
            :remove-course="removeCourse"
            v-model:new-course-input="newCourseInput"
          />
        </div>

        <!-- TAB: PUBLIC PROFILE -->
        <div
          v-show="currentTab === 'public-profile'"
          class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfileSetup />
            <ProfilePreview
              v-if="playerProfile"
              :settings="playerProfile"
              :player-name="userStore.user?.full_name ?? 'Athlete'"
              :details="form as unknown as Record<string, unknown>"
              :schools="previewSchools"
            />
            <div
              v-else-if="profileLoading"
              class="bg-gray-50 rounded-xl p-4 animate-pulse"
            >
              <div class="h-3 w-32 bg-gray-200 rounded mb-4" />
              <div class="h-24 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>

        <!-- TAB: HISTORY -->
        <div
          v-show="currentTab === 'history'"
          class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div
            class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
          >
            <h2
              class="text-base font-bold text-slate-900 mb-6 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-clock" class="w-5 h-5 text-blue-600" />
              High School Career
            </h2>
            <div class="space-y-6">
              <div
                v-for="grade in gradeLevels"
                :key="grade.key"
                class="p-5 rounded-2xl bg-slate-50 border border-slate-100"
              >
                <h3
                  class="text-xs font-black text-slate-400 uppercase tracking-widest mb-5"
                >
                  {{ grade.label }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
                      >Team Level</label
                    >
                    <input
                      v-model="form[grade.teamKey]"
                      @blur="triggerSave"
                      placeholder="e.g. Varsity"
                      class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium shadow-xs"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
                      >Head Coach</label
                    >
                    <input
                      v-model="form[grade.coachKey]"
                      @blur="triggerSave"
                      placeholder="Coach Name"
                      class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
          >
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-base font-bold text-slate-900">Travel Teams</h2>
              <p class="text-xs text-slate-500 font-medium">
                Add each org you've played for — most recent shows on your
                profile.
              </p>
            </div>

            <div class="space-y-4">
              <div
                v-for="(team, idx) in form.travel_teams"
                :key="idx"
                class="grid grid-cols-1 md:grid-cols-[7rem_1fr_1fr_auto] gap-4 items-end"
              >
                <div>
                  <label
                    class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
                    >Season Year</label
                  >
                  <input
                    v-model.number="team.year"
                    type="number"
                    @blur="triggerSave"
                    placeholder="2024"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label
                    class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
                    >Organization</label
                  >
                  <input
                    v-model="team.name"
                    @blur="triggerSave"
                    placeholder="Team Name"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label
                    class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
                    >Head Coach</label
                  >
                  <input
                    v-model="team.coach"
                    @blur="triggerSave"
                    placeholder="Coach Name"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <button
                  type="button"
                  @click="removeTravelTeam(idx)"
                  class="p-3 text-slate-400 hover:text-red-500 transition rounded-xl hover:bg-red-50 shrink-0"
                  title="Remove travel team"
                >
                  <UIcon name="i-heroicons-trash" class="w-5 h-5" />
                </button>
              </div>

              <p
                v-if="!form.travel_teams || form.travel_teams.length === 0"
                class="text-sm text-slate-400 italic"
              >
                No travel teams added yet.
              </p>

              <button
                type="button"
                @click="addTravelTeam"
                class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
              >
                <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                Add Travel Team
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "#app";
import { usePlayerProfile } from "~/composables/usePlayerProfile";
import { useFormValidation } from "~/composables/useFormValidation";
import { usePlayerDetailsForm } from "~/composables/usePlayerDetailsForm";
import { useUserStore } from "~/stores/user";
import { useSchoolStore } from "~/stores/schools";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import ProfileCompleteness from "~/components/ProfileCompleteness.vue";
import PlayerDetailsBasicsTab from "~/components/Settings/PlayerDetailsBasicsTab.vue";
import PlayerDetailsAthleticsTab from "~/components/Settings/PlayerDetailsAthleticsTab.vue";
import PlayerDetailsAcademicsTab from "~/components/Settings/PlayerDetailsAcademicsTab.vue";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const schoolStore = useSchoolStore();
const route = useRoute();
const previewSchools = computed(() =>
  schoolStore.schools.map((s) => ({ id: s.id, name: s.name })),
);
const { errors, clearErrors, hasErrors } = useFormValidation();

// Parents and players collaborate on one player profile; everyone edits.
const isReadOnly = computed(() => false);

const validTabs = [
  "basics",
  "athletics",
  "academics",
  "history",
  "public-profile",
];
const currentTab = ref(
  validTabs.includes(route.query.tab as string)
    ? (route.query.tab as string)
    : "basics",
);
const tabs = [
  { id: "basics", name: "Basics", icon: "i-heroicons-identification" },
  { id: "athletics", name: "Athletics", icon: "i-heroicons-bolt" },
  {
    id: "academics",
    name: "Academics",
    icon: "i-heroicons-academic-cap",
  },
  { id: "history", name: "History", icon: "i-heroicons-clock" },
  { id: "public-profile", name: "Public Profile", icon: "i-heroicons-share" },
];

const { profile: playerProfile, loading: profileLoading } = usePlayerProfile();

const {
  isLoading,
  form,
  heightFeet,
  heightInches,
  availablePositions,
  profileCompleteness,
  isSaving,
  saving,
  triggerSave,
  graduationYears,
  commonSports,
  isPositionSelected,
  togglePosition,
  movePosition,
  newCourseInput,
  addCourse,
  removeCourse,
  addTravelTeam,
  removeTravelTeam,
  handleSocialBlur,
  socialInputs,
  gradeLevels,
  CAMPUS_SIZE_OPTIONS,
  COST_SENSITIVITY_OPTIONS,
  GENDER_OPTIONS,
  homeState,
  load,
} = usePlayerDetailsForm();

onMounted(load);
</script>

<style scoped>
.animate-in {
  animation: animate-in 0.3s ease-out;
}
@keyframes animate-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
