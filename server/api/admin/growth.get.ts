/**
 * GET /api/admin/growth?days=30
 * Growth analytics panel: signup funnel + dropoff, DAU/WAU/MAU + daily trend,
 * and feature adoption counts, over a rolling window (default 30d, clamped
 * to [1, 90]).
 *
 * SELECT/count-only — no mutation. Every per-table read is wrapped so a
 * single failing table degrades to an empty/zero contribution instead of
 * failing the whole panel (never a 500 for one bad table).
 *
 * Requires: Authentication + is_admin.
 */

import { defineEventHandler, getQuery } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import {
  dailyActiveUsers,
  windowActiveCount,
  funnelWithDropoff,
  adoption,
  type ActivityRow,
} from "~/utils/growthAnalytics";
import type { AdminGrowth } from "~/types/adminGrowth";

/** Tables whose rows count as "activity" for DAU/WAU/MAU, normalized to (userId, ts). */
const ACTIVITY = [
  { table: "interactions", ts: "occurred_at", user: "logged_by" },
  { table: "athlete_messages", ts: "sent_at", user: "user_id" },
  { table: "events", ts: "created_at", user: "user_id" },
  { table: "video_links", ts: "created_at", user: "user_id" },
  { table: "offers", ts: "created_at", user: "user_id" },
] as const;

/** Tables used for feature-adoption counts — how many distinct users have touched each. */
const ADOPTION_TABLES = [
  "athlete_messages",
  "interactions",
  "events",
  "video_links",
  "coaches",
  "offers",
  "performance_metrics",
  "documents",
] as const;

// Table set spans several tables (video_links, offers, family_invitations, etc.)
// referenced by generic string name below — use the untyped client, same
// pattern as server/api/admin/ops/db-health.get.ts.
type Db = SupabaseClient;

async function loadActivityRows(
  db: Db,
  windowStart: Date,
  logger: ReturnType<typeof useLogger>,
): Promise<ActivityRow[]> {
  const rows: ActivityRow[] = [];
  for (const a of ACTIVITY) {
    try {
      // Minimal-column select — only the user + timestamp columns needed for dedup, no PII.
      const { data, error } = await db
        .from(a.table)
        .select(`${a.user}, ${a.ts}`)
        .gte(a.ts, windowStart.toISOString());
      if (error) {
        logger.warn("Activity read failed for table", {
          table: a.table,
          error,
        });
        continue;
      }
      for (const r of (data ?? []) as unknown as Record<string, string>[]) {
        if (r[a.user] && r[a.ts]) rows.push({ userId: r[a.user], ts: r[a.ts] });
      }
    } catch (err) {
      logger.warn("Activity read threw for table", {
        table: a.table,
        err: String(err),
      });
    }
  }
  return rows;
}

// Minimal shape `countOf` actually needs to filter a count-only query:
// thenable (awaited directly) plus the two filter methods callers chain on.
interface CountQuery extends PromiseLike<{
  count: number | null;
  error: unknown;
}> {
  not: (column: string, operator: string, value: unknown) => CountQuery;
  eq: (column: string, value: unknown) => CountQuery;
}

async function countOf(
  db: Db,
  table: string,
  logger: ReturnType<typeof useLogger>,
  apply?: (q: CountQuery) => CountQuery,
): Promise<number> {
  try {
    let q = db
      .from(table)
      .select("id", { count: "exact", head: true }) as unknown as CountQuery;
    if (apply) q = apply(q);
    const { count, error } = await q;
    if (error) {
      logger.warn("Count failed for table", { table, error });
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    logger.warn("Count threw for table", { table, err: String(err) });
    return 0;
  }
}

async function loadAdoptionUserIds(
  db: Db,
  logger: ReturnType<typeof useLogger>,
): Promise<Record<string, string[]>> {
  const featureUserIds: Record<string, string[]> = {};
  await Promise.all(
    ADOPTION_TABLES.map(async (table) => {
      const userCol = table === "interactions" ? "logged_by" : "user_id";
      try {
        const { data, error } = await db.from(table).select(userCol);
        if (error) {
          logger.warn("Adoption read failed for table", { table, error });
          featureUserIds[table] = [];
          return;
        }
        featureUserIds[table] = (
          (data ?? []) as unknown as Record<string, string>[]
        )
          .map((r) => r[userCol])
          .filter(Boolean);
      } catch (err) {
        logger.warn("Adoption read threw for table", {
          table,
          err: String(err),
        });
        featureUserIds[table] = [];
      }
    }),
  );
  return featureUserIds;
}

export default defineEventHandler(async (event): Promise<AdminGrowth> => {
  const logger = useLogger(event, "admin/growth");
  await requireAdmin(event);
  const db = useSupabaseAdmin() as unknown as SupabaseClient;

  const rawDays = Number(getQuery(event).days);
  const days = Math.min(
    Math.max(Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 30, 1),
    90,
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 86400000);
  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  // Activity rows must cover at least a 30d floor regardless of the selected
  // range, so MAU (and the "Active (30d)" funnel stage) are never undercounted
  // when the admin picks a shorter window (e.g. 7d/14d). The daily trend below
  // still scopes to the selected windowStart.
  const activityFloorDays = Math.max(days, 30);
  const activityFloorStart = new Date(
    now.getTime() - activityFloorDays * 86400000,
  );
  const activityRows = await loadActivityRows(db, activityFloorStart, logger);
  const activity = {
    dau: windowActiveCount(activityRows, dayAgo, now),
    wau: windowActiveCount(activityRows, weekAgo, now),
    mau: windowActiveCount(activityRows, monthAgo, now),
    dailyTrend: dailyActiveUsers(activityRows, windowStart, now),
  };

  const [invitesSent, invitesAccepted, accounts, onboarded] = await Promise.all(
    [
      countOf(db, "family_invitations", logger),
      countOf(db, "family_invitations", logger, (q) =>
        q.not("accepted_at", "is", null),
      ),
      countOf(db, "users", logger),
      countOf(db, "users", logger, (q) => q.eq("onboarding_completed", true)),
    ],
  );

  const funnel = funnelWithDropoff([
    { stage: "Invites sent", count: invitesSent },
    { stage: "Accepted", count: invitesAccepted },
    { stage: "Accounts", count: accounts },
    { stage: "Onboarded", count: onboarded },
    { stage: "Active (30d)", count: activity.mau },
  ]);

  const featureUserIds = await loadAdoptionUserIds(db, logger);

  return {
    funnel,
    activity,
    adoption: adoption(featureUserIds, accounts),
    windowDays: days,
  };
});
