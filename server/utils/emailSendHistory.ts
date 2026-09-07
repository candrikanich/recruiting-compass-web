import type { AdminEmailSendRow } from "~/types/adminUserDetail";

export interface RawEmailSend {
  id: string;
  message_id: string | null;
  purpose: string;
  recipient_email: string;
  subject: string | null;
  success: boolean;
  error: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface RawEmailEvent {
  message_id: string;
  event_type: string;
  occurred_at: string;
}

/**
 * Pure: pair each email_sends row with the most recent email_events row for
 * its message_id (Resend can post several lifecycle events per message —
 * sent, then delivered, then opened, etc.). A send with no message_id (the
 * Resend call itself failed) or no matching events yet resolves to nulls.
 */
export function mergeEmailSendStatus(
  sends: RawEmailSend[],
  events: RawEmailEvent[],
): AdminEmailSendRow[] {
  const latestByMessageId = new Map<string, RawEmailEvent>();
  for (const event of events) {
    const current = latestByMessageId.get(event.message_id);
    if (!current || event.occurred_at > current.occurred_at) {
      latestByMessageId.set(event.message_id, event);
    }
  }

  return sends.map((send) => {
    const latest = send.message_id
      ? latestByMessageId.get(send.message_id)
      : undefined;
    return {
      id: send.id,
      purpose: send.purpose,
      recipientEmail: send.recipient_email,
      subject: send.subject,
      success: send.success,
      error: send.error,
      entityType: send.entity_type,
      entityId: send.entity_id,
      sentAt: send.created_at,
      messageId: send.message_id,
      latestEventType: latest?.event_type ?? null,
      latestEventAt: latest?.occurred_at ?? null,
    };
  });
}
