/**
 * Timeline Type Definitions
 * Comprehensive types for the recruiting timeline feature
 */

// Enums
export type TaskCategory =
  | "academic"
  | "athletic"
  | "recruiting"
  | "exposure"
  | "mindset";
export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped";
export type Division = "DI" | "DII" | "DIII" | "NAIA" | "JUCO" | "ALL";
export type Phase =
  | "freshman"
  | "sophomore"
  | "junior"
  | "senior"
  | "committed";
export type StatusLabel = "on_track" | "slightly_behind" | "at_risk";
export type FitTier = "reach" | "match" | "safety" | "unlikely";
export type Urgency = "low" | "medium" | "high";
export type DeadlineUrgency =
  | "critical"
  | "urgent"
  | "upcoming"
  | "future"
  | "none";

// Core Task Types
export interface Task {
  id: string;
  category: TaskCategory;
  grade_level: number;
  title: string;
  description: string | null;
  required: boolean;
  dependency_task_ids: string[];
  why_it_matters: string | null;
  failure_risk: string | null;
  division_applicability: Division[];
  deadline_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Deadline Types
export interface DeadlineInfo {
  daysRemaining: number | null;
  urgency: DeadlineUrgency;
  isPastDue: boolean;
  urgencyColor: string;
  urgencyLabel: string;
}

export interface AthleteTask {
  id: string;
  athlete_id: string;
  task_id: string;
  status: TaskStatus;
  completed_at: string | null;
  is_recovery_task: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskWithStatus extends Task {
  athlete_task?: AthleteTask;
  has_incomplete_prerequisites: boolean;
  prerequisite_tasks?: Task[];
}

export interface TaskWithAthleteData extends Task {
  status: TaskStatus;
  completed_at: string | null;
  is_recovery_task: boolean;
}

// Dependency Analysis
export interface TaskDependencyAnalysis {
  task: Task;
  canProceed: boolean;
  isLocked: boolean;
  warning: {
    message: string;
    prerequisiteTask: Task;
    whyItMatters: string;
  } | null;
}

// Task Queries
export interface TaskQueryParams {
  gradeLevel?: number;
  category?: TaskCategory;
  division?: Division;
  required?: boolean;
  includeRecovery?: boolean;
  /** Compute deadlines for this athlete (parent viewing a linked athlete). */
  athleteId?: string;
}

export interface TaskCompletionStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  skipped: number;
  percentComplete: number;
}

// Phase & Milestone Types
export interface PhaseMilestone {
  phase: Phase;
  required_task_ids: string[];
  label: string;
  description: string;
  theme: string;
}

export interface MilestoneProgress {
  phase: Phase;
  required: string[];
  completed: string[];
  remaining: string[];
  percentComplete: number;
}

// Status Scoring Types
export interface StatusScoreInputs {
  taskCompletionRate: number;
  interactionFrequencyScore: number;
  coachInterestScore: number;
  academicStandingScore: number;
}

export interface StatusScoreResult {
  score: number;
  label: StatusLabel;
  color: "green" | "yellow" | "red";
  breakdown: StatusScoreInputs;
}

export const STATUS_WEIGHTS = {
  taskCompletion: 0.35,
  interactionFrequency: 0.25,
  coachInterest: 0.25,
  academicStanding: 0.15,
};

// Suggestion Types
export interface Suggestion {
  id: string;
  athlete_id: string;
  rule_type: string;
  urgency: Urgency;
  message: string;
  action_type: string | null;
  related_school_id: string | null;
  related_task_id: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
  completed: boolean;
  completed_at: string | null;
  pending_surface: boolean;
  surfaced_at: string | null;
  condition_snapshot: Record<string, unknown> | null;
  reappeared: boolean;
  previous_suggestion_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SuggestionData {
  rule_type: string;
  urgency: Urgency;
  message: string;
  action_type: string;
  related_school_id?: string;
  related_task_id?: string;
  reappeared?: boolean;
  previous_suggestion_id?: string | null;
  condition_snapshot?: Record<string, unknown> | null;
}

// Parent View Types
export interface ParentViewLog {
  id: string;
  parent_user_id: string;
  athlete_id: string;
  viewed_item_type: string;
  viewed_item_id: string | null;
  viewed_at: string | null;
}

// Fit Score Types
export interface FitScoreInputs {
  athleticFit?: number;
  academicFit?: number;
  opportunityFit?: number;
  personalFit?: number;
}

export interface FitScoreResult {
  score: number;
  tier: FitTier;
  breakdown: FitScoreInputs;
  missingDimensions: string[];
}

// Division Recommendation Types
export interface DivisionRecommendation {
  shouldConsiderOtherDivisions: boolean;
  recommendedDivisions: string[];
  message: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TasksResponse extends ApiResponse<Task[]> {
  data: Task[];
}

export interface AthleteTasksResponse extends ApiResponse<AthleteTask[]> {
  data: AthleteTask[];
}

export interface TaskWithStatusResponse extends ApiResponse<TaskWithStatus[]> {
  data: TaskWithStatus[];
}

// Use composable state types
export interface UseTasksState {
  tasks: Task[];
  athleteTasks: AthleteTask[];
  tasksWithStatus: TaskWithStatus[];
  loading: boolean;
  error: string | null;
  lockedTaskIds: string[];
  isTaskLocked: (taskId: string) => boolean;
}

export interface UsePhaseState {
  currentPhase: Phase;
  milestoneProgress: MilestoneProgress;
  canAdvance: boolean;
  loading: boolean;
  error: string | null;
}

export interface UseStatusScoreState {
  statusScore: number;
  statusLabel: StatusLabel;
  statusColor: "green" | "yellow" | "red";
  scoreBreakdown: StatusScoreInputs;
  loading: boolean;
  error: string | null;
}

