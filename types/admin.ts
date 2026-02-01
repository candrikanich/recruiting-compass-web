export interface PendingInvitation {
  id: string;
  invited_email: string;
  initiator_email: string;
  initiator_name: string | null;
  initiator_role: string;
  invitation_token: string | null;
  expires_at: string;
  created_at: string;
  invited_at: string;
}

export type InvitationFilterType = "all" | "expiring-soon" | "active";
