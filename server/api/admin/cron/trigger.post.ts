/**
 * POST /api/admin/cron/trigger
 * Guarded manual cron trigger for the admin Ops "Jobs" tab. Only jobs in
 * TRIGGERABLE_JOBS / DRYRUN_ONLY_JOBS (utils/cronDashboard.ts, shared with
 * the UI) can run from here. Destructive jobs (BLOCKED_JOBS) and any unknown
 * jobName always 403 — the UI hiding a button is NOT the security boundary,
 * this server-side allowlist check is.
 *
 * Invokes the target job's own /api/cron/:jobName endpoint internally via
 * Nitro's $fetch, authenticated with CRON_SECRET, so the job's normal
 * withCronRun bookkeeping (cron_runs row) still applies. Every successful
 * trigger is recorded in admin_audit_log via logAdminAction.
 *
 * Requires: Authentication + is_admin.
 */
import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { requireAdmin } from "~/server/utils/auth";
import { logAdminAction } from "~/server/utils/adminAudit";
import { useLogger } from "~/server/utils/logger";
import { TRIGGERABLE_JOBS, DRYRUN_ONLY_JOBS } from "~/utils/cronDashboard";

const bodySchema = z.object({
  jobName: z.string(),
  dryRun: z.boolean().optional(),
});

export interface AdminCronTriggerResponse {
  ok: true;
  jobName: string;
  dryRun: boolean;
  result?: unknown;
}

export default defineEventHandler(
  async (event): Promise<AdminCronTriggerResponse> => {
    const logger = useLogger(event, "admin/cron/trigger");

    await requireAdmin(event);

    const { jobName, dryRun: requestedDryRun } = bodySchema.parse(
      await readBody(event),
    );

    const isTriggerable = (TRIGGERABLE_JOBS as readonly string[]).includes(jobName);
    const isDryRunOnly = (DRYRUN_ONLY_JOBS as readonly string[]).includes(jobName);

    if (!isTriggerable && !isDryRunOnly) {
      logger.warn("Blocked cron trigger attempt", { jobName });
      logAdminAction(event, {
        action: "cron.trigger",
        meta: { jobName, blocked: true },
      });
      throw createError({
        statusCode: 403,
        statusMessage: "This job cannot be triggered from the admin UI",
      });
    }

    const dryRun = isDryRunOnly ? true : Boolean(requestedDryRun);

    const secret = process.env.CRON_SECRET;
    if (!secret) {
      logger.error("CRON_SECRET not configured; cannot trigger job", { jobName });
      throw createError({
        statusCode: 500,
        statusMessage: "Cron secret not configured",
      });
    }

    let result: unknown;
    try {
      result = await $fetch(`/api/cron/${jobName}`, {
        headers: { "x-cron-secret": secret },
        ...(dryRun ? { query: { dryRun: 1 } } : {}),
      });
    } catch (err) {
      // The cron job records its own error row in cron_runs; never leak the
      // secret or the raw upstream error to the client.
      logger.error("Cron trigger failed", { jobName, err: String(err) });
      logAdminAction(event, {
        action: "cron.trigger",
        meta: { jobName, dryRun, failed: true },
      });
      throw createError({
        statusCode: 502,
        statusMessage: "Job run failed — see the job's recent runs",
      });
    }

    logAdminAction(event, { action: "cron.trigger", meta: { jobName, dryRun } });

    return { ok: true, jobName, dryRun, result };
  },
);
