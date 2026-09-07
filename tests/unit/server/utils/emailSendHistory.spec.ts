import { describe, it, expect } from "vitest";
import {
  mergeEmailSendStatus,
  type RawEmailSend,
  type RawEmailEvent,
} from "~/server/utils/emailSendHistory";

const baseSend = (overrides: Partial<RawEmailSend> = {}): RawEmailSend => ({
  id: "send-1",
  message_id: "msg-1",
  purpose: "invite",
  recipient_email: "jane@example.com",
  subject: "You're invited!",
  success: true,
  error: null,
  entity_type: "family_invitation",
  entity_id: "inv-1",
  created_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

describe("mergeEmailSendStatus", () => {
  it("attaches the latest event for a matching message_id", () => {
    const sends = [baseSend()];
    const events: RawEmailEvent[] = [
      { message_id: "msg-1", event_type: "sent", occurred_at: "2026-09-01T00:00:01Z" },
      { message_id: "msg-1", event_type: "delivered", occurred_at: "2026-09-01T00:05:00Z" },
    ];

    const [row] = mergeEmailSendStatus(sends, events);

    expect(row.latestEventType).toBe("delivered");
    expect(row.latestEventAt).toBe("2026-09-01T00:05:00Z");
  });

  it("resolves nulls when no event has arrived yet", () => {
    const [row] = mergeEmailSendStatus([baseSend()], []);

    expect(row.latestEventType).toBeNull();
    expect(row.latestEventAt).toBeNull();
  });

  it("resolves nulls for a send whose Resend call failed (no message_id)", () => {
    const sends = [baseSend({ message_id: null, success: false, error: "timeout" })];
    const events: RawEmailEvent[] = [
      { message_id: "msg-1", event_type: "delivered", occurred_at: "2026-09-01T00:05:00Z" },
    ];

    const [row] = mergeEmailSendStatus(sends, events);

    expect(row.messageId).toBeNull();
    expect(row.success).toBe(false);
    expect(row.latestEventType).toBeNull();
  });

  it("does not cross-link events belonging to a different message_id", () => {
    const sends = [baseSend({ id: "send-2", message_id: "msg-2" })];
    const events: RawEmailEvent[] = [
      { message_id: "msg-1", event_type: "bounced", occurred_at: "2026-09-01T00:05:00Z" },
    ];

    const [row] = mergeEmailSendStatus(sends, events);

    expect(row.latestEventType).toBeNull();
  });
});
