/**
 * Fire-and-forget logging of outbound email sends into `email_sends`.
 * Never throws upstream — a failed audit write must not block or fail the
 * email send it's recording. Rows join to `email_events` on `message_id` so
 * admin views can resolve "invite to jane@x.com" -> delivered/bounced/etc.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseAdmin } from "./supabase";
import { createLogger } from "./logger";

const logger = createLogger("emailSends");

export type EmailSendPurpose =
  | "invite"
  | "notification"
  | "onboarding_nudge"
  | "deadline_alert"
  | "weekly_digest"
  | "recurring"
  | "feedback";

export interface EmailSendContext {
  purpose: EmailSendPurpose;
  userId?: string;
  familyUnitId?: string;
  entityType?: string;
  entityId?: string;
}

interface EmailSendOutcome {
  recipientEmail: string;
  subject: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function logEmailSend(
  context: EmailSendContext,
  outcome: EmailSendOutcome,
): Promise<void> {
  try {
    // email_sends is not yet in the generated Database schema, same pattern
    // as admin_audit_log in adminAudit.ts — untyped client for this insert only.
    const untypedSupabase = useSupabaseAdmin() as unknown as SupabaseClient;
    const { error } = await untypedSupabase.from("email_sends").insert({
      message_id: outcome.messageId ?? null,
      purpose: context.purpose,
      recipient_email: outcome.recipientEmail,
      user_id: context.userId ?? null,
      family_unit_id: context.familyUnitId ?? null,
      entity_type: context.entityType ?? null,
      entity_id: context.entityId ?? null,
      subject: outcome.subject,
      success: outcome.success,
      error: outcome.error ?? null,
    });
    if (error) {
      logger.error("logEmailSend insert failed", {
        purpose: context.purpose,
        error: error.message,
      });
    }
  } catch (err) {
    logger.error("logEmailSend threw", {
      purpose: context.purpose,
      err: String(err),
    });
  }
}
