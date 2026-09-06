/**
 * GET /api/admin/email-events
 * Fetches Resend outbound email lifecycle events written by
 * POST /api/webhooks/resend-events (Spec B2 delivery log).
 *
 * Query params:
 *   limit          - rows per page (default: 50, max: 200)
 *   offset         - rows to skip (default: 0)
 *   eventType      - filter by exact event_type (optional)
 *   recipientEmail - filter by recipient_email substring, case-insensitive (optional)
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Response: { rows: AdminEmailEventRow[], total: number }
 */
import { defineEventHandler, createError, getQuery } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export interface AdminEmailEventRow {
  id: string;
  message_id: string;
  event_type: string;
  recipient_email: string | null;
  subject: string | null;
  occurred_at: string;
  created_at: string;
}

interface GetEmailEventsResponse {
  rows: AdminEmailEventRow[];
  total: number;
}

export default defineEventHandler(
  async (event): Promise<GetEmailEventsResponse> => {
    const logger = useLogger(event, "admin/email-events");
    try {
      const admin = await requireAdmin(event);
      // email_events is not yet in the generated Database schema (migration
      // applied live via MCP, types not regenerated) — same untyped client
      // pattern used by server/utils/adminAudit.ts and admin/audit-log.get.ts.
      const supabaseAdmin = useSupabaseAdmin() as unknown as SupabaseClient;

      const query = getQuery(event);
      const limit = Math.max(
        1,
        Math.min(parseInt(String(query.limit ?? "50"), 10) || 50, 200),
      );
      const offset = Math.max(
        parseInt(String(query.offset ?? "0"), 10) || 0,
        0,
      );

      let eventsQuery = supabaseAdmin
        .from("email_events")
        .select(
          "id, message_id, event_type, recipient_email, subject, occurred_at, created_at",
          { count: "exact" },
        )
        .order("occurred_at", { ascending: false });

      if (typeof query.eventType === "string" && query.eventType) {
        eventsQuery = eventsQuery.eq("event_type", query.eventType);
      }
      if (typeof query.recipientEmail === "string" && query.recipientEmail) {
        eventsQuery = eventsQuery.ilike(
          "recipient_email",
          `%${query.recipientEmail}%`,
        );
      }

      const {
        data: rows,
        error: fetchError,
        count,
      } = await eventsQuery.range(offset, offset + limit - 1);

      if (fetchError) {
        logger.error("Failed to fetch email events", fetchError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch email events",
        });
      }

      const total = count ?? 0;
      logger.info(
        `Admin ${admin.id} fetched email events (${rows?.length ?? 0} of ${total})`,
      );

      return { rows: (rows ?? []) as AdminEmailEventRow[], total };
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }
      logger.error("Get email events endpoint failed", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch email events",
      });
    }
  },
);
