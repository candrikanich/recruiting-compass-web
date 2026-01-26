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
      <div
        v-if="parentContextComposable?.isViewingAsParent.value"
        class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6"
      >
        <div class="flex items-center">
          <EyeIcon class="w-5 h-5 text-indigo-600 mr-3" />
          <p class="text-sm text-indigo-800">
            You're viewing
            <strong
              >{{
                parentContextComposable?.getCurrentAthlete()?.full_name ||
                "this athlete"
              }}'s</strong
            >
            recruiting data. Data is read-only. Your views are visible to them.
          </p>
        </div>
      </div>

      <!-- Stats Cards Component -->
      <DashboardStatsCards
        :coach-count="coachCount"
        :school-count="schoolCount"
        :interaction-count="interactionCount"
        :total-offers="totalOffers"
        :accepted-offers="acceptedOffers"
        :a-tier-school-count="aTierSchoolCount"
        :contacts-this-month="contactsThisMonth"
      />

      <!-- Athlete Tools Bar -->
      <div class="flex flex-wrap gap-3 my-6">
        <button
          @click="handleGeneratePacket"
          :disabled="recruitingPacketLoading"
          class="inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
          :class="recruitingPacketLoading
            ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md'"
        >
          <svg
            v-if="!recruitingPacketLoading"
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-4-2m4 2l4-2"
            />
          </svg>
          <svg
            v-else
            class="w-4 h-4 mr-2 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {{ recruitingPacketLoading ? "Generating..." : "Generate Recruiting Packet" }}
        </button>

        <button
          @click="handleEmailPacket"
          :disabled="!recruitingPacketComposable.hasGeneratedPacket.value || recruitingPacketLoading"
          class="inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
          :class="!recruitingPacketComposable.hasGeneratedPacket.value || recruitingPacketLoading
            ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-sm hover:shadow-md'"
        >
          <svg
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Email to Coach
        </button>
      </div>

      <!-- Recruiting Packet Error -->
      <div
        v-if="recruitingPacketError"
        class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
      >
        {{ recruitingPacketError }}
      </div>

      <!-- Suggestions Component -->
      <DashboardSuggestions
        :suggestions="suggestionsComposable?.dashboardSuggestions.value || []"
        :is-viewing-as-parent="
          parentContextComposable?.isViewingAsParent.value || false
        "
        :athlete-name="parentContextComposable?.getCurrentAthlete()?.full_name"
        @dismiss="handleSuggestionDismiss"
      />

      <!-- Main Grid: 2/3 + 1/3 Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Charts Component -->
        <DashboardCharts
          :school-count="schoolCount"
          :school-size-breakdown="schoolSizeBreakdown"
          :metrics="allMetrics"
          :top-metrics="topMetrics"
          :interactions="allInteractions"
          :schools="allSchools"
          :graduation-year="graduationYear"
          :athlete-id="parentContextComposable?.currentAthleteId.value || ''"
          :is-viewing-as-parent="
            parentContextComposable?.isViewingAsParent.value || false
          "
          :show-calendar="showWidget('recruitingCalendar', 'widgets')"
        />

        <!-- Right Column - Analytics Component -->
        <DashboardAnalytics
          :upcoming-events="upcomingEvents"
          :notifications="recentNotifications"
          :tasks="userTasksComposable?.tasks.value || []"
          :contact-frequency-interactions="allInteractions"
          :schools="allSchools"
          @refresh-notifications="generateNotifications"
          @notification-click="handleNotificationClick"
          @add-task="addTask"
          @toggle-task="toggleTask"
          @delete-task="deleteTask"
          @clear-completed="() => userTasksComposable?.clearCompleted()"
        />
      </div>

      <!-- Additional Widgets (Full Width) -->
      <div class="mt-8 space-y-6">
        <RecentActivityFeed v-if="showWidget('recentActivityFeed', 'widgets')" />
        <AthleteActivityWidget v-if="userStore.isParent && showWidget('athleteActivity', 'widgets')" />
        <LinkedAccountsWidget v-if="showWidget('linkedAccounts', 'widgets')" />
        <SchoolMapWidget
          v-if="showWidget('schoolMapWidget', 'widgets')"
          :schools="allSchools"
        />
        <CoachFollowupWidget
          v-if="showWidget('coachFollowupWidget', 'widgets')"
        />
        <AtAGlanceSummary
          v-if="showWidget('atAGlanceSummary', 'widgets')"
          :coaches="allCoaches"
          :schools="allSchools"
          :interactions="allInteractions"
          :offers="allOffers"
        />
      </div>

      <!-- Email Recruiting Packet Modal -->
      <EmailRecruitingPacketModal
        :is-open="recruitingPacketComposable.showEmailModal.value"
        :available-coaches="allCoaches"
        :default-subject="recruitingPacketComposable.defaultEmailSubject.value"
        :default-body="recruitingPacketComposable.defaultEmailBody.value"
        @close="recruitingPacketComposable.setShowEmailModal(false)"
        @send="handleSendEmail"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useNotificationStore } from "~/stores/notifications";
import { useNotifications } from "~/composables/useNotifications";
import { useDocuments } from "~/composables/useDocuments";
import { useToast } from "~/composables/useToast";
import { useUserTasks } from "~/composables/useUserTasks";
import { useUserPreferences } from "~/composables/useUserPreferences";
import { useSuggestions } from "~/composables/useSuggestions";
import { useParentContext } from "~/composables/useParentContext";
import { useViewLogging } from "~/composables/useViewLogging";
import { useRecruitingPacket } from "~/composables/useRecruitingPacket";
import DashboardStatsCards from "~/components/Dashboard/DashboardStatsCards.vue";
import DashboardSuggestions from "~/components/Dashboard/DashboardSuggestions.vue";
import DashboardCharts from "~/components/Dashboard/DashboardCharts.vue";
import DashboardAnalytics from "~/components/Dashboard/DashboardAnalytics.vue";
import AthleteActivityWidget from "~/components/Dashboard/AthleteActivityWidget.vue";
import SchoolMapWidget from "~/components/Dashboard/SchoolMapWidget.vue";
import CoachFollowupWidget from "~/components/Dashboard/CoachFollowupWidget.vue";
import AtAGlanceSummary from "~/components/Dashboard/AtAGlanceSummary.vue";
import LinkedAccountsWidget from "~/components/Dashboard/LinkedAccountsWidget.vue";
import RecentActivityFeed from "~/components/Dashboard/RecentActivityFeed.vue";
import EmailRecruitingPacketModal from "~/components/EmailRecruitingPacketModal.vue";
import { EyeIcon } from "@heroicons/vue/24/solid";
import { getCarnegieSize } from "~/utils/schoolSize";
import type {
  Coach,
  School,
  Interaction,
  Offer,
  Event,
  Notification,
  PerformanceMetric,
} from "~/types/models";

definePageMeta({
  middleware: ["auth", "onboarding"],
});

const { logout } = useAuth();
const supabase = useSupabase();
const { showToast } = useToast();

// Store-dependent composables: Now properly initialized via Pinia module
const userStore = useUserStore();
const notificationStore = useNotificationStore();
const notificationsComposable = useNotifications();
const documentsComposable = useDocuments();
const userPreferencesComposable = useUserPreferences();
const userTasksComposable = useUserTasks();
const suggestionsComposable = useSuggestions();
const parentContextComposable = useParentContext();
const viewLoggingComposable = useViewLogging();
const recruitingPacketComposable = useRecruitingPacket();

const user = ref<any>(null);
const recruitingPacketLoading = ref(false);
const recruitingPacketError = ref<string | null>(null);
const coachCount = ref(0);
const schoolCount = ref(0);
const interactionCount = ref(0);
const allCoaches = ref<Coach[]>([]);
const allSchools = ref<School[]>([]);
const allInteractions = ref<Interaction[]>([]);
const allOffers = ref<Offer[]>([]);
const allEvents = ref<Event[]>([]);
const allMetrics = ref<PerformanceMetric[]>([]);
const showTaskForm = ref(false);
const newTask = ref("");
const generatingNotifications = ref(false);
const graduationYear = computed(() => {
  return (
    userPreferencesComposable?.preferences.value?.player_details
      ?.graduation_year || new Date().getFullYear() + 4
  );
});

// Determine target user ID (current user or viewed athlete if parent)
const targetUserId = computed(() => {
  return parentContextComposable?.isViewingAsParent.value
    ? parentContextComposable.currentAthleteId.value
    : userStore?.user?.id;
});

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
const showWidget = (
  widgetKey: string,
  section: "statsCards" | "widgets",
): boolean => {
  const layout = userPreferencesComposable?.preferences.value?.dashboard_layout;
  if (!layout) return true;
  return (layout[section] as Record<string, boolean>)?.[widgetKey] ?? true;
};

const recentNotifications = computed(() => {
  return notificationsComposable?.notifications.value.slice(0, 5) || [];
});

// Upcoming events (sorted by date)
const upcomingEvents = computed(() => {
  const now = new Date();
  return allEvents.value
    .filter((e) => new Date(e.start_date) >= now)
    .sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    )
    .slice(0, 5);
});

// Top 3 performance metrics
const topMetrics = computed(() => {
  return allMetrics.value.slice(0, 3);
});

const totalOffers = computed(() => {
  return allOffers.value.length;
});

const acceptedOffers = computed(() => {
  return allOffers.value.filter((o) => o.status === "accepted").length;
});

const aTierSchoolCount = computed(() => {
  return allSchools.value.filter((s) => s.priority_tier === "A").length;
});

const contactsThisMonth = computed(() => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return allInteractions.value.filter((i) => {
    const interactionDate = new Date(i.occurred_at || i.created_at || "");
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;
});

// Calculate school size breakdown
const schoolSizeBreakdown = computed(() => {
  const breakdown: Record<string, number> = {
    "Very Small": 0,
    Small: 0,
    Medium: 0,
    Large: 0,
    "Very Large": 0,
  };

  allSchools.value.forEach((school) => {
    const studentSize = school.academic_info?.student_size;
    if (studentSize) {
      const size = getCarnegieSize(
        typeof studentSize === "number" ? studentSize : null,
      );
      if (size && size in breakdown) {
        breakdown[size]++;
      }
    }
  });

  return breakdown;
});

const addTask = async () => {
  if (newTask.value.trim() && userTasksComposable) {
    await userTasksComposable.addTask(newTask.value);
    newTask.value = "";
    showTaskForm.value = false;
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

const handleSuggestionDismiss = async (suggestionId: string) => {
  if (suggestionsComposable) {
    await suggestionsComposable.dismissSuggestion(suggestionId);
  }
};

const fetchCounts = async () => {
  if (!targetUserId.value) {
    return;
  }

  try {
    // Fetch schools
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("schools")
      .select("*")
      .eq("user_id", targetUserId.value);

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError);
    } else if (schoolsData) {
      allSchools.value = schoolsData;
      schoolCount.value = schoolsData.length;
    }

    // Fetch coaches
    if (allSchools.value.length > 0) {
      const schoolIds = allSchools.value.map((s) => s.id);
      const {
        data: coachesData,
        count: coachesCount,
        error: coachesError,
      } = await supabase
        .from("coaches")
        .select("*", { count: "exact" })
        .in("school_id", schoolIds);

      if (!coachesError) {
        allCoaches.value = coachesData || [];
        coachCount.value = coachesCount || 0;
      }
    }

    // Fetch interactions
    const {
      data: interactionsData,
      count: interactionsCount,
      error: interactionsError,
    } = await supabase
      .from("interactions")
      .select("*", { count: "exact" })
      .eq("logged_by", targetUserId.value);

    if (!interactionsError && interactionsData) {
      allInteractions.value = interactionsData;
      interactionCount.value = interactionsCount || 0;
    }

    // Fetch offers
    try {
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select("*")
        .eq("user_id", targetUserId.value);

      if (!offersError && offersData) {
        allOffers.value = offersData;
      }
    } catch (err) {
      allOffers.value = [];
    }

    // Fetch events
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", targetUserId.value);

      if (!eventsError && eventsData) {
        allEvents.value = eventsData;
      }
    } catch (err) {
      allEvents.value = [];
    }

    // Fetch performance metrics
    try {
      const { data: metricsData, error: metricsError } = await supabase
        .from("performance_metrics")
        .select("*")
        .eq("user_id", targetUserId.value);

      if (!metricsError && metricsData) {
        allMetrics.value = metricsData;
      }
    } catch (err) {
      allMetrics.value = [];
    }
  } catch (err) {
    console.error("Error fetching counts:", err);
  }
};

onMounted(async () => {
  // Initialize data loading now that Pinia is properly configured
  if (userStore.user) {
    user.value = userStore.user;
    await fetchCounts();
    if (notificationsComposable) {
      await notificationsComposable.fetchNotifications();
    }
    // Fetch suggestions on dashboard load
    if (suggestionsComposable) {
      await suggestionsComposable.fetchSuggestions("dashboard");
    }
  }
});

// Watch for athlete switches
watch(
  () => parentContextComposable?.currentAthleteId.value,
  async (newId, oldId) => {
    if (
      newId &&
      newId !== oldId &&
      parentContextComposable?.isViewingAsParent.value
    ) {
      await fetchCounts();
      await suggestionsComposable?.fetchSuggestions("dashboard");
      await viewLoggingComposable?.logParentView("dashboard", newId);
    }
  },
);

const generateNotifications = async () => {
  if (!notificationsComposable) return;

  try {
    generatingNotifications.value = true;
    const result = await $fetch("/api/notifications/generate", {
      method: "POST",
    });

    if (result.success) {
      showToast(`Created ${result.created} notifications`, "success");
      await notificationsComposable.fetchNotifications();
    }
  } catch (err) {
    console.error("Error generating notifications:", err);
    showToast("Failed to generate notifications", "error");
  } finally {
    generatingNotifications.value = false;
  }
};

const handleNotificationClick = (notification: Notification) => {
  if (!notification.read_at && notificationsComposable) {
    notificationsComposable.markAsRead(notification.id);
  }
};

const handleGeneratePacket = async () => {
  recruitingPacketLoading.value = true;
  recruitingPacketError.value = null;

  try {
    await recruitingPacketComposable.openPacketPreview();
    showToast("Recruiting packet generated successfully!", "success");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate recruiting packet";
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
      "success"
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    recruitingPacketError.value = message;
    showToast(message, "error");
    console.error("Email sending error:", err);
  }
};

watch(
  () => userStore?.user,
  async (newUser) => {
    user.value = newUser;
    if (newUser && notificationsComposable) {
      await fetchCounts();
      await notificationsComposable.fetchNotifications();
    }
  },
  { immediate: true },
);
</script>
