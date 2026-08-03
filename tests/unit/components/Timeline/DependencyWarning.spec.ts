import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DependencyWarning from "~/components/Timeline/DependencyWarning.vue";
import type { Task, TaskWithStatus } from "~/types/timeline";

const makeTask = (overrides: Partial<TaskWithStatus> = {}): TaskWithStatus => ({
  id: "task-1",
  category: "academic",
  grade_level: 10,
  title: "Complete FAFSA",
  description: null,
  required: false,
  dependency_task_ids: [],
  why_it_matters: null,
  failure_risk: null,
  division_applicability: ["ALL"],
  deadline_date: null,
  created_at: null,
  updated_at: null,
  has_incomplete_prerequisites: true,
  ...overrides,
});

const makePrereq = (id: string, title: string): Task => ({
  id,
  category: "academic",
  grade_level: 10,
  title,
  description: null,
  required: false,
  dependency_task_ids: [],
  why_it_matters: null,
  failure_risk: null,
  division_applicability: ["ALL"],
  deadline_date: null,
  created_at: null,
  updated_at: null,
});

describe("DependencyWarning", () => {
  it("lists prerequisites and shows the complete-prerequisite button when they are incomplete", () => {
    const wrapper = mount(DependencyWarning, {
      props: {
        task: makeTask({
          prerequisite_tasks: [makePrereq("prereq-1", "Register for SAT")],
        }),
      },
    });

    expect(wrapper.text()).toContain("Register for SAT");
    expect(wrapper.text()).toContain("Complete Prerequisite");
  });

  it("hides prerequisites already marked complete on the parent task", () => {
    const wrapper = mount(DependencyWarning, {
      props: {
        task: makeTask({
          prerequisite_tasks: [makePrereq("prereq-1", "Register for SAT")],
          athlete_task: {
            id: "at-1",
            athlete_id: "athlete-1",
            task_id: "task-1",
            status: "completed",
            completed_at: "2026-01-01",
            is_recovery_task: false,
            created_at: null,
            updated_at: null,
          },
        }),
      },
    });

    expect(wrapper.text()).not.toContain("Register for SAT");
    expect(wrapper.text()).not.toContain("Complete Prerequisite");
  });

  it("renders no prerequisite rows when prerequisite_tasks is absent", () => {
    const wrapper = mount(DependencyWarning, {
      props: { task: makeTask({ prerequisite_tasks: undefined }) },
    });

    expect(wrapper.find("span.font-medium").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Complete Prerequisite");
  });

  it("shows why_it_matters copy when present", () => {
    const wrapper = mount(DependencyWarning, {
      props: {
        task: makeTask({
          why_it_matters: "Coaches expect this before offers.",
          prerequisite_tasks: [makePrereq("prereq-1", "Register for SAT")],
        }),
      },
    });

    expect(wrapper.text()).toContain("Coaches expect this before offers.");
  });

  it("emits complete-prerequisite with the first incomplete prerequisite id", async () => {
    const wrapper = mount(DependencyWarning, {
      props: {
        task: makeTask({
          prerequisite_tasks: [makePrereq("prereq-1", "Register for SAT")],
        }),
      },
    });

    const buttons = wrapper.findAll("button");
    const completeButton = buttons.find((b) =>
      b.text().includes("Complete Prerequisite"),
    );
    await completeButton?.trigger("click");
    expect(wrapper.emitted("complete-prerequisite")).toEqual([["prereq-1"]]);
  });

  it("hides the continue-anyway button when showContinueOption is false", () => {
    const wrapper = mount(DependencyWarning, {
      props: {
        task: makeTask({
          prerequisite_tasks: [makePrereq("prereq-1", "Register for SAT")],
        }),
        showContinueOption: false,
      },
    });

    expect(wrapper.text()).not.toContain("Continue Anyway");
  });
});
