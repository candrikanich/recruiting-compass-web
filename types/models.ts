/**
 * Record type definitions for structured JSON fields
 */
export interface PrivateNotes {
  [key: string]: string | number | boolean | string[] | null;
}

export interface OfferDetails {
  terms?: string;
  start_date?: string;
  end_date?: string;
  conditions?: string[];
  notes?: string;
  [key: string]: string | string[] | null | undefined;
}

export interface AcademicInfo {
  gpa_requirement?: number;
  sat_requirement?: number;
  act_requirement?: number;
  additional_requirements?: string[];
  [key: string]: number | string[] | null | undefined;
}

export interface Amenities {
  facilities?: string[];
  housing?: string;
  dining?: string;
  medical?: string;
  equipment?: string;
  academic_support?: string;
  [key: string]: string | string[] | null | undefined;
}

/**
 * User account and athlete profile
 */
export interface User {
  id: string;
  email: string;
  role?: "parent" | "student";
  full_name?: string;
  profile_photo_url?: string | null;
  linked_accounts?: LinkedAccount[];
  // Timeline fields (from Phase 1)
  current_phase?: "freshman" | "sophomore" | "junior" | "senior" | "committed";
  status_label?: "on_track" | "slightly_behind" | "at_risk";
  status_score?: number;
  target_division?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountLink {
  id: string;
  parent_user_id: string | null;
  player_user_id: string | null;
  invited_email: string;
  initiator_user_id: string;
  initiator_role: "parent" | "student";
  invitation_token: string;
  expires_at: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  invited_at: string;
  accepted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LinkedAccount {
  user_id: string;
  email: string;
  full_name?: string;
  role: "parent" | "student";
  relationship: "parent" | "student"; // From perspective of current user
}

export interface School {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  city?: string | null;
  state?: string | null;
  division: "D1" | "D2" | "D3" | "NAIA" | "JUCO" | null;
  conference: string | null;
  ranking?: number | null;
  is_favorite: boolean;
  website: string | null;
  favicon_url: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  ncaa_id?: string | null;
  status:
    | "interested"
    | "contacted"
    | "camp_invite"
    | "recruited"
    | "official_visit_invited"
    | "official_visit_scheduled"
    | "offer_received"
    | "committed"
    | "not_pursuing";
  status_changed_at?: string | null;
  priority_tier?: "A" | "B" | "C" | null;
  notes: string | null;
  pros: string[];
  cons: string[];
  private_notes?: PrivateNotes | null;
  offer_details?: OfferDetails | null;
  academic_info?: AcademicInfo | null;
  amenities?: Amenities | null;
  coaching_philosophy?: string | null;
  coaching_style?: string | null;
  recruiting_approach?: string | null;
  communication_style?: string | null;
  success_metrics?: string | null;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SchoolStatusHistory {
  id: string;
  school_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string;
  changed_at: string;
  notes?: string | null;
  created_at: string;
}

export interface Coach {
  id: string;
  school_id?: string;
  user_id?: string;
  role: "head" | "assistant" | "recruiting";
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  notes: string | null;
  private_notes?: PrivateNotes | null;
  responsiveness_score: number;
  last_contact_date: string | null;
  availability?: CoachAvailability | null;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoachAvailability {
  timezone: string;
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
  blackout_dates: string[];
  [key: string]: DayAvailability | string | string[];
}

export interface DayAvailability {
  available: boolean;
  start_time: string;
  end_time: string;
}

export interface Interaction {
  id: string;
  school_id?: string;
  coach_id?: string | null;
  event_id?: string | null;
  type:
    | "email"
    | "phone_call"
    | "text"
    | "in_person_visit"
    | "virtual_meeting"
    | "camp"
    | "showcase"
    | "tweet"
    | "dm";
  direction: "outbound" | "inbound";
  subject?: string | null;
  content?: string | null;
  sentiment?: "positive" | "neutral" | "negative" | "very_positive" | null;
  recorded_date?: string;
  occurred_at?: string;
  logged_by?: string;
  attachments?: string[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface Event {
  id: string;
  user_id?: string;
  school_id?: string | null;
  type: "showcase" | "camp" | "official_visit" | "unofficial_visit" | "game";
  name: string;
  location: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  checkin_time?: string | null;
  url?: string | null;
  description?: string | null;
  event_source?:
    | "email"
    | "flyer"
    | "web_search"
    | "recommendation"
    | "friend"
    | "other"
    | null;
  coaches_present?: string[];
  performance_notes?: string | null;
  stats_recorded?: Record<string, unknown> | null;
  cost?: number | null;
  registered: boolean;
  attended: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PerformanceMetric {
  id: string;
  user_id?: string;
  recorded_date: string;
  metric_type:
    | "velocity"
    | "exit_velo"
    | "sixty_time"
    | "pop_time"
    | "batting_avg"
    | "era"
    | "strikeouts"
    | "other";
  value: number;
  unit: string;
  event_id?: string | null;
  notes?: string | null;
  verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  user_id?: string;
  type:
    | "highlight_video"
    | "transcript"
    | "resume"
    | "rec_letter"
    | "questionnaire"
    | "stats_sheet";
  title: string;
  description?: string | null;
  file_url: string;
  file_type?: string | null;
  version?: number;
  school_id?: string | null;
  is_current: boolean;
  shared_with_schools?: string[];
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Offer {
  id: string;
  user_id?: string;
  school_id: string;
  offer_type:
    | "full_ride"
    | "partial"
    | "scholarship"
    | "recruited_walk_on"
    | "preferred_walk_on";
  scholarship_amount?: number | null;
  scholarship_percentage?: number | null;
  offer_date: string;
  deadline_date?: string | null;
  status: "pending" | "accepted" | "declined" | "expired";
  notes?: string | null;
  conditions?: string | null;
  academic_requirements?: Record<string, unknown> | null;
  athletic_requirements?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export type NotificationType =
  | "follow_up_reminder"
  | "deadline_alert"
  | "daily_digest"
  | "inbound_interaction"
  | "offer"
  | "event";

export type NotificationPriority = "low" | "normal" | "high";

export interface Notification {
  id: string;
  user_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type?:
    | "offer"
    | "event"
    | "recommendation"
    | "coach"
    | "school"
    | "interaction"
    | null;
  related_entity_id?: string | null;
  related_school_id?: string | null;
  related_coach_id?: string | null;
  related_offer_id?: string | null;
  related_event_id?: string | null;
  read_at?: string | null;
  scheduled_for: string;
  priority: NotificationPriority;
  sent_at?: string | null;
  email_sent?: boolean;
  email_sent_at?: string | null;
  action_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationSettings {
  followUpReminderDays: number;
  enableFollowUpReminders: boolean;
  enableDeadlineAlerts: boolean;
  enableDailyDigest: boolean;
  enableInboundInteractionAlerts: boolean;
  enableEmailNotifications: boolean;
  emailOnlyHighPriority: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface HomeLocation {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
}

export interface PlayerDetails {
  graduation_year?: number;
  high_school?: string;
  club_team?: string;
  positions?: string[];
  bats?: "L" | "R" | "S";
  throws?: "L" | "R";
  height_inches?: number;
  weight_lbs?: number;
  gpa?: number;
  sat_score?: number;
  act_score?: number;
  ncaa_id?: string;
  perfect_game_id?: string;
  prep_baseball_id?: string;
  // Social Media
  twitter_handle?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  facebook_url?: string;
  // Contact Info
  phone?: string;
  email?: string;
  allow_share_phone?: boolean;
  allow_share_email?: boolean;
  // School Info
  school_name?: string;
  school_address?: string;
  school_city?: string;
  school_state?: string;
  // High School Team Levels
  ninth_grade_team?: string;
  ninth_grade_coach?: string;
  tenth_grade_team?: string;
  tenth_grade_coach?: string;
  eleventh_grade_team?: string;
  eleventh_grade_coach?: string;
  twelfth_grade_team?: string;
  twelfth_grade_coach?: string;
  // Travel Team
  travel_team_year?: number;
  travel_team_name?: string;
  travel_team_coach?: string;
}

export interface SchoolPreference {
  id: string;
  category: "location" | "academic" | "program" | "custom";
  type: string;
  value: unknown;
  priority: number;
  is_dealbreaker: boolean;
}

export interface SchoolPreferences {
  preferences: SchoolPreference[];
  template_used?: string;
  last_updated: string;
}

export interface PreferenceHistoryEntry {
  timestamp: string;
  changed_by: string;
  changes: {
    field: string;
    old_value: unknown;
    new_value: unknown;
  }[];
}

export interface DashboardWidgetVisibility {
  statsCards: {
    coaches: boolean;
    schools: boolean;
    interactions: boolean;
    offers: boolean;
    events: boolean;
    performance: boolean;
    notifications: boolean;
    socialMedia: boolean;
  };
  widgets: {
    recentNotifications: boolean;
    linkedAccounts: boolean;
    recruitingCalendar: boolean;
    quickTasks: boolean;
    atAGlanceSummary: boolean;
    offerStatusOverview: boolean;
    interactionTrendChart: boolean;
    schoolInterestChart: boolean;
    schoolMapWidget: boolean;
    coachFollowupWidget: boolean;
    eventsSummary: boolean;
    performanceSummary: boolean;
    recentDocuments: boolean;
    interactionStats: boolean;
    schoolStatusOverview: boolean;
    coachResponsiveness: boolean;
    upcomingDeadlines: boolean;
  };
}

export interface UserPreferences {
  user_id: string;
  notification_settings: NotificationSettings;
  communication_templates?: Record<string, unknown>;
  dashboard_layout?: DashboardWidgetVisibility;
  home_location?: HomeLocation;
  player_details?: PlayerDetails;
  school_preferences?: SchoolPreferences;
  preference_history?: PreferenceHistoryEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  query: string;
  searchType: "all" | "schools" | "coaches" | "interactions" | "metrics";
  filters: {
    schools?: Record<string, unknown>;
    coaches?: Record<string, unknown>;
    interactions?: Record<string, unknown>;
    metrics?: Record<string, unknown>;
  };
  is_favorite: boolean;
  use_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  searchType: "all" | "schools" | "coaches" | "interactions" | "metrics";
  results_count: number;
  searched_at: string;
  filters_applied?: Record<string, unknown>;
}

export interface CommunicationTemplate {
  id: string;
  user_id: string | null; // null for predefined templates
  name: string;
  description?: string | null;
  type: "email" | "message" | "phone_script";
  subject?: string | null;
  body: string;
  tags?: string[];
  variables?: string[]; // e.g., {{coach_name}}, {{school_name}}
  unlock_conditions?: Record<string, unknown> | null; // Unlock condition groups for predefined templates
  is_predefined?: boolean; // True for system-provided templates
  is_favorite: boolean;
  use_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface InteractionAutomation {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  trigger: "date_based" | "event_based" | "manual";
  trigger_config?: Record<string, unknown>;
  action:
    | "create_reminder"
    | "send_email"
    | "log_interaction"
    | "update_status";
  action_config: Record<string, unknown>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FollowUpReminder {
  id: string;
  user_id: string;
  school_id?: string;
  coach_id?: string;
  interaction_id?: string;
  reminder_type: "follow_up" | "deadline" | "custom";
  title: string;
  description?: string | null;
  due_date: string;
  priority: "low" | "medium" | "high";
  is_completed: boolean;
  completed_at?: string | null;
  notification_sent: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SharedRecord {
  id: string;
  owner_user_id: string;
  shared_with_user_id: string;
  entity_type: "school" | "coach" | "interaction" | "metric" | "document";
  entity_id: string;
  access_level: "view" | "edit" | "admin";
  shared_at: string;
  expires_at?: string | null;
  created_at?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  email: string;
  name?: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
  permissions?: Record<string, boolean>;
  deleted_at?: string | null;
  created_at?: string;
}

export interface RecordComment {
  id: string;
  user_id: string;
  entity_type: "school" | "coach" | "interaction" | "metric";
  entity_id: string;
  content: string;
  mentions?: string[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export const isNotificationRead = (notification: Notification): boolean => {
  return !!notification.read_at;
};

// Type alias for backward compatibility
export type Performance = PerformanceMetric;
