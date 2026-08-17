import type { Phase, TaskWithStatus } from "~/types/timeline";
import { CATEGORY_PRIORITY } from "~/utils/taskSort";

export interface WhatMattersItem {
  taskId: string;
  title: string;
  whyItMatters: string;
  category: string;
  priority: number;
  isRequired: boolean;
}

export function getWhatMattersNow(params: {
  phase: Phase;
  tasksWithStatus: TaskWithStatus[];
}): WhatMattersItem[] {
  const { phase, tasksWithStatus } = params;

  // Get grade level for current phase
  const phaseGrades: Record<Phase, number> = {
    freshman: 9,
    sophomore: 10,
    junior: 11,
    senior: 12,
    committed: 12,
  };

  const currentGrade = phaseGrades[phase];

  // Filter for current phase, incomplete required tasks
  const relevantTasks = tasksWithStatus.filter((task) => {
    const isCurrentGrade = task.grade_level === currentGrade;
    const isIncomplete = task.athlete_task?.status !== "completed";
    const isRequired = task.required === true;
    const hasContext = task.why_it_matters && task.why_it_matters.length > 0;

    return isCurrentGrade && isIncomplete && isRequired && hasContext;
  });

  // Calculate priority for each task
  const itemsWithPriority: WhatMattersItem[] = relevantTasks.map((task) => {
    const categoryPriority = CATEGORY_PRIORITY[task.category] || 5;
    const hasDependencies = (task.dependency_task_ids?.length || 0) > 0 ? 2 : 0;
    const priority = categoryPriority + hasDependencies;

    return {
      taskId: task.id,
      title: task.title,
      whyItMatters: task.why_it_matters || "",
      category: task.category,
      priority,
      isRequired: true,
    };
  });

  // Sort by priority (highest first), then taskId as a deterministic tiebreaker
  // so web and iOS — which fetch the task list via separate, independently
  // ordered queries — always surface the SAME top task on a priority tie.
  return itemsWithPriority
    .sort((a, b) => b.priority - a.priority || a.taskId.localeCompare(b.taskId))
    .slice(0, 5);
}

export function getPriorityLabel(priority: number): string {
  if (priority >= 12) return "Critical Right Now";
  if (priority >= 9) return "High Priority";
  if (priority >= 7) return "Important";
  return "Recommended";
}
