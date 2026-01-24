/**
 * Tasks API Types
 * Centralized request/response types for task-related endpoints
 */

import type { TaskWithStatus } from "~/types/timeline";

export namespace TasksAPI {
  // Tasks with status endpoint
  export interface GetTasksWithStatusRequest {
    gradeLevel?: number;
  }

  export interface GetTasksWithStatusResponse extends Array<TaskWithStatus> {}

  // Task dependencies endpoint
  export interface GetTaskDependenciesRequest {}

  export interface TaskDependency {
    id: string;
    title: string;
    description?: string;
    category: string;
  }

  export interface GetTaskDependenciesResponse {
    dependencies: TaskDependency[];
  }

  // Update athlete task status endpoint
  export interface UpdateAthleteTaskRequest {
    status: "pending" | "in_progress" | "completed";
    notes?: string;
  }

  export interface UpdateAthleteTaskResponse {
    success: boolean;
    message: string;
    updated_at: string;
  }

  // Batch update tasks endpoint (if needed)
  export interface BatchUpdateTasksRequest {
    updates: Array<{
      taskId: string;
      status: "pending" | "in_progress" | "completed";
    }>;
  }

  export interface BatchUpdateTasksResponse {
    success: boolean;
    updated_count: number;
  }
}
