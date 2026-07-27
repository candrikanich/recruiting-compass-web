import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TaskItem from "~/components/Timeline/TaskItem.vue";
import type { TaskWithStatus } from "~/types/timeline";

/**
 * Bug: composables/useParentContext.ts:64 + components/Timeline/TaskItem.vue:215
 * (planning/audit-2026-07-27-findings.md). useParentContext read a
 * nonexistent `linked_accounts` field on the user object, so
 * isViewingAsParent was permanently false and the read-only checkbox guard
 * never activated — a parent viewing an athlete's tasks could toggle
 * completion they shouldn't be able to touch.
 *
 * Fixed by rewiring TaskItem.vue to read isViewingAsParent from the
 * consolidated active-family context (Phase 4's useActiveFamily /
 * useFamilyContext) via provide/inject, matching the useEvents.ts precedent.
 * This is a pure component-reactivity bug (no cross-account data resolution
 * or authz), so a mounted-component unit test proves it directly — no live
 * DB or browser needed.
 */

const baseTask: TaskWithStatus = {
  id: "task-1",
  category: "academic",
  grade_level: 10,
  title: "Test Task",
  description: null,
  required: false,
  dependency_task_ids: [],
  why_it_matters: null,
  failure_risk: null,
  division_applicability: ["ALL"],
  deadline_date: null,
  created_at: null,
  updated_at: null,
  athlete_task: undefined,
  has_incomplete_prerequisites: false,
};

function mountTaskItem(isViewingAsParent: boolean) {
  return mount(TaskItem, {
    props: { task: baseTask },
    global: {
      provide: {
        activeFamily: {
          isViewingAsParent: { value: isViewingAsParent },
        },
      },
      stubs: {
        DeadlineBadge: true,
        StatusIndicator: true,
        DependencyWarning: true,
      },
    },
  });
}

describe("TaskItem — parent read-only guard", () => {
  it("disables the completion checkbox when the active-family context says a parent is viewing", () => {
    const wrapper = mountTaskItem(true);
    const checkbox = wrapper.find("input[type='checkbox']");

    expect(checkbox.attributes("disabled")).toBeDefined();
  });

  it("enables the completion checkbox for the athlete viewing their own tasks", () => {
    const wrapper = mountTaskItem(false);
    const checkbox = wrapper.find("input[type='checkbox']");

    expect(checkbox.attributes("disabled")).toBeUndefined();
  });
});
