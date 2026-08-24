/**
 * Fire-and-forget audit logging for sensitive admin actions.
 * Never throws upstream — a failed audit write must not block the admin action itself.
 */
import type { H3Event } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseAdmin } from "./supabase";
import { useLogger } from "./logger";

export type AdminAuditAction =
  | "view_as.start"
  | "view_as.stop"
  | "user.delete"
  | "user.bulk_delete"
  | "admin.grant"
  | "admin.revoke"
  | "invite.resend"
  | "cron.trigger";

interface AdminAuditEntry {
  action: AdminAuditAction;
  targetUserId?: string;
  meta?: Record<string, unknown>;
}

export async function logAdminAction(
  event: H3Event,
  entry: AdminAuditEntry,
): Promise<void> {
  const logger = useLogger(event, "adminAudit");
  try {
    const actorId = event.context.adminUserId as string | undefined;
    if (!actorId) {
      logger.error("logAdminAction: missing actor id in context", {
        action: entry.action,
      });
      return;
    }
    // admin_audit_log is not yet in the generated Database schema (migration
    // pending live application), so use an untyped client for this insert only.
    const untypedSupabase = useSupabaseAdmin() as unknown as SupabaseClient;
    const { error } = await untypedSupabase.from("admin_audit_log").insert({
      actor_admin_id: actorId,
      action: entry.action,
      target_user_id: entry.targetUserId ?? null,
      meta: entry.meta ?? {},
    });
    if (error) {
      logger.error("logAdminAction insert failed", {
        action: entry.action,
        error: error.message,
      });
    }
  } catch (err) {
    logger.error("logAdminAction threw", {
      action: entry.action,
      err: String(err),
    });
  }
}
