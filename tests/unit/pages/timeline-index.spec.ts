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

vi.mock("~/composables/useStatusScore", () => ({
  useStatusScore: () => ({
    statusScore: ref(0),
    statusLabel: ref(null),
    loading: ref(false),
    error: ref(null),
    fetchStatusScore: vi.fn().mockResolvedValue(undefined),
  }),
}));

import TimelineIndexPage from "~/pages/timeline/index.vue";

describe("pages/timeline/index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPhaseMock.mockResolvedValue(undefined);
  });

  const mountPage = () =>
    mount(TimelineIndexPage, {
      global: {
        stubs: {
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
});
