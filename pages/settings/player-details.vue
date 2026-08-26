<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
    :class="{ 'pb-32 sm:pb-20': true }"
  >
    <!-- Sticky Status Header (Offsets global header which is top-0) -->
    <div
      class="sticky top-16 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg"
    >
      <div
        class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6"
      >
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/settings"
            class="rounded-full p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
            title="Back to Settings"
          >
            <UIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
          </NuxtLink>
          <div class="flex items-center gap-2">
            <h1 class="hidden text-sm font-bold text-slate-900 sm:block">
              Player Details
            </h1>
            <div
              v-if="saving || isSaving"
              class="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-blue-600 uppercase"
            >
              <div
                class="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
              ></div>
              Saving
            </div>
            <div
              v-else
              class="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-emerald-600 uppercase"
            >
              <UIcon name="i-heroicons-check-circle" class="h-3 w-3" />
              Saved
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <SettingsProfileEditHistory />
        </div>
      </div>
    </div>

    <main class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <!-- Profile Completeness Hero -->
      <div
        class="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <ProfileCompleteness :percentage="profileCompleteness" />
      </div>

      <!-- Desktop Tab Navigation (Hidden on Mobile) -->
      <nav class="mb-8 hidden gap-1 rounded-xl bg-slate-200/50 p-1 sm:flex">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="currentTab = tab.id"
          :class="[
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
            currentTab === tab.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:bg-white/50 hover:text-slate-900',
          ]"
        >
          <UIcon :name="tab.icon" class="h-4 w-4" />
          <span>{{ tab.name }}</span>
        </button>
      </nav>

      <!-- Mobile Tab Bar (Sticky Bottom, iOS Style) -->
      <nav
        class="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] backdrop-blur-xl sm:hidden"
      >
        <div class="flex h-16 items-center justify-around">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="currentTab = tab.id"
            class="flex flex-1 flex-col items-center justify-center gap-1"
            :class="currentTab === tab.id ? 'text-blue-600' : 'text-slate-400'"
          >
            <UIcon
              :name="tab.icon"
              class="h-6 w-6"
              :class="currentTab === tab.id ? 'fill-blue-50' : ''"
            />
            <span class="text-[10px] font-bold tracking-tighter uppercase">{{
              tab.name
            }}</span>
          </button>
        </div>
      </nav>

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
      >
        <div
          class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
        ></div>
        <p class="font-medium text-slate-600">Loading your profile...</p>
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
          class="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300"
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
          class="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300"
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
          class="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300"
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
          class="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300"
        >
          <ProfileSetup
            v-if="!profileLoading"
            :details="form as unknown as PlayerDetails"
            :schools="previewSchools"
          />
          <div
            v-else
            class="animate-pulse rounded-xl bg-gray-50 p-4"
          >
            <div class="mb-4 h-3 w-32 rounded bg-gray-200" />
            <div class="h-24 rounded-xl bg-gray-200" />
          </div>
        </div>

        <!-- TAB: INBOX -->
        <div
          v-show="currentTab === 'inbox'"
          class="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300"
        >
          <ProfileInbox />
        </div>

        <!-- TAB: HISTORY -->
        <div
          v-show="currentTab === 'history'"
          class="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300"
        >
          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2
              class="mb-6 flex items-center gap-2 text-base font-bold text-slate-900"
            >
              <UIcon name="i-heroicons-clock" class="h-5 w-5 text-blue-600" />
              High School Career
            </h2>
            <div class="space-y-6">
              <div
                v-for="grade in gradeLevels"
                :key="grade.key"
                class="rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <h3
                  class="mb-5 text-xs font-black tracking-widest text-slate-400 uppercase"
                >
                  {{ grade.label }}
                </h3>
                <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label
                      class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
                      >Team Level</label
                    >
                    <input
                      v-model="form[grade.teamKey]"
                      @blur="triggerSave"
                      placeholder="e.g. Varsity"
                      class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium shadow-xs"
                    />
                  </div>
                  <div>
                    <label
                      class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
                      >Head Coach</label
                    >
                    <input
                      v-model="form[grade.coachKey]"
                      @blur="triggerSave"
                      placeholder="Coach Name"
                      class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-base font-bold text-slate-900">Travel Teams</h2>
              <p class="text-xs font-medium text-slate-500">
                Add each org you've played for — most recent shows on your
                profile.
              </p>
            </div>

            <div class="space-y-4">
              <div
                v-for="(team, idx) in form.travel_teams"
                :key="idx"
                class="grid grid-cols-1 items-end gap-4 md:grid-cols-[7rem_1fr_1fr_auto]"
              >
                <div>
                  <label
                    class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
                    >Season Year</label
                  >
                  <input
                    v-model.number="team.year"
                    type="number"
                    @blur="triggerSave"
                    placeholder="2024"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"
                  />
                </div>
                <div>
                  <label
                    class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
                    >Organization</label
                  >
                  <input
                    v-model="team.name"
                    @blur="triggerSave"
                    placeholder="Team Name"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"
                  />
                </div>
                <div>
                  <label
                    class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
                    >Head Coach</label
                  >
                  <input
                    v-model="team.coach"
                    @blur="triggerSave"
                    placeholder="Coach Name"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"
                  />
                </div>
                <button
                  type="button"
                  @click="removeTravelTeam(idx)"
                  class="shrink-0 rounded-xl p-3 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  title="Remove travel team"
                >
                  <UIcon name="i-heroicons-trash" class="h-5 w-5" />
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
                class="inline-flex items-center gap-2 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <UIcon name="i-heroicons-plus" class="h-4 w-4" />
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
import type { PlayerDetails } from "~/types/models";
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
  "inbox",
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
  { id: "inbox", name: "Inbox", icon: "i-heroicons-inbox-arrow-down" },
];

const { loading: profileLoading } = usePlayerProfile();

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
