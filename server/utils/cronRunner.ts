/**
 * Cron execution recording + shared auth for /api/cron/* endpoints.
 *
 * Every Vercel cron wraps its work in `withCronRun`, which:
 *   1. Verifies the CRON_SECRET (throws 401 before any row is written).
 *   2. Inserts a `cron_runs` row with status 'running'.
 *   3. Runs the job; on resolve stamps 'success' (or 'partial' if the job
 *      reported failed rows), on throw stamps 'error' + message and RETHROWS
 *      so Vercel sees a non-2xx and flags the run red.
 *
 * All cron_runs writes are best-effort: if the insert/update fails we log and
 * carry on. Recording must never break or mask the actual job.
 */

import { createError, getHeader, type H3Event } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { verifySharedSecret } from "~/server/utils/secrets";

const logger = createLogger("cron/runner");

export type CronStatus = "running" | "success" | "partial" | "error";

export interface CronRunContext {
  /** Total rows the job acted on (attempted). */
  setProcessed: (n: number) => void;
  /** Rows that failed within the job — non-zero flips the run to 'partial'. */
  setFailed: (n: number) => void;
}

/**
 * Verifies the shared CRON_SECRET. Accepts `Authorization: Bearer <secret>`
 * (what Vercel Cron sends) or the legacy `x-cron-secret: <secret>` header.
 * Throws 401 when the secret is missing or wrong.
 */
export function requireCronAuth(event: H3Event): void {
  const authHeader = getHeader(event, "authorization");
  const cronSecretHeader = getHeader(event, "x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  const isAuthorized =
    Boolean(cronSecret) &&
    ((bearerSecret && verifySharedSecret(bearerSecret, cronSecret as string)) ||
      (cronSecretHeader &&
        verifySharedSecret(cronSecretHeader, cronSecret as string)));

  if (!isAuthorized) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}

async function insertRunningRow(jobName: string): Promise<string | null> {
  try {
    const supabase = useSupabaseAdmin();
    const { data, error } = await supabase
      .from("cron_runs")
      .insert({ job_name: jobName, status: "running" })
      .select("id")
      .single();
    if (error) {
      logger.error("Failed to insert cron_runs row", { jobName, error });
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    logger.error("Exception inserting cron_runs row", { jobName, error: e });
    return null;
  }
}

async function finalizeRun(
  runId: string | null,
  jobName: string,
  fields: {
    status: CronStatus;
    startedAtMs: number;
    processed: number | null;
    failed: number | null;
    error?: string;
  },
): Promise<void> {
  if (!runId) return;
  try {
    const supabase = useSupabaseAdmin();
    const { error } = await supabase
      .from("cron_runs")
      .update({
        status: fields.status,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - fields.startedAtMs,
        rows_processed: fields.processed,
        rows_failed: fields.failed,
        error: fields.error ?? null,
      })
      .eq("id", runId);
    if (error) {
      logger.error("Failed to finalize cron_runs row", { jobName, error });
    }
  } catch (e) {
    logger.error("Exception finalizing cron_runs row", { jobName, error: e });
  }
}

/**
 * Authenticates, records a `cron_runs` row around `fn`, and returns fn's value
 * unchanged (so each endpoint's response shape is preserved).
 */
export async function withCronRun<T>(
  event: H3Event,
  jobName: string,
  fn: (ctx: CronRunContext) => Promise<T>,
): Promise<T> {
  requireCronAuth(event);

  const startedAtMs = Date.now();
  const runId = await insertRunningRow(jobName);

  let processed: number | null = null;
  let failed: number | null = null;
  const ctx: CronRunContext = {
    setProcessed: (n) => {
      processed = n;
    },
    setFailed: (n) => {
      failed = n;
    },
  };

  try {
    const result = await fn(ctx);
    await finalizeRun(runId, jobName, {
      status: failed && failed > 0 ? "partial" : "success",
      startedAtMs,
      processed,
      failed,
    });
    return result;
  } catch (err) {
    await finalizeRun(runId, jobName, {
      status: "error",
      startedAtMs,
      processed,
      failed,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
