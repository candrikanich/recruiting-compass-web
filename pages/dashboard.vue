<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
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

      <!-- Parent onboarding banner: shown until athlete connects (self-managed) -->
      <ParentOnboardingBanner v-if="userStore.isParent" />

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
          :event-count="eventCount"
          :total-offers="totalOffers"
          :accepted-offers="acceptedOffers"
          :contacts-this-month="contactsThisMonth"
          :show-coaches="dashboardLayout.statsCards.coaches"
          :show-schools="dashboardLayout.statsCards.schools"
          :show-interactions="dashboardLayout.statsCards.interactions"
          :show-offers="dashboardLayout.statsCards.offers"
          :show-events="dashboardLayout.statsCards.events"
        />
      </section>

      <!-- Main content + persistent sidebar -->
      <div class="grid grid-cols-1 lg:grid-cols-6 gap-6">
        <!-- Left: main content (4 cols) -->
        <div class="lg:col-span-4 space-y-6">
          <!-- Action Items — always visible -->
          <section aria-labelledby="suggestions-heading">
            <h2 id="suggestions-heading" class="sr-only">Recommended Actions</h2>
            <DashboardSuggestions
              :suggestions="dashboardSuggestions || []"
              :is-viewing-as-parent="isViewingAsParent || false"
              :athlete-name="activeAthleteName"
              @dismiss="handleSuggestionDismiss"
            />
          </section>

          <!-- Dynamic left column widgets -->
          <template
            v-for="group in leftColumnGroups"
            :key="group.type === 'pair' ? group.entries[0].id : group.entry.id"
          >
            <!-- Pair of 2/6 widgets side-by-side -->
            <div v-if="group.type === 'pair'" class="grid grid-cols-2 gap-6">
              <Suspense v-for="entry in group.entries" :key="entry.id">
                <component
                  :is="WIDGET_COMPONENTS[entry.id] || 'div'"
                  v-bind="getWidgetProps(entry.id)"
                />
                <template #fallback>
                  <div class="animate-pulse bg-gray-200 h-64 rounded-lg" />
                </template>
              </Suspense>
            </div>

            <!-- Single 4/6 widget, or lone 2/6 at half-width -->
            <div
              v-else
              :class="
                WIDGET_SIZES[group.entry.id] === '2/6'
                  ? 'grid grid-cols-2 gap-6'
                  : ''
              "
            >
              <Suspense>
                <component
                  :is="WIDGET_COMPONENTS[group.entry.id] || 'div'"
                  v-bind="getWidgetProps(group.entry.id)"
                />
                <template #fallback>
                  <div class="animate-pulse bg-gray-200 h-64 rounded-lg" />
                </template>
              </Suspense>
            </div>
          </template>
        </div>

        <!-- Right: persistent sidebar (2 cols) -->
        <aside class="lg:col-span-2 space-y-6" aria-label="Dashboard sidebar">
          <!-- Always-visible sidebar widgets -->
          <DashboardRecruitingPacketWidget
            :recruiting-packet-loading="recruitingPacketLoading"
            :recruiting-packet-error="recruitingPacketError"
            :has-generated-packet="hasGeneratedPacket"
            @generate-packet="handleGeneratePacket"
            @email-packet="handleEmailPacket"
          />
          <DashboardContactFrequencyWidget
            :interactions="allInteractions"
            :schools="allSchools"
          />

          <!-- Dynamic right column widgets -->
          <template v-for="entry in rightColumnVisible" :key="entry.id">
            <Suspense>
              <component
                :is="WIDGET_COMPONENTS[entry.id] || 'div'"
                v-bind="getWidgetProps(entry.id)"
              />
              <template #fallback>
                <div class="animate-pulse bg-gray-200 h-40 rounded-lg" />
              </template>
            </Suspense>
          </template>

          <!-- Parent-only widget — always last -->
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
  onMounted,
} from "vue";
import type { Component } from "vue";
import { useRouter } from "vue-router";
import { createClientLogger } from "~/utils/logger";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useNotifications } from "~/composables/useNotifications";
import { useAppToast } from "~/composables/useAppToast";
import { useUserTasks } from "~/composables/useUserTasks";
import { useSuggestions } from "~/composables/useSuggestions";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { useViewLogging } from "~/composables/useViewLogging";
import { useRecruitingPacket } from "~/composables/useRecruitingPacket";
import { useDashboardData } from "~/composables/useDashboardData";
import { useDashboardCalculations } from "~/composables/useDashboardCalculations";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { WIDGET_SIZES } from "~/types/models";
import type { WidgetId, WidgetEntry } from "~/types/models";
import ParentContextBanner from "~/components/Dashboard/ParentContextBanner.vue";
import ParentOnboardingBanner from "~/components/Dashboard/ParentOnboardingBanner.vue";
import DashboardTimelineCard from "~/components/Dashboard/DashboardTimelineCard.vue";
import DashboardStatsCards from "~/components/Dashboard/DashboardStatsCards.vue";
import DashboardSuggestions from "~/components/Dashboard/DashboardSuggestions.vue";
import DashboardRecruitingPacketWidget from "~/components/Dashboard/RecruitingPacketWidget.vue";
import DashboardContactFrequencyWidget from "~/components/Dashboard/ContactFrequencyWidget.vue";
import DashboardAthleteActivityWidget from "~/components/Dashboard/AthleteActivityWidget.vue";
const EmailRecruitingPacketModal = defineAsyncComponent(
  () => import("~/components/EmailRecruitingPacketModal.vue"),
);
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";

definePageMeta({
  middleware: ["auth", "onboarding"],
});

const logger = createClientLogger("dashboard");

const { getDashboardLayout, dashboardPrefs } = usePreferenceManager();
const dashboardLayout = computed(() => getDashboardLayout());

const { logout } = useAuth();
const { showToast } = useAppToast();
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
  allEvents,
} = dashboardData;

// Dashboard calculations derived from dashboard data
const {
  schoolSizeBreakdown,
  contactsThisMonth,
  totalOffers,
  acceptedOffers,
  upcomingEvents,
  topMetrics,
} = useDashboardCalculations(dashboardData);

const eventCount = computed(() => allEvents.value.length);

// Widget component map
const WIDGET_COMPONENTS: Partial<Record<WidgetId, Component>> = {
  interactionTrendChart: defineAsyncComponent(
    () => import("~/components/Dashboard/InteractionTrendChart.vue"),
  ),
  schoolInterestChart: defineAsyncComponent(
    () => import("~/components/Dashboard/SchoolInterestChart.vue"),
  ),
  schoolMapWidget: defineAsyncComponent(
    () => import("~/components/Dashboard/SchoolMapWidget.vue"),
  ),
  performanceSummary: defineAsyncComponent(
    () => import("~/components/Dashboard/PerformanceMetricsWidget.vue"),
  ),
  quickTasks: defineAsyncComponent(
    () => import("~/components/Dashboard/QuickTasksWidget.vue"),
  ),
  coachFollowupWidget: defineAsyncComponent(
    () => import("~/components/Dashboard/CoachFollowupWidget.vue"),
  ),
  atAGlanceSummary: defineAsyncComponent(
    () => import("~/components/Dashboard/AtAGlanceSummary.vue"),
  ),
  schoolStatusOverview: defineAsyncComponent(
    () => import("~/components/Dashboard/SchoolsBySizeWidget.vue"),
  ),
  eventsSummary: defineAsyncComponent(
    () => import("~/components/Dashboard/UpcomingEventsWidget.vue"),
  ),
  recentNotifications: defineAsyncComponent(
    () => import("~/components/Dashboard/RecentActivityFeed.vue"),
  ),
  linkedAccounts: defineAsyncComponent(
    () => import("~/components/Dashboard/SocialMediaWidget.vue"),
  ),
};

// Return props for each widget id
const getWidgetProps = (id: WidgetId): Record<string, unknown> => {
  switch (id) {
    case "interactionTrendChart":
      return { interactions: allInteractions.value };
    case "schoolInterestChart":
      return { schools: allSchools.value };
    case "schoolMapWidget":
      return { schools: allSchools.value };
    case "performanceSummary":
      return {
        metrics: allMetrics.value,
        topMetrics: topMetrics.value,
        showPerformance: true,
      };
    case "quickTasks":
      return {
        tasks: tasks.value ?? [],
        showTasks: true,
        onAddTask: addTask,
        onToggleTask: toggleTask,
        onDeleteTask: deleteTask,
        onClearCompleted: () => userTasksComposable?.clearCompleted(),
      };
    case "coachFollowupWidget":
      return {};
    case "atAGlanceSummary":
      return {
        coaches: allCoaches.value,
        schools: allSchools.value,
        interactions: allInteractions.value,
        offers: allOffers.value,
      };
    case "schoolStatusOverview":
      return { breakdown: schoolSizeBreakdown.value, count: schoolCount.value };
    case "eventsSummary":
      return { events: upcomingEvents.value, showEvents: true };
    case "recentNotifications":
      return {};
    case "linkedAccounts":
      return { showSocial: true };
    default:
      return {};
  }
};

// Group visible left column entries: pair consecutive 2/6 widgets
type WidgetGroup =
  | { type: "single"; entry: WidgetEntry }
  | { type: "pair"; entries: [WidgetEntry, WidgetEntry] };

const leftColumnGroups = computed((): WidgetGroup[] => {
  const visible = dashboardLayout.value.leftColumn.filter((w) => w.visible);
  const groups: WidgetGroup[] = [];
  let i = 0;
  while (i < visible.length) {
    const current = visible[i];
    if (WIDGET_SIZES[current.id] === "2/6") {
      const next = visible[i + 1];
      if (next && WIDGET_SIZES[next.id] === "2/6") {
        groups.push({ type: "pair", entries: [current, next] });
        i += 2;
        continue;
      }
    }
    groups.push({ type: "single", entry: current });
    i++;
  }
  return groups;
});

const rightColumnVisible = computed(() =>
  dashboardLayout.value.rightColumn.filter((w) => w.visible),
);

// Inject family context provided at app.vue level (with singleton fallback)
const activeFamily =
  inject<UseActiveFamilyReturn>("activeFamily") || useFamilyContext();

// Destructure activeFamily refs used in template for auto-unwrapping
const { isViewingAsParent, parentAccessibleFamilies } = activeFamily;

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
    (f) => f.athleteId !== null && f.athleteId === activeFamily.activeAthleteId.value,
  )?.athleteName ?? undefined;
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
let refreshInFlight = false;
const refreshDashboard = async () => {
  if (refreshInFlight) return;
  if (!activeFamily.activeFamilyId.value || !targetUserId.value) {
    return;
  }

  refreshInFlight = true;
  try {
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
  } finally {
    refreshInFlight = false;
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

onMounted(async () => {
  await dashboardPrefs.loadPreferences();
});
</script>
