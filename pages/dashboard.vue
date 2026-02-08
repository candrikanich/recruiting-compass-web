<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div
      class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <h1 class="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p v-if="user" class="text-slate-600 mt-1">
          Welcome back, {{ userFirstName }}! 👋
        </p>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Parent Context Banner -->
      <ParentContextBanner
        :is-viewing-as-parent="activeFamily.isViewingAsParent.value"
        :athlete-name="activeAthleteName"
      />

      <!-- Stats Cards Component -->
      <DashboardStatsCards
        :coach-count="dashboardData.coachCount.value"
        :school-count="dashboardData.schoolCount.value"
        :interaction-count="dashboardData.interactionCount.value"
        :total-offers="totalOffers"
        :accepted-offers="acceptedOffers"
        :a-tier-school-count="aTierSchoolCount"
        :contacts-this-month="contactsThisMonth"
      />

      <!-- Suggestions Component -->
      <DashboardSuggestions
        :suggestions="suggestionsComposable?.dashboardSuggestions.value || []"
        :is-viewing-as-parent="activeFamily.isViewingAsParent.value || false"
        :athlete-name="activeAthleteName"
        @dismiss="handleSuggestionDismiss"
      />

      <!-- Charts Section -->
      <DashboardChartsSection
        :schools="dashboardData.allSchools.value"
        :interactions="dashboardData.allInteractions.value"
        :school-size-breakdown="schoolSizeBreakdown"
        :school-count="dashboardData.schoolCount.value"
        :recruiting-packet-loading="recruitingPacketLoading"
        :recruiting-packet-error="recruitingPacketError"
        :has-generated-packet="
          recruitingPacketComposable.hasGeneratedPacket.value
        "
        @generate-packet="handleGeneratePacket"
        @email-packet="handleEmailPacket"
      />

      <!-- Metrics Section -->
      <DashboardMetricsSection
        :metrics="dashboardData.allMetrics.value"
        :top-metrics="topMetrics"
        :upcoming-events="upcomingEvents"
        class="mt-6"
      />

      <!-- Map & Activity Section -->
      <DashboardMapActivitySection
        :schools="dashboardData.allSchools.value"
        :show-widget="showWidget"
        class="mt-6"
      />

      <!-- Widgets Section -->
      <DashboardWidgetsSection
        :tasks="userTasksComposable?.tasks.value || []"
        :coaches="dashboardData.allCoaches.value"
        :schools="dashboardData.allSchools.value"
        :interactions="dashboardData.allInteractions.value"
        :offers="dashboardData.allOffers.value"
        :is-parent="userStore.isParent"
        :show-widget="showWidget"
        class="mt-6"
        @add-task="addTask"
        @toggle-task="toggleTask"
        @delete-task="deleteTask"
        @clear-completed="() => userTasksComposable?.clearCompleted()"
      />

      <!-- Email Recruiting Packet Modal -->
      <EmailRecruitingPacketModal
        :is-open="recruitingPacketComposable.showEmailModal.value"
        :available-coaches="dashboardData.allCoaches.value"
        :default-subject="recruitingPacketComposable.defaultEmailSubject.value"
        :default-body="recruitingPacketComposable.defaultEmailBody.value"
        @close="recruitingPacketComposable.setShowEmailModal(false)"
        @send="handleSendEmail"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, inject } from "vue";
import { useRouter } from "vue-router";
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
import ParentContextBanner from "~/components/Dashboard/ParentContextBanner.vue";
import DashboardStatsCards from "~/components/Dashboard/DashboardStatsCards.vue";
import DashboardSuggestions from "~/components/Dashboard/DashboardSuggestions.vue";
import DashboardChartsSection from "~/components/Dashboard/DashboardChartsSection.vue";
import DashboardMetricsSection from "~/components/Dashboard/DashboardMetricsSection.vue";
import DashboardMapActivitySection from "~/components/Dashboard/DashboardMapActivitySection.vue";
import DashboardWidgetsSection from "~/components/Dashboard/DashboardWidgetsSection.vue";
import EmailRecruitingPacketModal from "~/components/EmailRecruitingPacketModal.vue";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import {
  calculateSchoolSizeBreakdown,
  calculateContactsThisMonth,
  calculateTotalOffers,
  calculateAcceptedOffers,
  calculateATierSchoolCount,
  getUpcomingEvents,
  getTopMetrics,
} from "~/utils/dashboardCalculations";

definePageMeta({
  middleware: ["auth", "onboarding"],
});

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
const dashboardData = useDashboardData();

// Inject family context provided at app.vue level (with singleton fallback)
const activeFamily =
  inject<UseActiveFamilyReturn>("activeFamily") || useFamilyContext();

// Local state
const user = ref<any>(null);
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

// Helper to check if widget should be shown based on preferences
// Defaults to showing all widgets when preferences not loaded
const showWidget = (
  _widgetKey: string,
  _section: "statsCards" | "widgets",
): boolean => {
  return true;
};

// Computed statistics using utility functions
const schoolSizeBreakdown = computed(() =>
  calculateSchoolSizeBreakdown(dashboardData.allSchools.value),
);

const contactsThisMonth = computed(() =>
  calculateContactsThisMonth(dashboardData.allInteractions.value),
);

const totalOffers = computed(() =>
  calculateTotalOffers(dashboardData.allOffers.value),
);

const acceptedOffers = computed(() =>
  calculateAcceptedOffers(dashboardData.allOffers.value),
);

const aTierSchoolCount = computed(() =>
  calculateATierSchoolCount(dashboardData.allSchools.value),
);

const upcomingEvents = computed(() =>
  getUpcomingEvents(dashboardData.allEvents.value),
);

const topMetrics = computed(() =>
  getTopMetrics(dashboardData.allMetrics.value, 3),
);

// Task event handlers
const addTask = async (taskText: string) => {
  if (taskText.trim() && userTasksComposable) {
    try {
      await userTasksComposable.addTask(taskText);
      showToast(`Task added!`, "success");
    } catch (err) {
      console.error("Failed to add task:", err);
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
    const message =
      err instanceof Error
        ? err.message
        : "Failed to generate recruiting packet";
    recruitingPacketError.value = message;
    showToast(message, "error");
    console.error("Packet generation error:", err);
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
    const message =
      err instanceof Error ? err.message : "Failed to prepare packet for email";
    recruitingPacketError.value = message;
    showToast(message, "error");
    console.error("Packet email prep error:", err);
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
    const message = err instanceof Error ? err.message : "Failed to send email";
    recruitingPacketError.value = message;
    showToast(message, "error");
    console.error("Email sending error:", err);
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

// Lifecycle
onMounted(async () => {
  if (userStore.user) {
    user.value = userStore.user;

    await refreshDashboard();
    if (notificationsComposable) {
      await notificationsComposable.fetchNotifications();
    }
  }
});

// Watch for athlete switches
watch(
  () => activeFamily.activeAthleteId.value,
  async (newId, oldId) => {
    if (newId && newId !== oldId && activeFamily.isViewingAsParent.value) {
      await refreshDashboard();
    }
  },
);

// Refetch data when returning to dashboard
watch(
  () => router.currentRoute.value.path,
  async (newPath) => {
    if (newPath === "/dashboard") {
      await refreshDashboard();
    }
  },
);

// Watch for user changes
watch(
  () => userStore?.user,
  async (newUser) => {
    user.value = newUser;
    if (newUser && notificationsComposable) {
      await refreshDashboard();
      await notificationsComposable.fetchNotifications();
    }
  },
  { immediate: true },
);
</script>
