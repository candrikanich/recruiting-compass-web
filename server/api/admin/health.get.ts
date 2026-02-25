/**
 * GET /api/admin/health
 * Simple health check: DB connectivity and key env vars.
 * Requires: Authentication + is_admin.
 */

import { defineEventHandler, createError } from "h3";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("admin/health");

export interface AdminHealthResponse {
  ok: boolean;
  db: "ok" | "error";
  resend: "ok" | "missing";
  checks: {
    name: string;
    status: "ok" | "error" | "missing";
    message?: string;
  }[];
}

export default defineEventHandler(
  async (event): Promise<AdminHealthResponse> => {
    try {
      await requireAdmin(event);
      const supabaseAdmin = useSupabaseAdmin();

      const checks: AdminHealthResponse["checks"] = [];

      // DB: run a trivial query
      let dbStatus: "ok" | "error" = "error";
      try {
        const { error } = await supabaseAdmin
          .from("users")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (!error) {
          dbStatus = "ok";
          checks.push({ name: "Database", status: "ok" });
        } else {
          logger.error("Database health check failed", error);
          checks.push({
            name: "Database",
            status: "error",
            message: "Database connection failed",
          });
        }
      } catch (e) {
        logger.error("Database health check exception", e);
        checks.push({
          name: "Database",
          status: "error",
          message: "Database connection failed",
        });
      }

      // Resend API key (for feedback email)
      const resendOk = Boolean(process.env.RESEND_API_KEY);
      checks.push({
        name: "Resend (email)",
        status: resendOk ? "ok" : "missing",
        message: resendOk ? undefined : "RESEND_API_KEY not set",
      });

      const ok = dbStatus === "ok";
      return {
        ok,
        db: dbStatus,
        resend: resendOk ? "ok" : "missing",
        checks,
      };
    } catch (error) {
      logger.error("Admin health endpoint failed", error);
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }
      throw createError({
        statusCode: 500,
        statusMessage: "Health check failed",
      });
    }
  },
);
