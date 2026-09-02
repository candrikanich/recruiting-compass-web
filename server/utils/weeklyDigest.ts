import { SupabaseClient } from "@supabase/supabase-js";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("notifications/weekly-digest");

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const LOOKBACK_DAYS = 7;
const DEADLINE_HORIZON_DAYS = 14;

export interface WeeklyDigestCounts {
  interactions: number;
  events: number;
  metrics: number;
}

export interface UpcomingDeadline {
  label: string;
  deadline_date: string;
}

export interface WeeklyDigestData {
  lines: string[];
  upcomingDeadlines: UpcomingDeadline[];
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** Pure: turn raw activity counts into human-readable recap lines. */
export function formatDigestLines(counts: WeeklyDigestCounts): string[] {
  return [
    `${plural(counts.interactions, "coach interaction")} logged this week`,
    `${plural(counts.events, "event")} attended`,
    `${plural(counts.metrics, "performance metric")} recorded`,
  ];
}

/**
 * Build a user's weekly digest, or `null` when there is nothing worth sending
 * (no activity in the last 7 days and no deadline in the next 14). Fails soft:
 * a query error yields `null` rather than a broken email.
 */
export async function buildWeeklyDigestData(
  userId: string,
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<WeeklyDigestData | null> {
  try {
    const since = new Date(now.getTime() - LOOKBACK_DAYS * MS_PER_DAY);
    const horizon = new Date(
      now.getTime() + DEADLINE_HORIZON_DAYS * MS_PER_DAY,
    );
    const nowIso = now.toISOString();
    const horizonIso = horizon.toISOString();

    const [interactions, events, metrics] = await Promise.all([
      supabase
        .from("interactions")
        .select("id")
        .eq("user_id", userId)
        .gte("occurred_at", since.toISOString()),
      supabase
        .from("events")
        .select("id")
        .eq("user_id", userId)
        .eq("attended", true)
        .gte("start_date", since.toISOString()),
      supabase
        .from("performance_metrics")
        .select("id")
        .eq("user_id", userId)
        .gte("recorded_date", since.toISOString()),
    ]);

    const counts: WeeklyDigestCounts = {
      interactions: interactions.data?.length ?? 0,
      events: events.data?.length ?? 0,
      metrics: metrics.data?.length ?? 0,
    };

    const upcomingDeadlines = await fetchUpcomingDeadlines(
      userId,
      supabase,
      nowIso,
      horizonIso,
    );

    const hasActivity =
      counts.interactions + counts.events + counts.metrics > 0;
    if (!hasActivity && upcomingDeadlines.length === 0) {
      return null;
    }

    return { lines: formatDigestLines(counts), upcomingDeadlines };
  } catch (err) {
    logger.error("Failed to build weekly digest", { userId, err });
    return null;
  }
}

async function fetchUpcomingDeadlines(
  userId: string,
  supabase: SupabaseClient,
  nowIso: string,
  horizonIso: string,
): Promise<UpcomingDeadline[]> {
  const deadlines: UpcomingDeadline[] = [];

  const { data: offers } = await supabase
    .from("offers")
    .select("school_id, deadline_date")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("deadline_date", nowIso)
    .lte("deadline_date", horizonIso);

  if (offers && offers.length > 0) {
    const schoolIds = [...new Set(offers.map((o) => o.school_id))];
    const { data: schools } = await supabase
      .from("schools")
      .select("id, name")
      .in("id", schoolIds);
    const schoolMap = new Map(schools?.map((s) => [s.id, s.name]) ?? []);
    for (const offer of offers) {
      if (!offer.deadline_date) continue;
      deadlines.push({
        label: `Offer from ${schoolMap.get(offer.school_id) ?? "a school"}`,
        deadline_date: offer.deadline_date,
      });
    }
  }

  const { data: events } = await supabase
    .from("events")
    .select("name, start_date")
    .eq("user_id", userId)
    .eq("attended", false)
    .gte("start_date", nowIso)
    .lte("start_date", horizonIso);

  for (const ev of events ?? []) {
    deadlines.push({
      label: ev.name ?? "Event",
      deadline_date: ev.start_date,
    });
  }

  const { data: userDeadlines } = await supabase
    .from("user_deadlines")
    .select("label, deadline_date")
    .eq("user_id", userId)
    .gte("deadline_date", nowIso)
    .lte("deadline_date", horizonIso);

  for (const ud of userDeadlines ?? []) {
    if (!ud.deadline_date) continue;
    deadlines.push({
      label: ud.label,
      deadline_date: ud.deadline_date,
    });
  }

  return deadlines.sort((a, b) =>
    a.deadline_date.localeCompare(b.deadline_date),
  );
}
