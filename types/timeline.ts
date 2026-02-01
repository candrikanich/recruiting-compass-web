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

export const PHASE_MILESTONES: Record<string, string[]> = {
  freshmanToSophomore: ["task-9-a1", "task-9-at1", "task-9-f1", "task-9-f2"],
  sophomoreToJunior: ["task-10-r1", "task-10-r3", "task-10-r5", "task-10-a2"],
  juniorToSenior: ["task-11-a1", "task-11-a3", "task-11-r3", "task-11-r1"],
  seniorToCommitted: ["task-12-d3"],
};

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

export const FIT_WEIGHTS = {
  athletic: 0.4,
  academic: 0.25,
  opportunity: 0.2,
  personal: 0.15,
};

// Portfolio Health Types
export interface PortfolioHealth {
  reaches: number;
  matches: number;
  safeties: number;
  unlikelies: number;
  total: number;
  warnings: string[];
  status: "healthy" | "needs_attention" | "at_risk" | "not_started";
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

// Auto-completion trigger mappings
export interface TaskTriggerMapping {
  [key: string]: string[];
}

export const AUTO_TASK_TRIGGERS: TaskTriggerMapping = {
  school_added: [],
  video_uploaded: [],
  interaction_logged: [],
  visit_scheduled: [],
  eligibility_registered: [],
  test_score_recorded: [],
  event_attended: [],
  camp_attended: [],
  coach_contacted: [],
};
