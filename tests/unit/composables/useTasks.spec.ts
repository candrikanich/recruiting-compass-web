import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTasks } from "~/composables/useTasks";
import { useAuthFetch } from "~/composables/useAuthFetch";
import type { Task, AthleteTask, TaskWithStatus } from "~/types/timeline";

vi.mock("~/composables/useAuthFetch");

const mockUseAuthFetch = vi.mocked(useAuthFetch);

describe("useTasks", () => {
  let mockFetchAuth: any;

  const mockTask: Task = {
    id: "task-1",
    category: "academic",
    grade_level: 10,
    title: "Test Task",
    description: "Test description",
    required: true,
    dependency_task_ids: [],
    why_it_matters: "Important for recruiting",
    failure_risk: "May miss deadlines",
    division_applicability: ["ALL"],
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  const mockTask2: Task = {
    id: "task-2",
    category: "athletic",
    grade_level: 10,
    title: "Second Task",
    description: "Another test",
    required: false,
    dependency_task_ids: ["task-1"],
    why_it_matters: "Builds on first task",
    failure_risk: null,
    division_applicability: ["DI", "DII"],
    created_at: "2024-01-02",
    updated_at: "2024-01-02",
  };

  const mockAthleteTask: AthleteTask = {
    id: "at-1",
    athlete_id: "athlete-1",
    task_id: "task-1",
    status: "completed",
    completed_at: "2024-01-15",
    is_recovery_task: false,
    created_at: "2024-01-01",
    updated_at: "2024-01-15",
  };

  const mockAthleteTask2: AthleteTask = {
    id: "at-2",
    athlete_id: "athlete-1",
    task_id: "task-2",
    status: "not_started",
    completed_at: null,
    is_recovery_task: false,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    mockFetchAuth = vi.fn();
    mockUseAuthFetch.mockReturnValue({
      $fetchAuth: mockFetchAuth,
    });
  });

  describe("fetchTasks", () => {
    it("should fetch all tasks without filters", async () => {
      mockFetchAuth.mockResolvedValue([mockTask]);

      const { fetchTasks, tasks } = useTasks();
      const result = await fetchTasks();

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/tasks", {
        query: {},
      });
      expect(result).toEqual([mockTask]);
      expect(tasks.value).toEqual([mockTask]);
    });

    it("should fetch tasks filtered by grade level", async () => {
      mockFetchAuth.mockResolvedValue([mockTask]);

      const { fetchTasks } = useTasks();
      await fetchTasks({ gradeLevel: 10 });

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/tasks", {
        query: { gradeLevel: "10" },
      });
    });

    it("should fetch tasks filtered by category", async () => {
      mockFetchAuth.mockResolvedValue([mockTask]);

      const { fetchTasks } = useTasks();
      await fetchTasks({ category: "academic" });

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/tasks", {
        query: { category: "academic" },
      });
    });

    it("should fetch tasks filtered by division", async () => {
      mockFetchAuth.mockResolvedValue([mockTask]);

      const { fetchTasks } = useTasks();
      await fetchTasks({ division: "DI" });

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/tasks", {
        query: { division: "DI" },
      });
    });

    it("should handle fetch errors", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Network error"));

      const { fetchTasks, error } = useTasks();

      await expect(fetchTasks()).rejects.toThrow("Network error");
      expect(error.value).toBe("Network error");
    });

    it("should set loading state during fetch", async () => {
      mockFetchAuth.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve([mockTask]), 100)),
      );

      const { fetchTasks, loading } = useTasks();

      const promise = fetchTasks();
      expect(loading.value).toBe(true);

      await promise;
      expect(loading.value).toBe(false);
    });
  });

  describe("fetchAthleteTasks", () => {
    it("should fetch athlete task statuses", async () => {
      mockFetchAuth.mockResolvedValue([mockAthleteTask]);

      const { fetchAthleteTasks, athleteTasks } = useTasks();
      const result = await fetchAthleteTasks();

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/athlete-tasks");
      expect(result).toEqual([mockAthleteTask]);
      expect(athleteTasks.value).toEqual([mockAthleteTask]);
    });

    it("should handle empty athlete tasks", async () => {
      mockFetchAuth.mockResolvedValue([]);

      const { fetchAthleteTasks, athleteTasks } = useTasks();
      const result = await fetchAthleteTasks();

      expect(result).toEqual([]);
      expect(athleteTasks.value).toEqual([]);
    });

    it("should handle fetch errors", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Network error"));

      const { fetchAthleteTasks, error } = useTasks();

      await expect(fetchAthleteTasks()).rejects.toThrow("Network error");
      expect(error.value).toBe("Network error");
    });
  });

  describe("fetchTasksWithStatus", () => {
    it("should merge tasks with athlete completion status", async () => {
      mockFetchAuth
        .mockResolvedValueOnce([mockTask, mockTask2])
        .mockResolvedValueOnce([mockAthleteTask, mockAthleteTask2]);

      const { fetchTasksWithStatus, tasksWithStatus } = useTasks();
      const result = await fetchTasksWithStatus(10);

      expect(result).toHaveLength(2);
      expect(result[0].athlete_task).toEqual(mockAthleteTask);
      expect(result[1].athlete_task).toEqual(mockAthleteTask2);
      expect(tasksWithStatus.value).toEqual(result);
    });

    it("should calculate has_incomplete_prerequisites correctly", async () => {
      mockFetchAuth
        .mockResolvedValueOnce([mockTask, mockTask2])
        .mockResolvedValueOnce([mockAthleteTask]); // First task is completed

      const { fetchTasksWithStatus } = useTasks();
      const result = await fetchTasksWithStatus(10);

      // First task has no dependencies
      expect(result[0].has_incomplete_prerequisites).toBe(false);
      // Second task depends on first task, which IS completed, so no incomplete prerequisites
      expect(result[1].has_incomplete_prerequisites).toBe(false);
    });

    it("should handle tasks with no dependencies", async () => {
      mockFetchAuth.mockResolvedValueOnce([mockTask]).mockResolvedValueOnce([]);

      const { fetchTasksWithStatus } = useTasks();
      const result = await fetchTasksWithStatus(10);

      expect(result[0].has_incomplete_prerequisites).toBe(false);
      expect(result[0].prerequisite_tasks).toEqual([]);
    });

    it("should set loading state", async () => {
      mockFetchAuth.mockResolvedValueOnce([mockTask]).mockResolvedValueOnce([]);

      const { fetchTasksWithStatus, loading } = useTasks();

      expect(loading.value).toBe(false);
      const promise = fetchTasksWithStatus(10);
      expect(loading.value).toBe(true);

      await promise;
      expect(loading.value).toBe(false);
    });

    it("should call with correct grade level", async () => {
      mockFetchAuth.mockResolvedValueOnce([mockTask]).mockResolvedValueOnce([]);

      const { fetchTasksWithStatus } = useTasks();
      await fetchTasksWithStatus(11);

      // First call should be to fetchTasks with grade level
      expect(mockFetchAuth).toHaveBeenCalledWith("/api/tasks", {
        query: { gradeLevel: "11" },
      });
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status to completed", async () => {
      const updatedAthleteTask: AthleteTask = {
        ...mockAthleteTask,
        status: "completed",
      };
      mockFetchAuth.mockResolvedValue(updatedAthleteTask);

      const { updateTaskStatus, athleteTasks } = useTasks();
      const result = await updateTaskStatus("task-1", "completed");

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/athlete-tasks/task-1", {
        method: "PATCH",
        body: { status: "completed" },
      });
      expect(result).toEqual(updatedAthleteTask);
    });

    it("should update task status to in_progress", async () => {
      const inProgressTask: AthleteTask = {
        ...mockAthleteTask,
        status: "in_progress",
      };
      mockFetchAuth.mockResolvedValue(inProgressTask);

      const { updateTaskStatus } = useTasks();
      await updateTaskStatus("task-1", "in_progress");

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/athlete-tasks/task-1", {
        method: "PATCH",
        body: { status: "in_progress" },
      });
    });

    it("should update task status to not_started", async () => {
      const notStartedTask: AthleteTask = {
        ...mockAthleteTask,
        status: "not_started",
      };
      mockFetchAuth.mockResolvedValue(notStartedTask);

      const { updateTaskStatus } = useTasks();
      await updateTaskStatus("task-1", "not_started");

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/athlete-tasks/task-1", {
        method: "PATCH",
        body: { status: "not_started" },
      });
    });

    it("should update local state after successful API call", async () => {
      const updatedTask: AthleteTask = {
        ...mockAthleteTask,
        status: "completed",
      };
      mockFetchAuth.mockResolvedValue(updatedTask);

      const { updateTaskStatus, athleteTasks } = useTasks();
      athleteTasks.value = [mockAthleteTask];

      await updateTaskStatus("task-1", "completed");

      expect(athleteTasks.value[0].status).toBe("completed");
    });

    it("should add new athlete task if not exists", async () => {
      const newAthleteTask: AthleteTask = {
        id: "at-new",
        athlete_id: "athlete-1",
        task_id: "task-3",
        status: "completed",
        completed_at: "2024-01-20",
        is_recovery_task: false,
        created_at: "2024-01-20",
        updated_at: "2024-01-20",
      };
      mockFetchAuth.mockResolvedValue(newAthleteTask);

      const { updateTaskStatus, athleteTasks } = useTasks();
      athleteTasks.value = [mockAthleteTask];

      await updateTaskStatus("task-3", "completed");

      expect(athleteTasks.value).toContainEqual(newAthleteTask);
    });

    it("should handle update errors", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Update failed"));

      const { updateTaskStatus, error } = useTasks();

      await expect(updateTaskStatus("task-1", "completed")).rejects.toThrow(
        "Update failed",
      );
      expect(error.value).toBe("Update failed");
    });
  });

  describe("getTaskDependencies", () => {
    it("should return empty array for task with no dependencies", async () => {
      const { getTaskDependencies, tasks } = useTasks();
      tasks.value = [mockTask]; // No dependencies

      const result = await getTaskDependencies("task-1");

      expect(result).toEqual([]);
    });

    it("should return prerequisite tasks", async () => {
      const { getTaskDependencies, tasks } = useTasks();
      tasks.value = [mockTask, mockTask2]; // task-2 depends on task-1

      const result = await getTaskDependencies("task-2");

      expect(result).toEqual([mockTask]);
    });

    it("should return empty for invalid task ID", async () => {
      const { getTaskDependencies, tasks } = useTasks();
      tasks.value = [mockTask];

      const result = await getTaskDependencies("invalid-id");

      expect(result).toEqual([]);
    });

    it("should handle multiple dependencies", async () => {
      const task3: Task = {
        ...mockTask2,
        id: "task-3",
        dependency_task_ids: ["task-1", "task-2"],
      };

      const { getTaskDependencies, tasks } = useTasks();
      tasks.value = [mockTask, mockTask2, task3];

      const result = await getTaskDependencies("task-3");

      expect(result).toEqual([mockTask, mockTask2]);
    });
  });

  describe("checkDependenciesComplete", () => {
    it("should return complete=true when all deps completed", async () => {
      const { checkDependenciesComplete, tasks, athleteTasks } = useTasks();
      tasks.value = [mockTask, mockTask2];
      athleteTasks.value = [mockAthleteTask]; // task-1 is completed

      const result = await checkDependenciesComplete("task-2");

      expect(result.complete).toBe(true);
      expect(result.incompletePrerequisites).toEqual([]);
    });

    it("should return complete=false with incomplete deps", async () => {
      const { checkDependenciesComplete, tasks, athleteTasks } = useTasks();
      tasks.value = [mockTask, mockTask2];
      athleteTasks.value = [mockAthleteTask2]; // task-1 is not completed

      const result = await checkDependenciesComplete("task-2");

      expect(result.complete).toBe(false);
      expect(result.incompletePrerequisites).toContainEqual(mockTask);
    });

    it("should handle task with no dependencies", async () => {
      const { checkDependenciesComplete, tasks } = useTasks();
      tasks.value = [mockTask];

      const result = await checkDependenciesComplete("task-1");

      expect(result.complete).toBe(true);
      expect(result.incompletePrerequisites).toEqual([]);
    });

    it("should handle invalid task ID", async () => {
      const { checkDependenciesComplete, tasks } = useTasks();
      tasks.value = [mockTask];

      const result = await checkDependenciesComplete("invalid-id");

      expect(result.complete).toBe(true);
      expect(result.incompletePrerequisites).toEqual([]);
    });
  });

  describe("calculateTaskCompletionRate", () => {
    it("should return 0 for grade with no tasks", () => {
      const { calculateTaskCompletionRate, tasks } = useTasks();
      tasks.value = [];

      const rate = calculateTaskCompletionRate(10);

      expect(rate).toBe(0);
    });

    it("should calculate percentage correctly", () => {
      // Create a second required task
      const requiredTask2: Task = {
        ...mockTask2,
        required: true,
      };

      const { calculateTaskCompletionRate, tasks, athleteTasks } = useTasks();
      tasks.value = [mockTask, requiredTask2]; // Both grade 10 and required
      athleteTasks.value = [mockAthleteTask]; // Only first one completed

      const rate = calculateTaskCompletionRate(10);

      // 1 out of 2 required = 50%
      expect(rate).toBe(50);
    });

    it("should only count required tasks", () => {
      const optionalTask: Task = {
        ...mockTask2,
        required: false,
      };

      const { calculateTaskCompletionRate, tasks, athleteTasks } = useTasks();
      tasks.value = [mockTask, optionalTask];
      athleteTasks.value = [mockAthleteTask];

      const rate = calculateTaskCompletionRate(10);

      // Only 1 required task, 1 completed = 100%
      expect(rate).toBe(100);
    });

    it("should handle grade with no matching tasks", () => {
      const { calculateTaskCompletionRate, tasks } = useTasks();
      tasks.value = [mockTask]; // grade 10

      const rate = calculateTaskCompletionRate(11); // Request grade 11

      expect(rate).toBe(0);
    });
  });

  describe("getCompletionStats", () => {
    it("should return accurate counts", () => {
      const completedTask: AthleteTask = {
        ...mockAthleteTask,
        status: "completed",
      };
      const inProgressTask: AthleteTask = {
        ...mockAthleteTask2,
        status: "in_progress",
        task_id: "task-2",
      };

      const { getCompletionStats, tasksWithStatus } = useTasks();
      tasksWithStatus.value = [
        { ...mockTask, athlete_task: completedTask } as TaskWithStatus,
        { ...mockTask2, athlete_task: inProgressTask } as TaskWithStatus,
      ];

      const stats = getCompletionStats(10);

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.notStarted).toBe(0);
    });

    it("should calculate percentComplete correctly", () => {
      const completedTask: AthleteTask = {
        ...mockAthleteTask,
        status: "completed",
      };

      const { getCompletionStats, tasksWithStatus } = useTasks();
      tasksWithStatus.value = [
        { ...mockTask, athlete_task: completedTask } as TaskWithStatus,
        { ...mockTask2, athlete_task: undefined } as TaskWithStatus,
      ];

      const stats = getCompletionStats(10);

      expect(stats.percentComplete).toBe(50);
    });

    it("should return 0% when no tasks completed", () => {
      const { getCompletionStats, tasksWithStatus } = useTasks();
      tasksWithStatus.value = [
        { ...mockTask, athlete_task: undefined } as TaskWithStatus,
        { ...mockTask2, athlete_task: undefined } as TaskWithStatus,
      ];

      const stats = getCompletionStats(10);

      expect(stats.percentComplete).toBe(0);
    });

    it("should return 100% when all tasks completed", () => {
      const completedTask1: AthleteTask = {
        ...mockAthleteTask,
        status: "completed",
      };
      const completedTask2: AthleteTask = {
        ...mockAthleteTask2,
        task_id: "task-2",
        status: "completed",
      };

      const { getCompletionStats, tasksWithStatus } = useTasks();
      tasksWithStatus.value = [
        { ...mockTask, athlete_task: completedTask1 } as TaskWithStatus,
        { ...mockTask2, athlete_task: completedTask2 } as TaskWithStatus,
      ];

      const stats = getCompletionStats(10);

      expect(stats.percentComplete).toBe(100);
    });

    it("should handle empty task list", () => {
      const { getCompletionStats, tasksWithStatus } = useTasks();
      tasksWithStatus.value = [];

      const stats = getCompletionStats(10);

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.percentComplete).toBe(0);
    });
  });

  describe("getRequiredTasksForPhase", () => {
    it("should return required tasks for freshman phase", () => {
      const { getRequiredTasksForPhase, tasks } = useTasks();
      tasks.value = [
        { ...mockTask, grade_level: 9, required: true },
        { ...mockTask2, grade_level: 9, required: false },
      ];

      const result = getRequiredTasksForPhase("freshman");

      expect(result).toHaveLength(1);
      expect(result[0].grade_level).toBe(9);
      expect(result[0].required).toBe(true);
    });

    it("should return required tasks for sophomore phase", () => {
      const { getRequiredTasksForPhase, tasks } = useTasks();
      tasks.value = [
        { ...mockTask, grade_level: 10, required: true },
        { ...mockTask2, grade_level: 10, required: false },
      ];

      const result = getRequiredTasksForPhase("sophomore");

      expect(result).toHaveLength(1);
      expect(result[0].grade_level).toBe(10);
    });

    it("should return empty array if no required tasks for phase", () => {
      const { getRequiredTasksForPhase, tasks } = useTasks();
      tasks.value = [{ ...mockTask, grade_level: 11 }];

      const result = getRequiredTasksForPhase("sophomore");

      expect(result).toEqual([]);
    });
  });

  describe("Computed properties", () => {
    it("completedTaskIds should return IDs of completed tasks", () => {
      const { completedTaskIds, athleteTasks } = useTasks();
      athleteTasks.value = [mockAthleteTask];

      expect(completedTaskIds.value).toContain("task-1");
    });

    it("inProgressTaskIds should return IDs of in-progress tasks", () => {
      const inProgressTask: AthleteTask = {
        ...mockAthleteTask,
        task_id: "task-3",
        status: "in_progress",
      };

      const { inProgressTaskIds, athleteTasks } = useTasks();
      athleteTasks.value = [inProgressTask];

      expect(inProgressTaskIds.value).toContain("task-3");
    });

    it("recoveryTasks should return recovery tasks", () => {
      const recoveryTask: AthleteTask = {
        ...mockAthleteTask,
        task_id: "task-4",
        is_recovery_task: true,
      };

      const { recoveryTasks, athleteTasks } = useTasks();
      athleteTasks.value = [recoveryTask];

      expect(recoveryTasks.value).toContainEqual(recoveryTask);
    });

    it("requiredCompletedTasks should return required and completed tasks", () => {
      const { requiredCompletedTasks, tasks, athleteTasks } = useTasks();
      tasks.value = [mockTask];
      athleteTasks.value = [mockAthleteTask];

      expect(requiredCompletedTasks.value).toHaveLength(1);
      expect(requiredCompletedTasks.value[0].required).toBe(true);
    });
  });
});
