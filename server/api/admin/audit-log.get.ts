/**
 * GET /api/admin/audit-log
 * Fetches admin audit log entries (view-as, deletes, admin grants, etc.)
 * written by `server/utils/adminAudit.ts`.
 *
 * Query params:
 *   limit  - rows per page (default: 50, max: 200)
 *   offset - rows to skip (default: 0)
 *   action - filter by exact action name (optional)
 *   actor  - filter by actor_admin_id (optional)
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Response: { rows: AdminAuditRow[], total: number }
 */

import { defineEventHandler, createError, getQuery } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export interface AdminAuditRow {
  id: string;
  actor_admin_id: string;
  action: string;
  target_user_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

interface GetAuditLogResponse {
  rows: AdminAuditRow[];
  total: number;
}

export default defineEventHandler(
  async (event): Promise<GetAuditLogResponse> => {
    const logger = useLogger(event, "admin/audit-log");
    try {
      const admin = await requireAdmin(event);
      // admin_audit_log is not yet in the generated Database schema (see
      // server/utils/adminAudit.ts), so use an untyped client for this read only.
      const supabaseAdmin = useSupabaseAdmin() as unknown as SupabaseClient;

      const query = getQuery(event);
      const limit = Math.min(
        parseInt(String(query.limit ?? "50"), 10) || 50,
        200,
      );
      const offset = Math.max(
        parseInt(String(query.offset ?? "0"), 10) || 0,
        0,
      );

      let auditQuery = supabaseAdmin
        .from("admin_audit_log")
        .select(
          "id, actor_admin_id, action, target_user_id, meta, created_at",
          {
            count: "exact",
          },
        )
        .order("created_at", { ascending: false });

      if (typeof query.action === "string" && query.action) {
        auditQuery = auditQuery.eq("action", query.action);
      }
      if (typeof query.actor === "string" && query.actor) {
        auditQuery = auditQuery.eq("actor_admin_id", query.actor);
      }

      const {
        data: rows,
        error: fetchError,
        count,
      } = await auditQuery.range(offset, offset + limit - 1);

      if (fetchError) {
        logger.error("Failed to fetch audit log", fetchError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch audit log",
        });
      }

      const total = count ?? 0;
      logger.info(
        `Admin ${admin.id} fetched audit log (${rows?.length ?? 0} of ${total})`,
      );

      return {
        rows: (rows ?? []) as AdminAuditRow[],
        total,
      };
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }
      logger.error("Get audit log endpoint failed", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch audit log",
      });
    }
  },
);
