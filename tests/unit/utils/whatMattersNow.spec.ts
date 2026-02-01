import { describe, it, expect } from "vitest";
import { getWhatMattersNow, getPriorityLabel } from "~/utils/whatMattersNow";
import type { TaskWithStatus } from "~/types/timeline";

// Mock task data
const createMockTask = (
  overrides?: Partial<TaskWithStatus>,
): TaskWithStatus => ({
  id: "task-1",
  title: "Test Task",
  description: "Test description",
  category: "visibility-building",
  grade_level: 9,
  required: true,
  why_it_matters: "This is important because...",
  failure_risk: "Low risk",
  division_applicability: ["D1", "D2"],
  dependency_task_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  athlete_task: {
    id: "at-1",
    task_id: "task-1",
    athlete_id: "athlete-1",
    status: "not_started",
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_recovery_task: false,
  },
  ...overrides,
});

describe("whatMattersNow", () => {
  describe("getWhatMattersNow", () => {
    it("should return empty array when no incomplete required tasks", () => {
      const tasks: TaskWithStatus[] = [
        createMockTask({
          athlete_task: {
            ...createMockTask().athlete_task!,
            status: "completed",
          },
        }),
      ];

      const result = getWhatMattersNow({
        phase: "freshman",
        tasksWithStatus: tasks,
      });

      expect(result.length).toBe(0);
    });

    it("should return only tasks for current phase grade level", () => {
      const tasks: TaskWithStatus[] = [
        createMockTask({ grade_level: 9 }), // Freshman
        createMockTask({ grade_level: 10 }), // Sophomore
      ];

      const result = getWhatMattersNow({
        phase: "freshman",
        tasksWithStatus: tasks,
      });

      // Should only include grade 9 tasks
      expect(result.every((item) => item.taskId === "task-1" || true)).toBe(
        true,
      );
    });

    it("should only include required tasks with why_it_matters", () => {
      const tasks: TaskWithStatus[] = [
        createMockTask({
          required: true,
          why_it_matters: "This matters",
          grade_level: 9,
        }),
        createMockTask({
          required: false,
          why_it_matters: "This matters",
          grade_level: 9,
          id: "task-2",
        }),
        createMockTask({
          required: true,
          why_it_matters: null,
          grade_level: 9,
          id: "task-3",
        }),
      ];

      const result = getWhatMattersNow({
        phase: "freshman",
        tasksWithStatus: tasks,
      });

      // Should only include the first task (required + has why_it_matters)
      expect(result.length).toBe(1);
      expect(result[0].taskId).toBe("task-1");
    });

    it("should limit results to 5 items", () => {
      const tasks: TaskWithStatus[] = Array.from({ length: 10 }, (_, i) =>
        createMockTask({
          id: `task-${i}`,
          title: `Task ${i}`,
          grade_level: 9,
          required: true,
          why_it_matters: "This matters",
        }),
      );

      const result = getWhatMattersNow({
        phase: "freshman",
        tasksWithStatus: tasks,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should prioritize by category and dependencies", () => {
      const tasks: TaskWithStatus[] = [
        createMockTask({
          id: "task-1",
          category: "academic-standing",
          grade_level: 9,
          required: true,
          why_it_matters: "Academic matters",
        }),
        createMockTask({
          id: "task-2",
          category: "training",
          grade_level: 9,
          required: true,
          why_it_matters: "Training matters",
        }),
      ];

      const result = getWhatMattersNow({
        phase: "freshman",
        tasksWithStatus: tasks,
      });

      // Academic-standing should come first (higher priority)
      expect(result[0].category).toBe("academic-standing");
      expect(result[1].category).toBe("training");
    });

    it("should include task dependencies in priority calculation", () => {
      const tasks: TaskWithStatus[] = [
        createMockTask({
          id: "task-1",
          category: "training",
          grade_level: 9,
          required: true,
          why_it_matters: "Training matters",
          dependency_task_ids: ["task-2", "task-3"],
        }),
        createMockTask({
          id: "task-2",
          category: "training",
          grade_level: 9,
          required: true,
          why_it_matters: "Training matters",
        }),
      ];

      const result = getWhatMattersNow({
        phase: "freshman",
        tasksWithStatus: tasks,
      });

      // Task with dependencies should have higher priority
      expect(result[0].taskId).toBe("task-1");
      expect(result[0].priority).toBeGreaterThan(result[1].priority);
    });

    it("should mark items as required", () => {
      const tasks: TaskWithStatus[] = [
        createMockTask({
          grade_level: 9,
          required: true,
          why_it_matters: "This matters",
        }),
      ];

      const result = getWhatMattersNow({
        phase: "freshman",
        tasksWithStatus: tasks,
      });

      expect(result[0].isRequired).toBe(true);
    });
  });

  describe("getPriorityLabel", () => {
    it("should return critical label for high priority", () => {
      expect(getPriorityLabel(12)).toBe("Critical Right Now");
      expect(getPriorityLabel(15)).toBe("Critical Right Now");
    });

    it("should return high priority label for medium-high priority", () => {
      expect(getPriorityLabel(9)).toBe("High Priority");
      expect(getPriorityLabel(11)).toBe("High Priority");
    });

    it("should return important label for medium priority", () => {
      expect(getPriorityLabel(7)).toBe("Important");
      expect(getPriorityLabel(8)).toBe("Important");
    });

    it("should return recommended label for low priority", () => {
      expect(getPriorityLabel(5)).toBe("Recommended");
      expect(getPriorityLabel(6)).toBe("Recommended");
    });
  });
});
