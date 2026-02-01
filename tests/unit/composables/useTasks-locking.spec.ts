import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTasks } from "~/composables/useTasks";
import type { TaskWithStatus, AthleteTask } from "~/types/timeline";
import { useAuthFetch } from "~/composables/useAuthFetch";

vi.mock("~/composables/useAuthFetch");

describe("useTasks - Task Locking", () => {
  let mockTasks: TaskWithStatus[];
  let mockAthleteTasks: AthleteTask[];

  beforeEach(() => {
    // Setup mock data with dependencies - build task-1 first
    const task1: TaskWithStatus = {
      id: "task-1",
      title: "Task 1 (No Dependencies)",
      category: "academic",
      grade_level: 9,
      description: null,
      required: true,
      dependency_task_ids: [],
      why_it_matters: null,
      failure_risk: null,
      division_applicability: ["DI"],
      deadline_date: null,
      created_at: null,
      updated_at: null,
      athlete_task: undefined,
      has_incomplete_prerequisites: false,
      prerequisite_tasks: [],
    };

    const task2: TaskWithStatus = {
      id: "task-2",
      title: "Task 2 (Depends on Task 1)",
      category: "athletic",
      grade_level: 9,
      description: null,
      required: true,
      dependency_task_ids: ["task-1"],
      why_it_matters: null,
      failure_risk: null,
      division_applicability: ["DI"],
      deadline_date: null,
      created_at: null,
      updated_at: null,
      athlete_task: undefined,
      has_incomplete_prerequisites: true,
      prerequisite_tasks: [task1],
    };

    const task3: TaskWithStatus = {
      id: "task-3",
      title: "Task 3 (Depends on Task 2)",
      category: "recruiting",
      grade_level: 9,
      description: null,
      required: false,
      dependency_task_ids: ["task-2"],
      why_it_matters: null,
      failure_risk: null,
      division_applicability: ["DI"],
      deadline_date: null,
      created_at: null,
      updated_at: null,
      athlete_task: undefined,
      has_incomplete_prerequisites: true,
      prerequisite_tasks: [task2],
    };

    mockTasks = [task1, task2, task3];

    mockAthleteTasks = [
      {
        id: "at-1",
        athlete_id: "athlete-1",
        task_id: "task-1",
        status: "not_started",
        completed_at: null,
        is_recovery_task: false,
        created_at: null,
        updated_at: null,
      },
      {
        id: "at-2",
        athlete_id: "athlete-1",
        task_id: "task-2",
        status: "not_started",
        completed_at: null,
        is_recovery_task: false,
        created_at: null,
        updated_at: null,
      },
      {
        id: "at-3",
        athlete_id: "athlete-1",
        task_id: "task-3",
        status: "not_started",
        completed_at: null,
        is_recovery_task: false,
        created_at: null,
        updated_at: null,
      },
    ];
  });

  describe("isTaskLocked", () => {
    it("returns false for task with no dependencies", () => {
      const { isTaskLocked, tasks, athleteTasks, tasksWithStatus } = useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      expect(isTaskLocked("task-1")).toBe(false);
    });

    it("returns true when task has incomplete dependencies", () => {
      const { isTaskLocked, tasks, athleteTasks, tasksWithStatus } = useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      expect(isTaskLocked("task-2")).toBe(true);
    });

    it("returns false when task has completed dependencies", () => {
      const { isTaskLocked, tasks, athleteTasks, tasksWithStatus } = useTasks();
      tasks.value = mockTasks;
      mockAthleteTasks[0].status = "completed"; // Complete task-1
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      expect(isTaskLocked("task-2")).toBe(false);
    });

    it("handles dependency chain correctly", () => {
      const { isTaskLocked, tasks, athleteTasks, tasksWithStatus } = useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      // Task 2 locked by incomplete Task 1
      expect(isTaskLocked("task-2")).toBe(true);
      // Task 3 locked by incomplete Task 2
      expect(isTaskLocked("task-3")).toBe(true);

      // Complete Task 1
      mockAthleteTasks[0].status = "completed";
      athleteTasks.value = [...mockAthleteTasks];

      // Task 2 now unlocked
      expect(isTaskLocked("task-2")).toBe(false);
      // Task 3 still locked by Task 2
      expect(isTaskLocked("task-3")).toBe(true);

      // Complete Task 2
      mockAthleteTasks[1].status = "completed";
      athleteTasks.value = [...mockAthleteTasks];

      // Both now unlocked
      expect(isTaskLocked("task-2")).toBe(false);
      expect(isTaskLocked("task-3")).toBe(false);
    });
  });

  describe("lockedTaskIds computed property", () => {
    it("returns empty array when no tasks are locked", () => {
      const { lockedTaskIds, tasks, athleteTasks, tasksWithStatus } =
        useTasks();
      // Complete all prerequisite tasks
      mockAthleteTasks[0].status = "completed"; // Complete task-1
      mockAthleteTasks[1].status = "completed"; // Complete task-2
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      expect(lockedTaskIds.value).toEqual([]);
    });

    it("returns locked task IDs", () => {
      const { lockedTaskIds, tasks, athleteTasks, tasksWithStatus } =
        useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      expect(lockedTaskIds.value).toContain("task-2");
      expect(lockedTaskIds.value).toContain("task-3");
    });

    it("updates reactively when dependency completes", () => {
      const { lockedTaskIds, tasks, athleteTasks, tasksWithStatus } =
        useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      expect(lockedTaskIds.value).toContain("task-2");

      // Complete task-1
      mockAthleteTasks[0].status = "completed";
      athleteTasks.value = [...mockAthleteTasks];

      expect(lockedTaskIds.value).not.toContain("task-2");
      expect(lockedTaskIds.value).toContain("task-3");
    });
  });

  describe("updateTaskStatus with lock validation", () => {
    it("rejects completion of locked task", async () => {
      const mockFetchAuth = vi.fn();
      (useAuthFetch as any).mockReturnValue({ $fetchAuth: mockFetchAuth });

      const { updateTaskStatus, tasks, athleteTasks, tasksWithStatus } =
        useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      // Attempt to complete task-2 (which is locked by incomplete task-1)
      await expect(updateTaskStatus("task-2", "completed")).rejects.toThrow(
        /Cannot complete task. Please complete these prerequisites first: Task 1/,
      );

      expect(mockFetchAuth).not.toHaveBeenCalled();
    });

    it("allows completion of unlocked task", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        id: "at-1",
        athlete_id: "athlete-1",
        task_id: "task-1",
        status: "completed",
        completed_at: new Date().toISOString(),
        is_recovery_task: false,
        created_at: null,
        updated_at: null,
      });
      (useAuthFetch as any).mockReturnValue({ $fetchAuth: mockFetchAuth });

      const { updateTaskStatus, tasks, athleteTasks, tasksWithStatus } =
        useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      // Complete task-1 (no dependencies)
      await updateTaskStatus("task-1", "completed");

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/athlete-tasks/task-1",
        expect.objectContaining({
          method: "PATCH",
          body: { status: "completed" },
        }),
      );
    });

    it("allows skipped status for locked task", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        id: "at-2",
        athlete_id: "athlete-1",
        task_id: "task-2",
        status: "skipped",
        completed_at: null,
        is_recovery_task: false,
        created_at: null,
        updated_at: null,
      });
      (useAuthFetch as any).mockReturnValue({ $fetchAuth: mockFetchAuth });

      const { updateTaskStatus, tasks, athleteTasks, tasksWithStatus } =
        useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      // Skip locked task (should be allowed)
      await updateTaskStatus("task-2", "skipped");

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/athlete-tasks/task-2",
        expect.objectContaining({
          method: "PATCH",
          body: { status: "skipped" },
        }),
      );
    });

    it("provides clear error message with incomplete prerequisites", async () => {
      const { updateTaskStatus, tasks, athleteTasks, tasksWithStatus, error } =
        useTasks();
      tasks.value = mockTasks;
      athleteTasks.value = mockAthleteTasks;
      tasksWithStatus.value = mockTasks;

      try {
        await updateTaskStatus("task-3", "completed");
      } catch (e) {
        // Expected to throw
      }

      expect(error.value).toContain("Cannot complete task");
      expect(error.value).toContain("Task 2");
    });
  });
});
