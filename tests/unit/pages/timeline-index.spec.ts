import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const showToastMock = vi.fn();
const updateTaskStatusMock = vi.fn();
const fetchPhaseMock = vi.fn().mockResolvedValue(undefined);

const sampleTask = {
  id: "task-1",
  title: "Register for the SAT",
  grade_level: 9,
  dependency_task_ids: [],
  athlete_task: { status: "not_started" },
};

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

vi.mock("~/composables/useTasks", () => ({
  useTasks: () => ({
    tasksWithStatus: ref([sampleTask]),
    updateTaskStatus: updateTaskStatusMock,
    loading: ref(false),
    error: ref(null),
    fetchTasksWithStatus: vi.fn().mockResolvedValue(undefined),
    isTaskLocked: vi.fn(() => false),
  }),
}));

vi.mock("~/composables/usePhaseCalculation", () => ({
  usePhaseCalculation: () => ({
    currentPhase: ref(null),
    milestoneProgress: ref(null),
    loading: ref(false),
    error: ref(null),
    fetchPhase: fetchPhaseMock,
  }),
}));

const statusLabelRef = ref<string | null>(null);

vi.mock("~/composables/useStatusScore", () => ({
  useStatusScore: () => ({
    statusScore: ref(0),
    statusLabel: statusLabelRef,
    loading: ref(false),
    error: ref(null),
    fetchStatusScore: vi.fn().mockResolvedValue(undefined),
  }),
}));

const playerDetailsRef = ref<{
  primary_sport?: string;
  gender?: string | null;
  graduation_year?: number;
} | null>(null);
const loadPlayerPreferencesMock = vi.fn().mockResolvedValue(undefined);

vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => ({
    getPlayerDetails: () => playerDetailsRef.value,
    playerPrefs: { loadPreferences: loadPlayerPreferencesMock },
  }),
}));

const getUpcomingMilestonesSpy = vi.fn();
vi.mock("~/utils/recruitingCalendar", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("~/utils/recruitingCalendar")>();
  return {
    ...actual,
    getUpcomingMilestones: (
      params: Parameters<typeof actual.getUpcomingMilestones>[0],
    ) => {
      getUpcomingMilestonesSpy(params);
      return actual.getUpcomingMilestones(params);
    },
  };
});

import TimelineIndexPage from "~/pages/timeline/index.vue";

describe("pages/timeline/index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPhaseMock.mockResolvedValue(undefined);
    statusLabelRef.value = null;
    playerDetailsRef.value = null;
    loadPlayerPreferencesMock.mockResolvedValue(undefined);
    getUpcomingMilestonesSpy.mockClear();
  });

  const mountPage = () =>
    mount(TimelineIndexPage, {
      global: {
        stubs: {
          PageHeader: { template: '<div><slot name="actions" /></div>' },
          PhaseCardInline: true,
          TimelineStatPills: true,
          WhatMattersNow: true,
          CommonWorries: true,
          WhatNotToStress: true,
          UpcomingMilestones: true,
        },
      },
    });

  it("shows a visible, generic error when toggling a task status fails", async () => {
    updateTaskStatusMock.mockRejectedValue(
      new Error('null value in column "status" violates not-null constraint'),
    );
    const wrapper = mountPage();
    const vm = wrapper.vm as any;

    await vm.handleTaskToggle("task-1");

    expect(updateTaskStatusMock).toHaveBeenCalledWith("task-1", "completed");
    expect(showToastMock).toHaveBeenCalledTimes(1);

    const [message, type] = showToastMock.mock.calls[0];
    expect(type).toBe("error");
    expect(message).toMatch(/something went wrong/i);
    expect(message).not.toMatch(/constraint|column/i);

    // Task state in the local list is untouched by the failed toggle
    expect(vm.tasksWithStatus[0].athlete_task.status).toBe("not_started");
  });

  it("does not show an error toast when the toggle succeeds", async () => {
    updateTaskStatusMock.mockResolvedValue({ status: "completed" });
    const wrapper = mountPage();
    const vm = wrapper.vm as any;

    await vm.handleTaskToggle("task-1");

    expect(updateTaskStatusMock).toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("conveys status with visible text, not color alone", async () => {
    statusLabelRef.value = "slightly_behind";
    const wrapper = mountPage();
    await wrapper.vm.$nextTick();

    const label = wrapper.find("[data-testid='status-label-text']");
    expect(label.exists()).toBe(true);
    expect(label.text()).toBe("Slightly Behind");

    statusLabelRef.value = "at_risk";
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='status-label-text']").text()).toBe(
      "At Risk",
    );
  });

  describe("sport-aware upcoming milestones", () => {
    it("resolves milestones through the sport-aware resolver with the athlete's real sport/gender/graduation year — not the legacy baseball/D1-only helper", async () => {
      playerDetailsRef.value = {
        primary_sport: "Softball",
        gender: "female",
        graduation_year: 2027,
      };
      const wrapper = mountPage();
      await wrapper.vm.$nextTick();

      // The resolver call now lives in the embedded <RecruitingCalendar>
      // (single milestone-row source) rather than a page-level computed, so
      // opts also carries the calendar's footballSubdivision default. Athlete's
      // real sport/gender/graduation year must still flow through.
      expect(getUpcomingMilestonesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sport: "Softball",
          division: "D1",
          graduationYear: 2027,
          opts: expect.objectContaining({ gender: "female" }),
        }),
      );
    });

    it("falls back to a neutral sport (no NCAA calendar) when the profile has no primary_sport", async () => {
      playerDetailsRef.value = { graduation_year: 2027 };
      const wrapper = mountPage();
      await wrapper.vm.$nextTick();
      const vm = wrapper.vm as any;

      expect(vm.athleteSport).toBe("Tennis");
    });

    it("loads player preferences on mount so sport/gender are available", async () => {
      mountPage();
      await Promise.resolve();

      expect(loadPlayerPreferencesMock).toHaveBeenCalled();
    });
  });
});
