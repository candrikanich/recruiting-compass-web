import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref, reactive, computed, onMounted } from "vue";
import DesignSystemEmptyState from "~/components/DesignSystem/EmptyState.vue";

// pages/deadlines.vue has no explicit `import { ref } from "vue"` — it
// relies on Nuxt's auto-import, which vitest doesn't provide.
Object.assign(global, { ref, reactive, computed, onMounted });

// All pages under test are behind `middleware: "auth"` (mocked no-op via
// global.definePageMeta in tests/setup.ts) and render their empty state via
// DesignSystemEmptyState (globally registered in tests/setup.ts).

vi.mock("~/composables/useEvents", () => ({
  useEvents: () => ({
    events: ref([]),
    loading: ref(false),
    fetchEvents: vi.fn(),
    deleteEvent: vi.fn(),
  }),
}));
vi.mock("~/composables/useEventStats", () => ({
  useEventStats: () => ({ stats: ref([]) }),
}));

vi.mock("~/stores/offers", () => ({
  useOffersStore: () => ({
    offers: ref([]),
    acceptedOffers: ref([]),
    pendingOffers: ref([]),
    declinedOffers: ref([]),
    loading: ref(false),
    softWarnVisible: ref(false),
    totalCount: ref(0),
    fetchOffers: vi.fn(),
    createOffer: vi.fn(),
    deleteOffer: vi.fn(),
    daysUntilDeadline: vi.fn(),
  }),
}));

vi.mock("~/composables/useDocumentsConsolidated", () => ({
  useDocumentsConsolidated: () => ({
    documents: ref([]),
    loading: ref(false),
    error: ref(null),
    fetchDocuments: vi.fn(),
    deleteDocument: vi.fn(),
  }),
}));

vi.mock("~/composables/usePerformance", () => ({
  usePerformance: () => ({
    metrics: ref([]),
    loading: ref(false),
    fetchMetrics: vi.fn(),
    deleteMetric: vi.fn(),
    updateMetric: vi.fn(),
    setPrimaryMetric: vi.fn(),
    clearPrimaryMetric: vi.fn(),
  }),
}));
vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => ({
    playerPrefs: { loadPreferences: vi.fn() },
    getPlayerDetails: vi.fn(),
  }),
}));

// pages/deadlines.vue relies on Nuxt auto-import (no explicit import
// statement), so it must be stubbed as a global rather than via vi.mock.
(global as unknown as { useDeadlines: () => unknown }).useDeadlines = () => ({
  deadlines: ref([]),
  loading: ref(false),
  error: ref(null),
  fetchDeadlines: vi.fn(),
  createDeadline: vi.fn(),
  removeDeadline: vi.fn(),
});

vi.mock("~/composables/useRecommendationLetters", () => ({
  useRecommendationLetters: () => ({
    letters: ref([]),
    loading: ref(false),
    error: ref(null),
    fetchLetters: vi.fn(),
    saveLetter: vi.fn(),
    deleteLetter: vi.fn(),
  }),
}));

vi.mock("~/composables/useTasks", () => ({
  useTasks: () => ({
    tasksWithStatus: ref([]),
    loading: ref(false),
    error: ref(null),
    fetchTasksWithStatus: vi.fn(),
    updateTaskStatus: vi.fn(),
    getCompletionStats: vi.fn(() => ({ completed: 0, total: 0 })),
    isTaskLocked: vi.fn(() => false),
    lockedTaskIds: ref([]),
  }),
}));
vi.mock("~/composables/useAuth", () => ({
  useAuth: () => ({ session: ref(null) }),
}));

vi.mock("~/composables/useActivityFeed", () => ({
  useActivityFeed: () => ({
    activities: ref([]),
    loading: ref(false),
    error: ref(null),
    fetchActivities: vi.fn(),
  }),
}));

vi.mock("~/composables/useDashboardData", () => ({
  useDashboardData: () => ({
    allSchools: ref([]),
    allOffers: ref([]),
    schoolCount: ref(0),
    interactionCount: ref(0),
    fetchAll: vi.fn(),
  }),
}));

vi.mock("~/composables/useCommunicationTemplates", () => ({
  useCommunicationTemplates: () => ({
    templates: ref([]),
    loadUserTemplates: vi.fn(),
  }),
}));

// Shared across events/offers/documents/performance/recommendations/tasks/analytics
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: ref([]),
    fetchSchools: vi.fn(),
  }),
}));
vi.mock("~/composables/useFamilyCtx", () => ({
  useFamilyCtx: () => ({
    activeFamilyId: ref("family-1"),
    activeAthleteId: ref("athlete-1"),
    isViewingAsParent: ref(false),
    parentAccessibleFamilies: ref([]),
    switchAthlete: vi.fn(),
  }),
}));
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));
vi.mock("~/composables/useErrorHandler", () => ({
  useErrorHandler: () => ({
    getErrorMessage: vi.fn((err: unknown) => String(err)),
    logError: vi.fn(),
  }),
}));
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ user: { id: "user-1" } }),
}));

describe("Empty states — DesignSystemEmptyState adoption", () => {
  it("Events page renders DesignSystemEmptyState with CTA when no events", async () => {
    const EventsPage = (await import("~/pages/events/index.vue")).default;
    const wrapper = mount(EventsPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No events yet");
    expect(wrapper.text()).toContain("Schedule Your First Event");
  });

  it("Offers page renders DesignSystemEmptyState with CTA when no offers", async () => {
    const OffersPage = (await import("~/pages/offers/index.vue")).default;
    const wrapper = mount(OffersPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No offers tracked");
    expect(wrapper.text()).toContain("Track Your First Offer");
  });

  it("Documents page renders DesignSystemEmptyState with CTA when no documents", async () => {
    const DocumentsPage = (await import("~/pages/documents/index.vue"))
      .default;
    const wrapper = mount(DocumentsPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No documents yet");
    expect(wrapper.text()).toContain("Upload Your First Document");
  });

  it("Performance page renders DesignSystemEmptyState with CTA when no metrics", async () => {
    const PerformancePage = (await import("~/pages/performance/index.vue"))
      .default;
    const wrapper = mount(PerformancePage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No stats logged");
    expect(wrapper.text()).toContain("Log Your First Stats");
  });

  it("Deadlines page renders DesignSystemEmptyState with CTA when no deadlines", async () => {
    const DeadlinesPage = (await import("~/pages/deadlines.vue")).default;
    const wrapper = mount(DeadlinesPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No deadlines yet");
    expect(wrapper.text()).toContain("View Recruiting Deadlines");
  });

  it("Recommendations page renders DesignSystemEmptyState with CTA when no letters", async () => {
    const RecommendationsPage = (
      await import("~/pages/recommendations/index.vue")
    ).default;
    const wrapper = mount(RecommendationsPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No recommendations");
    expect(wrapper.text()).toContain("Request a Recommendation");
  });

  it("Tasks page renders DesignSystemEmptyState when no tasks", async () => {
    const TasksPage = (await import("~/pages/tasks/index.vue")).default;
    const wrapper = mount(TasksPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No tasks yet");
    expect(wrapper.text()).toContain("Your tasks appear as you progress");
  });

  it("Templates page renders DesignSystemEmptyState when no templates", async () => {
    const TemplatesPage = (
      await import("~/pages/settings/communication-templates.vue")
    ).default;
    const wrapper = mount(TemplatesPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No templates found");
    expect(wrapper.text()).toContain("Browse Coach Outreach Templates");
  });

  it("Activity page renders DesignSystemEmptyState (not blank) when no activity", async () => {
    const ActivityPage = (await import("~/pages/activity.vue")).default;
    const wrapper = mount(ActivityPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No activity yet");
    expect(wrapper.text()).toContain(
      "Your activity feed starts when you begin tracking",
    );
    // Regression guard for the reported "blank white space" bug.
    expect(wrapper.text().trim().length).toBeGreaterThan(0);
  });

  it("Analytics page renders DesignSystemEmptyState with CTA when no schools", async () => {
    const AnalyticsPage = (await import("~/pages/analytics/index.vue"))
      .default;
    const wrapper = mount(AnalyticsPage);
    await flushPromises();
    expect(
      wrapper.findComponent(DesignSystemEmptyState).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("No analytics yet");
    expect(wrapper.text()).toContain(
      "Add a school to see recruiting analytics",
    );
  });
});
