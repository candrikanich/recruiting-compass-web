/**
 * Central variable resolver for coach-outreach templates.
 *
 * Pure, framework-free logic: given the DB variable registry (template_variables)
 * and a context of already-fetched entities, produce the `Record<string,string>`
 * that {{key}} substitution consumes. Replaces the three ad-hoc interpolators that
 * previously each built this map by hand from component props.
 *
 * source_path convention (see docs/coach-outreach/migration-build-plan.md):
 *   column:<table>.<col>  -> ctx.tables[table][col]
 *   pref:player.<key>     -> ctx.prefs[key]   (user_preferences category='player' jsonb)
 *   computed              -> a formatter in COMPUTED (below) or ctx.derived[key]
 *   authored              -> ctx.authored[key] (athlete-entered at compose)
 *   system                -> generated here (todayDate, ...)
 *
 * A variable that resolves to null/empty is OMITTED from the output, so the
 * rendered template keeps its literal {{key}} and findUnresolved() can flag it as
 * a send-blocking gap.
 */

export type Row = Record<string, unknown>;

export interface MetricRow {
  metric_type?: string | null;
  display_value?: string | null;
  value?: number | null;
  unit?: string | null;
  source?: string | null;
  recorded_date?: string | null;
  is_primary?: boolean | null;
  verified?: boolean | null;
}

export interface ResolverContext {
  tables?: { users?: Row; schools?: Row; coaches?: Row; events?: Row };
  prefs?: Record<string, unknown>;
  /** Location prefs (user_preferences category "location"): home city/state/zip. */
  locationPrefs?: Record<string, unknown>;
  metrics?: MetricRow[];
  authored?: Record<string, string>;
  /** Fetch-layer pre-resolved values for computed vars that need DB joins
   *  (sport, position, hsCoachName, profileLink, eventSchedule, nextEvent*, ...). */
  derived?: Record<string, string>;
  /** Injectable clock for deterministic todayDate/seasonLabel in tests. */
  now?: Date;
}

export interface RegistryVar {
  key: string;
  source_type: "column" | "computed" | "authored" | "system";
  source_path?: string | null;
  category?: string | null;
}

type TableName = "users" | "schools" | "coaches" | "events";
const KNOWN_TABLES: readonly TableName[] = [
  "users",
  "schools",
  "coaches",
  "events",
];

/** Resolve a single source_path against the context. Returns raw value or null. */
export function resolveSourcePath(
  sourcePath: string | null | undefined,
  ctx: ResolverContext,
): unknown {
  if (!sourcePath) return null;

  if (sourcePath.startsWith("column:")) {
    const [table, col] = sourcePath.slice("column:".length).split(".");
    if (!KNOWN_TABLES.includes(table as TableName) || !col) return null;
    const row = ctx.tables?.[table as TableName];
    const v = row?.[col];
    return v ?? null;
  }

  if (sourcePath.startsWith("pref:player.")) {
    const key = sourcePath.slice("pref:player.".length);
    const v = ctx.prefs?.[key];
    return v ?? null;
  }

  if (sourcePath.startsWith("pref:location.")) {
    const key = sourcePath.slice("pref:location.".length);
    const v = ctx.locationPrefs?.[key];
    return v ?? null;
  }

  return null;
}

// --- metric rendering (product rules #3 provenance, #4 cap-at-4) -------------

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const humanizeMetricLabel = (metricType?: string | null): string =>
  (metricType ?? "").replace(/_/g, " ").trim();

const metricDisplay = (m: MetricRow): string => {
  if (m.display_value && m.display_value.trim()) return m.display_value.trim();
  if (m.value != null) return `${m.value}${m.unit ? ` ${m.unit}` : ""}`;
  return "";
};

const monthYear = (isoDate?: string | null): string | null => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const monthDay = (isoDate?: string | null): string | null => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

/** Minimal event shape the schedule renderer needs (a subset of the events row). */
export interface EventLite {
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  url?: string | null;
}

const eventLocation = (e: EventLite): string | null => {
  const cityState = [str(e.city), str(e.state)].filter(Boolean).join(", ");
  return cityState || str(e.location);
};

/** Upcoming events (end/start still today or later), soonest first, capped. */
export function selectUpcomingEvents(
  events: EventLite[],
  now: Date,
  cap = 5,
): EventLite[] {
  const today = now.toISOString().slice(0, 10);
  return [...events]
    .filter((e) => {
      const end = e.end_date || e.start_date;
      return end != null && end.slice(0, 10) >= today;
    })
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""))
    .slice(0, cap);
}

/** Multi-row `{{eventSchedule}}` block. One "- Mon D — name, place" row per event. */
export function renderEventSchedule(
  events: EventLite[],
  now = new Date(),
  cap = 5,
): string | null {
  const rows = selectUpcomingEvents(events, now, cap)
    .map((e) => {
      const date = monthDay(e.start_date);
      const name = str(e.name);
      if (!date && !name) return null;
      const loc = eventLocation(e);
      const head = [date, name].filter(Boolean).join(" — ");
      return `- ${head}${loc ? `, ${loc}` : ""}`;
    })
    .filter((row): row is string => row !== null);
  return rows.length ? rows.join("\n") : null;
}

/** The soonest upcoming event — backs `{{nextEventName}}` / `{{nextEventDates}}`. */
export function nextEvent(
  events: EventLite[],
  now = new Date(),
): { name: string | null; dates: string | null } | null {
  const next = selectUpcomingEvents(events, now, 1)[0];
  if (!next) return null;
  const start = monthDay(next.start_date);
  const end = monthDay(next.end_date);
  const dates =
    start && end && end !== start ? `${start}–${end}` : (start ?? null);
  return { name: str(next.name), dates };
}

const rankMetrics = (metrics: MetricRow[]): MetricRow[] =>
  [...metrics].sort((a, b) => {
    if (!!b.is_primary !== !!a.is_primary) return b.is_primary ? 1 : -1;
    if (!!b.verified !== !!a.verified) return b.verified ? 1 : -1;
    return (b.recorded_date ?? "").localeCompare(a.recorded_date ?? "");
  });

/** Rendered metrics block: primary first, capped at `cap` (default 4). */
export function renderMetrics(
  metrics: MetricRow[],
  opts: { cap?: number } = {},
): string {
  const cap = opts.cap ?? 4;
  return rankMetrics(metrics)
    .slice(0, cap)
    .map((m) => {
      const label = humanizeMetricLabel(m.metric_type);
      const my = monthYear(m.recorded_date);
      const provenance = [m.source, my].filter(Boolean).join(", ");
      const tail = provenance ? ` (${provenance})` : "";
      return `- ${label ? `${label}: ` : ""}${metricDisplay(m)}${tail}`;
    })
    .join("\n");
}

/** The single best number, leading the subject line. Null when nothing is primary. */
export function carryingTool(metrics: MetricRow[]): string | null {
  const primary = metrics.find((m) => m.is_primary);
  if (!primary) return null;
  const label = humanizeMetricLabel(primary.metric_type);
  const value = metricDisplay(primary);
  return [value, label].filter(Boolean).join(" ") || null;
}

// --- computed formatters (pure; DB-join computeds come via ctx.derived) ------

const str = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const COMPUTED: Record<string, (ctx: ResolverContext) => string | null> = {
  playerFirstName: (c) => {
    const full = str(c.tables?.users?.full_name);
    return full ? full.split(/\s+/)[0] : null;
  },
  height: (c) => {
    const inches = c.tables?.users?.height_inches;
    if (inches == null || Number.isNaN(Number(inches))) return null;
    const n = Number(inches);
    return `${Math.floor(n / 12)}'${n % 12}"`;
  },
  weight: (c) => {
    const w = c.tables?.users?.weight_lbs;
    return w == null ? null : `${w} lbs`;
  },
  coachSalutation: (c) => {
    const last = str(c.tables?.coaches?.last_name);
    return last ? `Coach ${last}` : null;
  },
  schoolShortName: (c) => {
    const name = str(c.tables?.schools?.name);
    if (!name) return null;
    const stripped = name.replace(/\s+(University|College)$/i, "").trim();
    return stripped || name.split(/\s+/)[0];
  },
  testLabel: (c) => {
    if (c.tables?.users?.act_score != null) return "ACT";
    if (c.tables?.users?.sat_score != null) return "SAT";
    return null;
  },
  testScore: (c) =>
    str(c.tables?.users?.act_score) ?? str(c.tables?.users?.sat_score),
  metricsAsOf: (c) => {
    const dates = (c.metrics ?? [])
      .map((m) => m.recorded_date)
      .filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return monthYear(dates.sort().at(-1)!);
  },
  metrics: (c) => {
    const block = renderMetrics(c.metrics ?? []);
    return block || null;
  },
  carryingTool: (c) => carryingTool(c.metrics ?? []),
  seasonLabel: (c) => {
    const m = (c.now ?? new Date()).getUTCMonth();
    return m <= 1 || m === 11
      ? "winter"
      : m <= 4
        ? "spring"
        : m <= 7
          ? "summer"
          : "fall";
  },
  todayDate: (c) =>
    (c.now ?? new Date()).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
};

/** Build the {{key}} -> value map. Keys resolving to null are omitted. */
export function resolveVariables(
  registry: RegistryVar[],
  ctx: ResolverContext,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of registry) {
    let raw: unknown = null;
    switch (v.source_type) {
      case "column":
        raw = resolveSourcePath(v.source_path, ctx);
        break;
      case "authored":
        raw = ctx.authored?.[v.key] ?? null;
        break;
      case "system":
      case "computed":
        raw = COMPUTED[v.key]
          ? COMPUTED[v.key](ctx)
          : (ctx.derived?.[v.key] ?? null);
        break;
    }
    const s = str(raw);
    if (s !== null) out[v.key] = s;
  }
  return out;
}

/** Replace every {{key}} with its value. Missing keys are left intact. */
export function renderTemplate(
  body: string,
  values: Record<string, string>,
): string {
  let rendered = body;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return rendered;
}

/** Variables still unresolved in rendered text — the send-blocking check. */
export function findUnresolved(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
}
