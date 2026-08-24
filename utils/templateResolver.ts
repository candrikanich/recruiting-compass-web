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

import { formatMetricValue } from "./metricFormat";
import { getKnownMetricDef } from "./metrics/canonical";

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
  /** When true, an unresolved value blocks send; when false it is stripped by renderClean. */
  is_required_default?: boolean | null;
  /** Human label (drives the missing-info step titles). */
  label?: string | null;
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

const humanizeMetricLabel = (metricType?: string | null): string => {
  const def = getKnownMetricDef(metricType);
  if (def) return def.label;
  return (metricType ?? "").replace(/_/g, " ").trim();
};

const metricDisplay = (m: MetricRow): string => {
  if (m.display_value && m.display_value.trim()) return m.display_value.trim();
  if (m.value != null) {
    return `${formatMetricValue(m.metric_type, m.value)}${m.unit ? ` ${m.unit}` : ""}`;
  }
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

/** Collapse to ONE row per metric_type: the most recent by recorded_date (compared as
 *  ISO/yyyy-mm-dd strings, lexicographically), ties broken to verified, then is_primary,
 *  then original input order (stable). Mirrors iOS `dedupeMostRecentPerType`. */
export const dedupeMostRecentPerType = (metrics: MetricRow[]): MetricRow[] => {
  const best = new Map<string, { offset: number; row: MetricRow }>();
  metrics.forEach((m, idx) => {
    const key = m.metric_type ?? "";
    const existing = best.get(key);
    if (!existing) {
      best.set(key, { offset: idx, row: m });
      return;
    }
    const e = existing.row;
    const win =
      (m.recorded_date ?? "") !== (e.recorded_date ?? "")
        ? (m.recorded_date ?? "") > (e.recorded_date ?? "")
        : !!m.verified !== !!e.verified
          ? !!m.verified
          : !!m.is_primary !== !!e.is_primary
            ? !!m.is_primary
            : false;
    if (win) best.set(key, { offset: idx, row: m });
  });
  return [...best.values()]
    .sort((a, b) => a.offset - b.offset)
    .map((entry) => entry.row);
};

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
  return rankMetrics(dedupeMostRecentPerType(metrics))
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

/** US 10-digit phone → "(216) 534-8996" (leading country-code 1 tolerated); anything
 *  else returned trimmed and unchanged. Mirrors iOS TemplateComputed.usPhone. */
export function formatUsPhone(raw: string | null | undefined): string | null {
  const t = str(raw);
  if (t === null) return null;
  const digits = t.replace(/\D/g, "");
  let core: string;
  if (digits.length === 11 && digits.startsWith("1")) core = digits.slice(1);
  else if (digits.length === 10) core = digits;
  else return t;
  return `(${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6)}`;
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
    const inches = c.prefs?.height_inches;
    if (inches == null || Number.isNaN(Number(inches))) return null;
    const n = Number(inches);
    return `${Math.floor(n / 12)}'${n % 12}"`;
  },
  weight: (c) => {
    const w = c.prefs?.weight_lbs;
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
    if (c.prefs?.act_score != null) return "ACT";
    if (c.prefs?.sat_score != null) return "SAT";
    return null;
  },
  testScore: (c) => str(c.prefs?.act_score) ?? str(c.prefs?.sat_score),
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
  // Optional completion sentence. Renders only when the school's recruiting
  // questionnaire is marked complete; otherwise resolves to "" (see
  // OPTIONAL_EMPTY) so the surrounding line collapses instead of leaving a
  // send-blocking {{questionnaireNote}} literal. Trailing space keeps the
  // following sentence spaced when present.
  questionnaireNote: (c) =>
    c.tables?.schools?.questionnaire_completed === true
      ? "I've completed your recruiting questionnaire. "
      : "",
};

// Computed keys whose empty result must be written as "" rather than omitted.
// For these, an absent value collapses the template line (no unresolved flag),
// which is the opposite of the default null-omit behavior used everywhere else.
const OPTIONAL_EMPTY = new Set(["questionnaireNote"]);

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
    // Optional keys keep their exact computed string (spacing included) and
    // fall back to "" instead of being omitted, so the template line collapses
    // cleanly rather than leaving a send-blocking literal.
    if (OPTIONAL_EMPTY.has(v.key)) {
      out[v.key] = raw == null ? "" : String(raw);
      continue;
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

const LINE_SEP = /[ \t—\-|,·•]/;

/** True when — after removing a leading "Label:" and all separators/space — nothing
 *  meaningful remains, and no other {{token}} sits on the line. */
function isLabelOnly(line: string): boolean {
  if (line.includes("{{")) return false;
  const probe = line.replace(/^\s*[A-Za-z][A-Za-z ]*:/, "");
  return [...probe].every((ch) => LINE_SEP.test(ch));
}

/** Collapse runs of spaces and strip dangling leading/trailing separators. */
function tidyLine(line: string): string {
  return line
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t—\-|,·•]+/, "")
    .replace(/[ \t—\-|,·•]+$/, "");
}

/** Regex for an optional `[[gateKey|visible text]]` span. Gate is an identifier
 *  ([A-Za-z]\w*); text is anything (incl. newlines) up to the first `]]`. */
const OPTIONAL_SEGMENT = /\[\[([A-Za-z]\w*)\|([\s\S]*?)\]\]/g;

/** Resolve `[[gateKey|text]]` spans: keep the inner text (its own {{tokens}} intact for
 *  later substitution) when `values[gateKey]` is present and non-empty after trim; drop
 *  the whole span otherwise. The gate key is never printed. Runs BEFORE token
 *  substitution. Mirrors iOS `TemplateResolver.applyOptionalSegments`. */
export function applyOptionalSegments(
  body: string,
  values: Record<string, string>,
): string {
  return body.replace(OPTIONAL_SEGMENT, (_match, gate, text) =>
    values[gate]?.toString().trim() ? text : "",
  );
}

/** Render, then gracefully handle OPTIONAL unresolved tokens: strip the token, and if its
 *  line collapses to just a label + separators, drop the whole line. REQUIRED unresolved
 *  tokens are left intact so they still show in preview and gate the send.
 *  Mirrors iOS `TemplateResolver.renderClean` — keep the two byte-identical. */
export function renderClean(
  body: string,
  values: Record<string, string>,
  requiredKeys: Set<string>,
): string {
  const gated = applyOptionalSegments(body, values);
  const rendered = renderTemplate(gated, values);
  const kept: string[] = [];
  for (const line of rendered.split("\n")) {
    const optional = findUnresolved(line).filter((k) => !requiredKeys.has(k));
    if (optional.length === 0) {
      kept.push(line);
      continue;
    }
    let cleaned = line;
    for (const key of optional) {
      cleaned = cleaned.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), "");
    }
    if (isLabelOnly(cleaned)) continue;
    kept.push(tidyLine(cleaned));
  }
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
