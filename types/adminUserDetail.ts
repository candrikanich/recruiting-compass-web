export interface AdminUserDetail {
  account: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    is_admin: boolean;
    created_at: string;
    graduation_year: number | null;
    current_phase: string | null;
    onboarding_completed: boolean | null;
    status_label: string | null;
    deletion_requested_at: string | null;
  };
  familyUnitId: string | null;
  family: {
    unit: Record<string, unknown> | null;
    members: {
      user_id: string;
      role: string | null;
      email: string | null;
      full_name: string | null;
    }[];
    pendingInvitations: Record<string, unknown>[];
  };
  athletes: Record<string, unknown>[];
  recruiting: {
    counts: {
      schools: number;
      coaches: number;
      interactions: number;
      offers: number;
      events: number;
      messages: number;
    };
    recentInteractions: Record<string, unknown>[];
    recentOffers: Record<string, unknown>[];
    recentEvents: Record<string, unknown>[];
    recentMessages: Record<string, unknown>[];
  };
}
