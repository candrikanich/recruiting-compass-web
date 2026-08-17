import { describe, it, expect } from "vitest";
import type {
  AthleteTask,
  TaskCategory,
  TaskStatus,
  TaskWithStatus,
} from "~/types/timeline";
import { compareTimelineTasks } from "./taskSort";

type TaskOverrides = Partial<TaskWithStatus> & {
  id: string;
  status?: TaskStatus;
};

function makeTask(overrides: TaskOverrides): TaskWithStatus {
  const { status, ...taskOverrides } = overrides;

  const athleteTask: AthleteTask | undefined = status
    ? {
        id: `at-${taskOverrides.id}`,
        athlete_id: "athlete-1",
        task_id: taskOverrides.id,
        status,
        completed_at: status === "completed" ? "2026-01-01T00:00:00Z" : null,
        is_recovery_task: false,
        created_at: null,
        updated_at: null,
      }
    : undefined;

  return {
    id: taskOverrides.id,
    category: "academic",
    grade_level: 11,
    title: taskOverrides.id,
    description: null,
    required: true,
    dependency_task_ids: [],
    why_it_matters: null,
    failure_risk: null,
    division_applicability: ["ALL"],
    deadline_date: null,
    created_at: null,
    updated_at: null,
    has_incomplete_prerequisites: false,
    athlete_task: athleteTask,
    ...taskOverrides,
  };
}

function sortedIds(tasks: TaskWithStatus[]): string[] {
  return [...tasks].sort(compareTimelineTasks).map((t) => t.id);
}

describe("compareTimelineTasks", () => {
  it("sinks completed tasks below incomplete ones", () => {
    const tasks = [
      makeTask({ id: "done", status: "completed" }),
      makeTask({ id: "in-progress", status: "in_progress" }),
      makeTask({ id: "untouched" }),
    ];

    expect(sortedIds(tasks)).toEqual(["in-progress", "untouched", "done"]);
  });

  it("sinks locked tasks below actionable ones", () => {
    const tasks = [
      makeTask({ id: "locked", has_incomplete_prerequisites: true }),
      makeTask({ id: "actionable" }),
    ];

    expect(sortedIds(tasks)).toEqual(["actionable", "locked"]);
  });

  it("ranks completion above lock state", () => {
    const tasks = [
      makeTask({ id: "completed-actionable", status: "completed" }),
      makeTask({ id: "incomplete-locked", has_incomplete_prerequisites: true }),
    ];

    expect(sortedIds(tasks)).toEqual([
      "incomplete-locked",
      "completed-actionable",
    ]);
  });

  it("orders required tasks before optional ones", () => {
    const tasks = [
      makeTask({ id: "optional", required: false }),
      makeTask({ id: "required", required: true }),
    ];

    expect(sortedIds(tasks)).toEqual(["required", "optional"]);
  });

  it("orders by deadline ascending with missing deadlines last", () => {
    const tasks = [
      makeTask({ id: "none", deadline_date: null }),
      makeTask({ id: "later", deadline_date: "2026-12-01" }),
      makeTask({ id: "sooner", deadline_date: "2026-03-15" }),
    ];

    expect(sortedIds(tasks)).toEqual(["sooner", "later", "none"]);
  });

  it("orders by category weight, with unknown categories last", () => {
    const tasks = [
      makeTask({ id: "mindset", category: "mindset" }),
      makeTask({ id: "exposure", category: "exposure" }),
      makeTask({ id: "athletic", category: "athletic" }),
      makeTask({ id: "recruiting", category: "recruiting" }),
      makeTask({ id: "academic", category: "academic" }),
      makeTask({
        id: "unknown",
        category: "wellness" as unknown as TaskCategory,
      }),
    ];

    expect(sortedIds(tasks)).toEqual([
      "academic",
      "recruiting",
      "athletic",
      "exposure",
      "mindset",
      "unknown",
    ]);
  });

  it("falls back to an alphabetical title tiebreak", () => {
    const tasks = [
      makeTask({ id: "c", title: "Camp invite" }),
      makeTask({ id: "a", title: "ACT registration" }),
      makeTask({ id: "b", title: "Book a visit" }),
    ];

    expect(sortedIds(tasks)).toEqual(["a", "b", "c"]);
  });

  it("applies every key in priority order for a mixed list", () => {
    const tasks = [
      makeTask({
        id: "completed-urgent",
        status: "completed",
        deadline_date: "2026-01-01",
      }),
      makeTask({
        id: "locked-required",
        has_incomplete_prerequisites: true,
        deadline_date: "2026-01-02",
      }),
      makeTask({
        id: "optional-soon",
        required: false,
        deadline_date: "2026-02-01",
      }),
      makeTask({ id: "required-late", deadline_date: "2026-09-01" }),
      makeTask({ id: "required-soon", deadline_date: "2026-02-01" }),
      makeTask({
        id: "required-soon-recruiting",
        category: "recruiting",
        deadline_date: "2026-02-01",
      }),
    ];

    expect(sortedIds(tasks)).toEqual([
      "required-soon",
      "required-soon-recruiting",
      "required-late",
      "optional-soon",
      "locked-required",
      "completed-urgent",
    ]);
  });
});
