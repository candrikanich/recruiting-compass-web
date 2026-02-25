<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Skip Link for Keyboard Navigation -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
    >
      Skip to main content
    </a>

    <!-- Page Header -->
    <PageHeader
      title="Dashboard"
      :description="user ? `Welcome back, ${userFirstName}! 👋` : undefined"
    />

    <main
      id="main-content"
      class="max-w-7xl mx-auto px-4 sm:px-6 py-8"
      role="main"
    >
      <!-- Parent Context Banner -->
      <ParentContextBanner
        :is-viewing-as-parent="isViewingAsParent"
        :athlete-name="activeAthleteName"
      />

      <!-- Timeline Summary -->
      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" class="sr-only">Timeline Summary</h2>
        <DashboardTimelineCard />
      </section>

      <!-- Statistics Overview Section -->
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" class="sr-only">Statistics Overview</h2>
        <DashboardStatsCards
          :coach-count="coachCount"
          :school-count="schoolCount"
          :interaction-count="interactionCount"
          :total-offers="totalOffers"
          :accepted-offers="acceptedOffers"
          :a-tier-school-count="aTierSchoolCount"
          :contacts-this-month="contactsThisMonth"
        />
      </section>

      <!-- Main content + persistent sidebar -->
      <div class="grid grid-cols-1 lg:grid-cols-6 gap-6">
        <!-- Left: main content (4 cols) -->
        <div class="lg:col-span-4 space-y-6">
          <!-- Action Items -->
          <section aria-labelledby="suggestions-heading">
            <h2 id="suggestions-heading" class="sr-only">Recommended Actions</h2>
            <DashboardSuggestions
              :suggestions="dashboardSuggestions || []"
              :is-viewing-as-parent="isViewingAsParent || false"
              :athlete-name="activeAthleteName"
              @dismiss="handleSuggestionDismiss"
            />
          </section>

          <!-- Charts (2 + 2) -->
          <section aria-labelledby="charts-heading">
            <h2 id="charts-heading" class="sr-only">Charts & Analytics</h2>
            <Suspense>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DashboardInteractionTrendChart :interactions="allInteractions" />
                <DashboardSchoolInterestChart :schools="allSchools" />
              </div>
              <template #fallback>
                <div class="grid grid-cols-2 gap-6">
                  <div class="animate-pulse bg-gray-200 h-80 rounded-lg"></div>
                  <div class="animate-pulse bg-gray-200 h-80 rounded-lg"></div>
                </div>
              </template>
            </Suspense>
          </section>

          <!-- School Map (full width) -->
          <section aria-labelledby="map-heading">
            <h2 id="map-heading" class="sr-only">School Map</h2>
            <Suspense>
              <DashboardSchoolMapWidget :schools="allSchools" />
              <template #fallback>
                <div class="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
              </template>
            </Suspense>
          </section>

          <!-- Performance Metrics (full width) -->
          <section aria-labelledby="metrics-heading">
            <h2 id="metrics-heading" class="sr-only">Performance Metrics</h2>
            <DashboardPerformanceMetricsWidget
              :metrics="allMetrics"
              :top-metrics="topMetrics"
              :show-performance="true"
            />
          </section>

          <!-- Tasks + Contact Frequency (2 + 2) -->
          <section aria-labelledby="widgets-heading">
            <h2 id="widgets-heading" class="sr-only">Dashboard Widgets</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DashboardQuickTasksWidget
                :tasks="tasks || []"
                :show-tasks="true"
                @add-task="addTask"
                @toggle-task="toggleTask"
                @delete-task="deleteTask"
                @clear-completed="() => userTasksComposable?.clearCompleted()"
              />
              <DashboardContactFrequencyWidget
                :interactions="allInteractions"
                :schools="allSchools"
              />
            </div>
          </section>

          <!-- Coach Followup (full width) -->
          <DashboardCoachFollowupWidget />

          <!-- At a Glance (full width) -->
          <DashboardAtAGlanceSummary
            :coaches="allCoaches"
            :schools="allSchools"
            :interactions="allInteractions"
            :offers="allOffers"
          />
        </div>

        <!-- Right: persistent sidebar (2 cols) -->
        <aside class="lg:col-span-2 space-y-6" aria-label="Dashboard sidebar">
          <DashboardRecruitingPacketWidget
            :recruiting-packet-loading="recruitingPacketLoading"
            :recruiting-packet-error="recruitingPacketError"
            :has-generated-packet="hasGeneratedPacket"
            @generate-packet="handleGeneratePacket"
            @email-packet="handleEmailPacket"
          />
          <DashboardSchoolsBySizeWidget
            :breakdown="schoolSizeBreakdown"
            :count="schoolCount"
          />
          <DashboardUpcomingEventsWidget
            :events="upcomingEvents"
            :show-events="true"
          />
          <DashboardRecentActivityFeed />
          <DashboardSocialMediaWidget :show-social="true" />
          <DashboardAthleteActivityWidget v-if="userStore.isParent" />
        </aside>
      </div>

      <!-- Email Recruiting Packet Modal -->
      <EmailRecruitingPacketModal
        :is-open="showEmailModal"
        :available-coaches="allCoaches"
        :default-subject="defaultEmailSubject"
        :default-body="defaultEmailBody"
        @close="setShowEmailModal(false)"
        @send="handleSendEmail"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  computed,
  inject,
  defineAsyncComponent,
} from "vue";
import { useRouter } from "vue-router";
import { createClientLogger } from "~/utils/logger";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useNotifications } from "~/composables/useNotifications";
import { useToast } from "~/composables/useToast";
import { useUserTasks } from "~/composables/useUserTasks";
import { useSuggestions } from "~/composables/useSuggestions";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { useViewLogging } from "~/composables/useViewLogging";
import { useRecruitingPacket } from "~/composables/useRecruitingPacket";
import { useDashboardData } from "~/composables/useDashboardData";
import { useDashboardCalculations } from "~/composables/useDashboardCalculations";
import ParentContextBanner from "~/components/Dashboard/ParentContextBanner.vue";
import DashboardTimelineCard from "~/components/Dashboard/DashboardTimelineCard.vue";
import DashboardStatsCards from "~/components/Dashboard/DashboardStatsCards.vue";
import DashboardSuggestions from "~/components/Dashboard/DashboardSuggestions.vue";
const EmailRecruitingPacketModal = defineAsyncComponent(
  () => import("~/components/EmailRecruitingPacketModal.vue"),
);
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";

definePageMeta({
  middleware: ["auth", "onboarding"],
});

const logger = createClientLogger("dashboard");

const { logout } = useAuth();
const { showToast } = useToast();
const router = useRouter();

// Store-dependent composables
const userStore = useUserStore();
const notificationsComposable = useNotifications();
const userTasksComposable = useUserTasks();
const suggestionsComposable = useSuggestions();
const viewLoggingComposable = useViewLogging();
const recruitingPacketComposable = useRecruitingPacket();

// Destructure recruiting packet refs for template auto-unwrapping
const {
  hasGeneratedPacket,
  showEmailModal,
  defaultEmailSubject,
  defaultEmailBody,
  setShowEmailModal,
} = recruitingPacketComposable;

// Destructure suggestions ref for template auto-unwrapping
const { dashboardSuggestions } = suggestionsComposable ?? {
  dashboardSuggestions: ref([]),
};

// Destructure tasks ref for template auto-unwrapping
const { tasks } = userTasksComposable ?? { tasks: ref([]) };

const dashboardData = useDashboardData();
const {
  coachCount,
  schoolCount,
  interactionCount,
  allSchools,
  allInteractions,
  allCoaches,
  allMetrics,
  allOffers,
} = dashboardData;

// Dashboard calculations derived from dashboard data
const {
  schoolSizeBreakdown,
  contactsThisMonth,
  totalOffers,
  acceptedOffers,
  aTierSchoolCount,
  upcomingEvents,
  topMetrics,
} = useDashboardCalculations(dashboardData);

// Inject family context provided at app.vue level (with singleton fallback)
const activeFamily =
  inject<UseActiveFamilyReturn>("activeFamily") || useFamilyContext();

// Destructure activeFamily refs used in template for auto-unwrapping
const { isViewingAsParent } = activeFamily;

// Local state
const user = computed(() => userStore.user);
const recruitingPacketLoading = ref(false);
const recruitingPacketError = ref<string | null>(null);

// Determine target user ID (current user or viewed athlete if parent)
const targetUserId = computed(() => {
  return activeFamily.isViewingAsParent.value
    ? activeFamily.activeAthleteId.value
    : userStore?.user?.id;
});

// Get active athlete name for parent context banner
const activeAthleteName = computed(() => {
  return activeFamily.parentAccessibleFamilies.value.find(
    (f: { athleteId: string }) =>
      f.athleteId === activeFamily.activeAthleteId.value,
  )?.athleteName;
});

// User first name for greeting
const userFirstName = computed(() => {
  if (!user.value) return "";
  let firstName = "";
  if (user.value.full_name) {
    firstName = user.value.full_name.split(" ")[0];
  } else {
    firstName = user.value.email?.split("@")[0] || "";
  }
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
});

// Task event handlers
const addTask = async (taskText: string) => {
  if (taskText.trim() && userTasksComposable) {
    try {
      await userTasksComposable.addTask(taskText);
      showToast(`Task added!`, "success");
    } catch (err) {
      logger.error("Failed to add task", err);
      showToast("Failed to add task", "error");
    }
  }
};

const toggleTask = async (taskId: string) => {
  if (userTasksComposable) {
    await userTasksComposable.toggleTask(taskId);
  }
};

const deleteTask = async (taskId: string) => {
  if (userTasksComposable) {
    await userTasksComposable.deleteTask(taskId);
  }
};

// Suggestion event handlers
const handleSuggestionDismiss = async (suggestionId: string) => {
  if (suggestionsComposable) {
    await suggestionsComposable.dismissSuggestion(suggestionId);
  }
};

// Recruiting packet event handlers
const handleGeneratePacket = async () => {
  recruitingPacketLoading.value = true;
  recruitingPacketError.value = null;

  try {
    await recruitingPacketComposable.openPacketPreview();
    showToast("Recruiting packet generated successfully!", "success");
  } catch (err) {
    const message = "Failed to generate recruiting packet";
    recruitingPacketError.value = message;
    showToast(message, "error");
    logger.error("Packet generation error", err);
  } finally {
    recruitingPacketLoading.value = false;
  }
};

const handleEmailPacket = async () => {
  recruitingPacketLoading.value = true;
  recruitingPacketError.value = null;

  try {
    // Generate packet if not already generated
    if (!recruitingPacketComposable.hasGeneratedPacket.value) {
      await recruitingPacketComposable.generatePacket();
    }

    // Open email modal
    recruitingPacketComposable.setShowEmailModal(true);
  } catch (err) {
    const message = "Failed to prepare packet for email";
    recruitingPacketError.value = message;
    showToast(message, "error");
    logger.error("Packet email prep error", err);
  } finally {
    recruitingPacketLoading.value = false;
  }
};

const handleSendEmail = async (emailData: {
  recipients: string[];
  subject: string;
  body: string;
}) => {
  try {
    await recruitingPacketComposable.emailPacket(emailData);
    showToast(
      `Email sent to ${emailData.recipients.length} coach${emailData.recipients.length === 1 ? "" : "es"}!`,
      "success",
    );
  } catch (err) {
    const message = "Failed to send email";
    recruitingPacketError.value = message;
    showToast(message, "error");
    logger.error("Email sending error", err);
  }
};

// Centralized dashboard refresh logic
const refreshDashboard = async () => {
  if (!activeFamily.activeFamilyId.value || !targetUserId.value) {
    return;
  }

  await dashboardData.fetchAll(
    activeFamily.activeFamilyId.value,
    targetUserId.value,
  );

  await suggestionsComposable?.fetchSuggestions("dashboard");

  if (
    activeFamily.isViewingAsParent.value &&
    activeFamily.activeAthleteId.value
  ) {
    await viewLoggingComposable?.logParentView(
      "dashboard",
      activeFamily.activeAthleteId.value,
    );
  }
};

// Consolidated: refresh when family or athlete context changes
watch(
  () =>
    [
      activeFamily.activeFamilyId.value,
      activeFamily.activeAthleteId.value,
    ] as const,
  async ([familyId, athleteId], [prevFamilyId, prevAthleteId]) => {
    const familyChanged =
      familyId && familyId !== prevFamilyId && targetUserId.value;
    const athleteChanged =
      athleteId &&
      athleteId !== prevAthleteId &&
      activeFamily.isViewingAsParent.value;
    if (familyChanged || athleteChanged) {
      await refreshDashboard();
    }
  },
);

// Refetch data when navigating back to dashboard
watch(
  () => router.currentRoute.value.path,
  async (newPath) => {
    if (newPath === "/dashboard") {
      await refreshDashboard();
    }
  },
);

// Initialize on user load
watch(
  () => userStore?.user,
  async (newUser) => {
    if (newUser && notificationsComposable) {
      await refreshDashboard();
      await notificationsComposable.fetchNotifications();
    }
  },
  { immediate: true },
);
</script>
