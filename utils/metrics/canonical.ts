/**
 * Canonical performance-metric registry — the single source of truth on web.
 *
 * Mirrors iOS `MetricRegistry` / `MetricDef` / `Format` byte-identically (same
 * keys, labels, units, formats, orderings, lowerIsBetter). Keys are stored
 * verbatim in `performance_metrics.metric_type`. Sport keys match
 * `SPORT_POSITIONS` in `utils/positions/canonical.ts`.
 *
 * Sibling of the positions registry: a `Record<string, ...>` map plus pure
 * helper functions. Populated for all 17 sports.
 */

export const OTHER_KEY = "other";

/** How a raw metric value renders (number only — callers append the unit). */
export type MetricFormat =
  | { kind: "decimal"; digits: number; dropLeadingZero: boolean }
  | { kind: "integer" }
  | { kind: "percent"; digits: number }
  | { kind: "duration" };

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  format: MetricFormat;
  lowerIsBetter: boolean;
}

// Format constructors — keep call sites terse and consistent.
const dec = (digits: number, dropLeadingZero = false): MetricFormat => ({
  kind: "decimal",
  digits,
  dropLeadingZero,
});
const int: MetricFormat = { kind: "integer" };
const pct = (digits: number): MetricFormat => ({ kind: "percent", digits });
const dur: MetricFormat = { kind: "duration" };

const def = (
  key: string,
  label: string,
  unit: string,
  format: MetricFormat,
  lowerIsBetter = false,
): MetricDef => ({ key, label, unit, format, lowerIsBetter });

/**
 * Render a raw value to its display string (number only — callers append the
 * unit). Byte-identical to iOS `Format.apply(_:)`. `percent` renders the number
 * sign-less (the "%" is the unit); `duration` renders MM:SS.hh from seconds.
 */
export function applyFormat(format: MetricFormat, value: number): string {
  switch (format.kind) {
    case "decimal": {
      const s = value.toFixed(format.digits);
      if (format.dropLeadingZero && s.startsWith("0.")) return s.slice(1);
      return s;
    }
    case "integer":
      return String(Math.round(value));
    case "percent":
      return value.toFixed(format.digits);
    case "duration": {
      const totalHundredths = Math.round(value * 100);
      const minutes = Math.floor(totalHundredths / 6000);
      const seconds = Math.floor((totalHundredths % 6000) / 100);
      const hundredths = totalHundredths % 100;
      const ss = String(seconds).padStart(2, "0");
      const hh = String(hundredths).padStart(2, "0");
      return `${minutes}:${ss}.${hh}`;
    }
  }
}

// MARK: Definitions (grouped by sport, mirroring iOS allDefs)

const baseballDefs: MetricDef[] = [
  def("velocity", "Fastball Velocity", "mph", dec(1)),
  def("exit_velo", "Exit Velocity", "mph", dec(1)),
  def("batting_avg", "Batting Average", "", dec(3, true)),
  def("sixty_time", "60-Yard Dash", "sec", dec(2), true),
  def("pop_time", "Pop Time", "sec", dec(2), true),
  def("era", "ERA", "", dec(2), true),
  def("on_base_pct", "On-Base Percentage", "", dec(3, true)),
  def("slugging_pct", "Slugging Percentage", "", dec(3, true)),
  def("whip", "WHIP", "", dec(2), true),
  def("strikeouts", "Strikeouts", "count", int),
  def("fielding_pct", "Fielding Percentage", "", dec(3, true)),
];

const basketballDefs: MetricDef[] = [
  def("points_per_game", "Points Per Game", "", dec(1)),
  def("rebounds_per_game", "Rebounds Per Game", "", dec(1)),
  def("assists_per_game", "Assists Per Game", "", dec(1)),
  def("field_goal_pct", "Field Goal %", "%", pct(1)),
  def("three_point_pct", "3-Point %", "%", pct(1)),
  def("free_throw_pct", "Free Throw %", "%", pct(1)),
  def("steals_per_game", "Steals Per Game", "", dec(1)),
  def("blocks_per_game", "Blocks Per Game", "", dec(1)),
];

const footballDefs: MetricDef[] = [
  def("forty_time", "40-Yard Dash", "sec", dec(2), true),
  def("bench_press", "Bench Press", "reps", int),
  def("broad_jump", "Broad Jump", "in", int),
  def("shuttle", "Shuttle Run", "sec", dec(2), true),
  def("three_cone", "3-Cone Drill", "sec", dec(2), true),
  def("squat", "Squat", "lbs", int),
  def("passing_yards", "Passing Yards", "yds", int),
  def("rushing_yards", "Rushing Yards", "yds", int),
  def("receiving_yards", "Receiving Yards", "yds", int),
  def("tackles", "Tackles", "count", int),
];

// Soccer / Lacrosse / Ice Hockey / Field Hockey / Water Polo — non-shared keys.
const soccerLacrosseHockeyDefs: MetricDef[] = [
  def("clean_sheets", "Clean Sheets", "count", int),
  def("minutes_played", "Minutes Played", "count", int),
  def("ground_balls", "Ground Balls", "count", int),
  def("points", "Points", "count", int),
  def("save_pct", "Save %", "", dec(3, true)),
  def("goals_against_avg", "Goals Against Avg", "", dec(2), true),
  def("steals", "Steals", "count", int),
];

const volleyballDefs: MetricDef[] = [
  def("kills", "Kills", "count", int),
  def("blocks", "Blocks", "count", int),
  def("digs", "Digs", "count", int),
  def("aces", "Aces", "count", int),
  def("hitting_pct", "Hitting Percentage", "", dec(3, true)),
];

const trackAndFieldDefs: MetricDef[] = [
  def("sprint_time", "Sprint Time", "sec", dec(2), true),
  def("distance_time", "Distance Time", "", dur, true),
  def("relay_split", "Relay Split", "sec", dec(2), true),
  def("long_jump", "Long Jump", "m", dec(2)),
  def("high_jump", "High Jump", "m", dec(2)),
  def("shot_put", "Shot Put", "m", dec(2)),
  def("discus", "Discus", "m", dec(2)),
];

const crossCountryDefs: MetricDef[] = [
  def("race_time", "Race Time", "", dur, true),
  def("pace_per_mile", "Pace Per Mile", "", dur, true),
];

const swimmingDefs: MetricDef[] = [
  def("event_time", "Event Time", "", dur, true),
  def("free_50", "50 Free", "sec", dec(2), true),
  def("free_100", "100 Free", "", dur, true),
];

const golfDefs: MetricDef[] = [
  def("scoring_average", "Scoring Average", "strokes", dec(1), true),
  def("handicap", "Handicap", "", dec(1), true),
];

// "singles_record" excluded — text field, not a numeric metric.
const tennisDefs: MetricDef[] = [
  def("utr_rating", "UTR Rating", "", dec(2)),
  def("ranking", "Ranking", "", int, true),
];

// "record" excluded — text field, not a numeric metric.
const wrestlingDefs: MetricDef[] = [
  def("pins", "Pins", "count", int),
  def("takedowns", "Takedowns", "count", int),
  def("weight_class", "Weight Class", "lbs", int),
];

const rowingDefs: MetricDef[] = [
  def("erg_2k", "2K Erg", "", dur, true),
  def("erg_split", "Erg Split", "", dur, true),
];

// Shared across sports (goals/assists/saves/vertical_jump — one def each).
const sharedDefs: MetricDef[] = [
  def("goals", "Goals", "count", int),
  def("assists", "Assists", "count", int),
  def("saves", "Saves", "count", int),
  def("vertical_jump", "Vertical Jump", "in", dec(1)),
];

const allDefs: MetricDef[] = [
  ...baseballDefs,
  ...basketballDefs,
  ...footballDefs,
  ...soccerLacrosseHockeyDefs,
  ...volleyballDefs,
  ...trackAndFieldDefs,
  ...crossCountryDefs,
  ...swimmingDefs,
  ...golfDefs,
  ...tennisDefs,
  ...wrestlingDefs,
  ...rowingDefs,
  ...sharedDefs,
  def(OTHER_KEY, "Other Metric", "", dec(2)),
];

/** All metric definitions, keyed by metric_type. A duplicate key throws. */
export const METRIC_DEFS: Record<string, MetricDef> = allDefs.reduce(
  (acc, d) => {
    if (acc[d.key]) throw new Error(`Duplicate metric def key: ${d.key}`);
    acc[d.key] = d;
    return acc;
  },
  {} as Record<string, MetricDef>,
);

// MARK: Sport orderings (NOT including "other"; metricTypesForSport appends it)

const baseball = [
  "velocity",
  "exit_velo",
  "batting_avg",
  "sixty_time",
  "pop_time",
  "era",
  "on_base_pct",
  "slugging_pct",
  "whip",
  "strikeouts",
  "fielding_pct",
] as const;

/** Ordered metric keys per sport. Sport keys match SPORT_POSITIONS. */
export const SPORT_METRICS: Record<string, readonly string[]> = {
  // Baseball/Softball intentionally share one ordering (identical vocabularies).
  Baseball: baseball,
  Softball: baseball,
  Basketball: [
    "points_per_game",
    "rebounds_per_game",
    "assists_per_game",
    "field_goal_pct",
    "three_point_pct",
    "free_throw_pct",
    "steals_per_game",
    "blocks_per_game",
    "vertical_jump",
  ],
  Football: [
    "forty_time",
    "vertical_jump",
    "bench_press",
    "broad_jump",
    "shuttle",
    "three_cone",
    "squat",
    "passing_yards",
    "rushing_yards",
    "receiving_yards",
    "tackles",
  ],
  Soccer: ["goals", "assists", "saves", "clean_sheets", "minutes_played"],
  Volleyball: ["kills", "assists", "blocks", "digs", "aces", "hitting_pct"],
  "Track & Field": [
    "sprint_time",
    "distance_time",
    "relay_split",
    "long_jump",
    "high_jump",
    "shot_put",
    "discus",
  ],
  "Cross Country": ["race_time", "pace_per_mile"],
  Swimming: ["event_time", "free_50", "free_100"],
  Golf: ["scoring_average", "handicap"],
  Tennis: ["utr_rating", "ranking"],
  Wrestling: ["pins", "takedowns", "weight_class"],
  Lacrosse: ["goals", "assists", "ground_balls", "saves"],
  "Ice Hockey": ["points", "goals", "assists", "save_pct", "goals_against_avg"],
  "Field Hockey": ["goals", "assists", "saves"],
  Rowing: ["erg_2k", "erg_split"],
  "Water Polo": ["goals", "assists", "saves", "steals"],
};

/** Fallback order for nil/unknown sports: all legacy baseball keys. */
const defaultOrder = baseball;

/** The def for a known key, or undefined when the key is unregistered. */
export function getKnownMetricDef(key: string | null | undefined): MetricDef | undefined {
  if (!key) return undefined;
  return METRIC_DEFS[key];
}

/**
 * The def for a key, always non-null: unknown keys synthesize a fallback
 * (humanized label, no unit, 2-decimal). Mirrors iOS `MetricRegistry.def(for:)`.
 */
export function getMetricDef(key: string | null | undefined): MetricDef {
  const known = getKnownMetricDef(key);
  if (known) return known;
  const label = (key ?? "").replace(/_/g, " ").trim();
  return def(key ?? "", label, "", dec(2));
}

/**
 * Ordered metric keys offered for a sport, with "other" appended. Nil/unknown
 * sport falls back to the baseball order. Mirrors iOS `types(forSport:)`.
 */
export function metricTypesForSport(sport: string | null | undefined): string[] {
  const base = (sport && SPORT_METRICS[sport]) || defaultOrder;
  return [...base, OTHER_KEY];
}
