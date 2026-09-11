import { createError } from "h3";
import type { AdminDbEnv } from "~/server/utils/supabase";

/**
 * Validates the `env` query/body param admin user-management endpoints accept
 * to target "prod" (default, this deployment's native DB) or "qa" (the QA/staging
 * project, reached via _QA-suffixed env vars regardless of which deployment is running).
 */
export function resolveAdminDbEnv(raw: unknown): AdminDbEnv {
  if (raw === undefined || raw === null || raw === "") {
    return "prod";
  }
  if (raw === "prod" || raw === "qa") {
    return raw;
  }
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid env param - must be "prod" or "qa"',
  });
}
