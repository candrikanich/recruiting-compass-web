/**
 * useTasks Composable
 * Manages task fetching, status updates, and dependency analysis
 */

import { ref, computed, type ComputedRef, type Ref } from "vue";
import type {
  Task,
  AthleteTask,
  TaskWithStatus,
  TaskQueryParams,
  TaskDependencyAnalysis,
  TaskCompletionStats,
  TaskStatus,
  Phase,
} from "~/types/timeline";

import { useAuthFetch } from "~/composables/useAuthFetch";

export const useTasks = (): {
  tasks: Ref<Task[]>;
  athleteTasks: Ref<AthleteTask[]>;
  tasksWithStatus: Ref<TaskWithStatus[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchTasks: (params?: TaskQueryParams) => Promise<Task[]>;
  fetchAthleteTasks: () => Promise<AthleteTask[]>;
  fetchTasksWithStatus: (gradeLevel?: number) => Promise<TaskWithStatus[]>;
  updateTaskStatus: (
    taskId: string,
    status: TaskStatus,
  ) => Promise<AthleteTask>;
  getTaskDependencies: (taskId: string) => Promise<Task[]>;
  checkDependenciesComplete: (
    taskId: string,
  ) => Promise<{ complete: boolean; incompletePrerequisites: Task[] }>;
  isTaskLocked: (taskId: string) => boolean;
  getRequiredTasksForPhase: (phase: Phase) => Task[];
  calculateTaskCompletionRate: (gradeLevel: number) => number;
  getTaskWithDependencyWarning: (
    taskId: string,
  ) => Promise<TaskDependencyAnalysis>;
  getCompletionStats: (gradeLevel: number) => TaskCompletionStats;
  completedTaskIds: ComputedRef<string[]>;
  inProgressTaskIds: ComputedRef<string[]>;
  lockedTaskIds: ComputedRef<string[]>;
  recoveryTasks: ComputedRef<AthleteTask[]>;
  requiredCompletedTasks: ComputedRef<Task[]>;
} => {
  const tasks = ref<Task[]>([]);
  const athleteTasks = ref<AthleteTask[]>([]);
  const tasksWithStatus = ref<TaskWithStatus[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch all tasks with optional filters
   */
  const fetchTasks = async (params?: TaskQueryParams): Promise<Task[]> => {
    loading.value = true;
    error.value = null;

    try {
      const { $fetchAuth } = useAuthFetch();
      const queryParams = new URLSearchParams();
      if (params?.gradeLevel)
        queryParams.append("gradeLevel", params.gradeLevel.toString());
      if (params?.category) queryParams.append("category", params.category);
      if (params?.division) queryParams.append("division", params.division);

      const response = await $fetchAuth("/api/tasks", {
        query: Object.fromEntries(queryParams),
      });

      const typedResponse = response as Task[];
      tasks.value = typedResponse;
      return typedResponse;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch tasks";
      console.error("Error fetching tasks:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch athlete's task statuses
   */
  const fetchAthleteTasks = async (): Promise<AthleteTask[]> => {
    loading.value = true;
    error.value = null;

    try {
      const { $fetchAuth } = useAuthFetch();
      const response = await $fetchAuth("/api/athlete-tasks");
      const typedResponse = response as AthleteTask[];
      athleteTasks.value = typedResponse;
      return typedResponse;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch athlete tasks";
      console.error("Error fetching athlete tasks:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Merge tasks with athlete completion status
   */
  const fetchTasksWithStatus = async (gradeLevel?: number) => {
    loading.value = true;
    error.value = null;

    try {
      // Fetch both tasks and athlete tasks in parallel
      const [allTasks, athleteTaskData] = await Promise.all([
        fetchTasks({ gradeLevel }),
        fetchAthleteTasks(),
      ]);

      // Create map for quick athlete task lookup
      const athleteTaskMap = new Map(
        (Array.isArray(athleteTaskData) ? athleteTaskData : []).map(
          (at: AthleteTask) => [at.task_id, at],
        ),
      );

      // Merge with dependency analysis
      const merged = await Promise.all(
        allTasks.map(async (task: Task) => {
          const athleteTask = athleteTaskMap.get(task.id);
          const dependencies = await getTaskDependencies(task.id);
          const allDepsComplete =
            dependencies.length === 0 ||
            dependencies.every((dep: Task) => {
              const depAthleteTask = athleteTaskMap.get(dep.id);
              return depAthleteTask?.status === "completed";
            });

          return {
            ...task,
            athlete_task: athleteTask,
            has_incomplete_prerequisites:
              task.dependency_task_ids.length > 0 && !allDepsComplete,
            prerequisite_tasks: dependencies,
          } as TaskWithStatus;
        }),
      );

      tasksWithStatus.value = merged;
      return merged;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to fetch tasks with status";
      console.error("Error fetching tasks with status:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Check if a task is locked due to incomplete dependencies
   */
  const isTaskLocked = (taskId: string): boolean => {
    const task = tasksWithStatus.value.find((t) => t.id === taskId);
    if (
      !task ||
      !task.dependency_task_ids ||
      task.dependency_task_ids.length === 0
    ) {
      return false;
    }

    // Check if all dependencies are completed
    return task.dependency_task_ids.some((depId) => {
      const depTask = athleteTasks.value.find((at) => at.task_id === depId);
      return !depTask || depTask.status !== "completed";
    });
  };

  /**
   * Update task status for the current athlete
   */
  const updateTaskStatus = async (
    taskId: string,
    status: TaskStatus,
  ): Promise<AthleteTask> => {
    loading.value = true;
    error.value = null;

    try {
      // Check lock status when attempting to complete or start
      if (
        (status === "completed" || status === "in_progress") &&
        isTaskLocked(taskId)
      ) {
        const task = tasksWithStatus.value.find((t) => t.id === taskId);
        const incompleteTitles = (task?.dependency_task_ids || [])
          .map((depId) => {
            const depTask = tasksWithStatus.value.find((t) => t.id === depId);
            return depTask?.title;
          })
          .filter((title) => {
            const depId = task?.dependency_task_ids.find(
              (id) =>
                tasksWithStatus.value.find((t) => t.id === id)?.title === title,
            );
            const depAthleteTask = athleteTasks.value.find(
              (at) => at.task_id === depId,
            );
            return !depAthleteTask || depAthleteTask.status !== "completed";
          });

        error.value = `Cannot complete task. Please complete these prerequisites first: ${incompleteTitles.join(", ")}`;
        throw new Error(error.value);
      }

      const { $fetchAuth } = useAuthFetch();
      const response = await $fetchAuth(`/api/athlete-tasks/${taskId}`, {
        method: "PATCH",
        body: { status },
      });

      const typedResponse = response as AthleteTask;

      // Update local state
      const athleteTaskIndex = athleteTasks.value.findIndex(
        (at) => at.task_id === taskId,
      );
      if (athleteTaskIndex >= 0) {
        athleteTasks.value[athleteTaskIndex] = typedResponse;
      } else {
        athleteTasks.value.push(typedResponse);
      }

      // Update merged list if it exists
      const taskIndex = tasksWithStatus.value.findIndex((t) => t.id === taskId);
      if (taskIndex >= 0) {
        tasksWithStatus.value[taskIndex].athlete_task = typedResponse;
      }

      return typedResponse;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update task status";
      console.error("Error updating task status:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Get prerequisite tasks for a given task
   */
  const getTaskDependencies = async (taskId: string): Promise<Task[]> => {
    try {
      const task = tasks.value.find((t) => t.id === taskId);
      if (
        !task ||
        !task.dependency_task_ids ||
        task.dependency_task_ids.length === 0
      ) {
        return [];
      }

      // Return the prerequisite tasks
      return tasks.value.filter((t) => task.dependency_task_ids.includes(t.id));
    } catch (err) {
      console.error("Error getting task dependencies:", err);
      return [];
    }
  };

  /**
   * Check if all dependencies are complete for a task
   */
  const checkDependenciesComplete = async (
    taskId: string,
  ): Promise<{
    complete: boolean;
    incompletePrerequisites: Task[];
  }> => {
    try {
      const task = tasks.value.find((t) => t.id === taskId);
      if (
        !task ||
        !task.dependency_task_ids ||
        task.dependency_task_ids.length === 0
      ) {
        return { complete: true, incompletePrerequisites: [] };
      }

      const incompleteTasks = task.dependency_task_ids
        .map((depId) => {
          const athleteTask = athleteTasks.value.find(
            (at) => at.task_id === depId,
          );
          const taskData = tasks.value.find((t) => t.id === depId);
          return {
            athleteTask,
            taskData,
          };
        })
        .filter(({ athleteTask }) => athleteTask?.status !== "completed")
        .map(({ taskData }) => taskData)
        .filter((task) => task !== undefined) as Task[];

      return {
        complete: incompleteTasks.length === 0,
        incompletePrerequisites: incompleteTasks,
      };
    } catch (err) {
      console.error("Error checking dependencies:", err);
      return { complete: false, incompletePrerequisites: [] };
    }
  };

  /**
   * Get required tasks for a specific phase
   */
  const getRequiredTasksForPhase = (phase: Phase): Task[] => {
    const gradeMap: Record<Phase, number> = {
      freshman: 9,
      sophomore: 10,
      junior: 11,
      senior: 12,
      committed: 12,
    };

    const gradeLevel = gradeMap[phase];
    return tasks.value.filter(
      (t) => t.grade_level === gradeLevel && t.required,
    );
  };

  /**
   * Calculate task completion rate for a grade level
   */
  const calculateTaskCompletionRate = (gradeLevel: number): number => {
    const gradeTasks = tasks.value.filter(
      (t) => t.grade_level === gradeLevel && t.required,
    );
    if (gradeTasks.length === 0) return 0;

    const completedCount = gradeTasks.filter((t) => {
      const athleteTask = athleteTasks.value.find((at) => at.task_id === t.id);
      return athleteTask?.status === "completed";
    }).length;

    return (completedCount / gradeTasks.length) * 100;
  };

  /**
   * Get task with dependency warning
   */
  const getTaskWithDependencyWarning = async (
    taskId: string,
  ): Promise<TaskDependencyAnalysis> => {
    try {
      const task = tasks.value.find((t) => t.id === taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      const { complete, incompletePrerequisites } =
        await checkDependenciesComplete(taskId);

      let warning = null;
      if (!complete && incompletePrerequisites.length > 0) {
        const prerequisite = incompletePrerequisites[0];
        warning = {
          message: `This task works best after completing "${prerequisite.title}".`,
          prerequisiteTask: prerequisite,
          whyItMatters:
            prerequisite.why_it_matters || "Complete this prerequisite first.",
        };
      }

      return {
        task,
        canProceed: true, // Soft warning - always allow to proceed
        isLocked: !complete,
        warning,
      };
    } catch (err) {
      console.error("Error getting task with dependency warning:", err);
      const task = tasks.value.find((t) => t.id === taskId);
      return {
        task: task || ({} as Task),
        canProceed: true,
        isLocked: false,
        warning: null,
      };
    }
  };

  /**
   * Get completion stats for a grade level
   */
  const getCompletionStats = (gradeLevel: number): TaskCompletionStats => {
    const gradeTasks = tasksWithStatus.value.filter(
      (t) => t.grade_level === gradeLevel,
    );

    const stats: TaskCompletionStats = {
      total: gradeTasks.length,
      completed: gradeTasks.filter(
        (t) => t.athlete_task?.status === "completed",
      ).length,
      inProgress: gradeTasks.filter(
        (t) => t.athlete_task?.status === "in_progress",
      ).length,
      notStarted: gradeTasks.filter(
        (t) => t.athlete_task?.status === "not_started" || !t.athlete_task,
      ).length,
      skipped: gradeTasks.filter((t) => t.athlete_task?.status === "skipped")
        .length,
      percentComplete: 0,
    };

    stats.percentComplete =
      stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    return stats;
  };

  // Computed properties
  const completedTaskIds = computed(() =>
    athleteTasks.value
      .filter((at) => at.status === "completed")
      .map((at) => at.task_id),
  );

  const inProgressTaskIds = computed(() =>
    athleteTasks.value
      .filter((at) => at.status === "in_progress")
      .map((at) => at.task_id),
  );

  const recoveryTasks = computed(() =>
    athleteTasks.value.filter((at) => at.is_recovery_task),
  );

  const requiredCompletedTasks = computed(() =>
    tasks.value.filter(
      (t) =>
        t.required &&
        athleteTasks.value.find(
          (at) => at.task_id === t.id && at.status === "completed",
        ),
    ),
  );

  const lockedTaskIds = computed(() =>
    tasksWithStatus.value
      .filter((task) => isTaskLocked(task.id))
      .map((task) => task.id),
  );

  return {
    // State
    tasks,
    athleteTasks,
    tasksWithStatus,
    loading,
    error,

    // Methods
    fetchTasks,
    fetchAthleteTasks,
    fetchTasksWithStatus,
    updateTaskStatus,
    getTaskDependencies,
    checkDependenciesComplete,
    isTaskLocked,
    getRequiredTasksForPhase,
    calculateTaskCompletionRate,
    getTaskWithDependencyWarning,
    getCompletionStats,

    // Computed
    completedTaskIds,
    inProgressTaskIds,
    lockedTaskIds,
    recoveryTasks,
    requiredCompletedTasks,
  };
};
