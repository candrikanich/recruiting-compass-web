/**
 * Canonical athlete positions — the single source of truth.
 *
 * One full-name, granular vocabulary per sport, used by onboarding, the
 * player-details edit form, and (via handoff) iOS. Stored `primary_position`
 * and `positions[]` values are normalized to these labels so completeness,
 * dropdowns, and recruiting output all agree.
 *
 * Normalization is SPORT-SCOPED because labels collide across sports
 * (e.g. "C" = Catcher in baseball but Center in basketball; "P" = Pitcher vs
 * Punter). Never resolve a position without its sport.
 */

/** Canonical positions per sport (full names, granular). */
export const SPORT_POSITIONS: Record<string, readonly string[]> = {
  Baseball: [
    "Pitcher",
    "Catcher",
    "First Base",
    "Second Base",
    "Third Base",
    "Shortstop",
    "Left Field",
    "Center Field",
    "Right Field",
    "Designated Hitter",
    "Utility",
  ],
  Softball: [
    "Pitcher",
    "Catcher",
    "First Base",
    "Second Base",
    "Third Base",
    "Shortstop",
    "Left Field",
    "Center Field",
    "Right Field",
    "Designated Hitter",
    "Utility",
  ],
  Basketball: [
    "Point Guard",
    "Shooting Guard",
    "Small Forward",
    "Power Forward",
    "Center",
  ],
  Football: [
    "Quarterback",
    "Running Back",
    "Wide Receiver",
    "Tight End",
    "Offensive Line",
    "Defensive Line",
    "Linebacker",
    "Defensive Back",
    "Kicker",
    "Punter",
  ],
  Soccer: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  Volleyball: [
    "Outside Hitter",
    "Middle Blocker",
    "Setter",
    "Libero",
    "Opposite Hitter",
    "Defensive Specialist",
  ],
  "Track & Field": [
    "Sprinter",
    "Distance Runner",
    "Jumper",
    "Thrower",
    "Hurdler",
  ],
  Swimming: [
    "Freestyle",
    "Backstroke",
    "Breaststroke",
    "Butterfly",
    "Individual Medley",
    "Diver",
  ],
  "Cross Country": ["Runner"],
  Tennis: ["Singles", "Doubles"],
  Golf: ["Golfer"],
  Lacrosse: ["Attackman", "Midfielder", "Defenseman", "Goalie"],
  "Field Hockey": ["Forward", "Midfielder", "Defender", "Goalkeeper"],
  "Ice Hockey": ["Forward", "Defenseman", "Goalie"],
  Wrestling: ["Wrestler"],
  Rowing: ["Rower"],
  "Water Polo": ["Field Player", "Goalkeeper"],
} as const;

/**
 * Sport-scoped aliases mapping every known legacy value (abbreviations, coarse
 * buckets, common variants) to its canonical label. Keys are matched
 * case-insensitively. Coarse/ambiguous baseball buckets (Infielder/Outfielder)
 * resolve to "Utility" — a real, valid position — per the migration decision.
 */
const SPORT_ALIASES: Record<string, Record<string, string>> = {
  Baseball: {
    p: "Pitcher",
    c: "Catcher",
    "1b": "First Base",
    "1st base": "First Base",
    "2b": "Second Base",
    "2nd base": "Second Base",
    "3b": "Third Base",
    "3rd base": "Third Base",
    ss: "Shortstop",
    "short stop": "Shortstop",
    lf: "Left Field",
    leftfield: "Left Field",
    cf: "Center Field",
    centerfield: "Center Field",
    rf: "Right Field",
    rightfield: "Right Field",
    dh: "Designated Hitter",
    util: "Utility",
    infielder: "Utility",
    infield: "Utility",
    if: "Utility",
    outfielder: "Utility",
    outfield: "Utility",
    of: "Utility",
  },
  Basketball: {
    pg: "Point Guard",
    sg: "Shooting Guard",
    sf: "Small Forward",
    pf: "Power Forward",
    c: "Center",
  },
  Football: {
    qb: "Quarterback",
    rb: "Running Back",
    wr: "Wide Receiver",
    te: "Tight End",
    ol: "Offensive Line",
    dl: "Defensive Line",
    lb: "Linebacker",
    db: "Defensive Back",
    k: "Kicker",
    p: "Punter",
  },
  Soccer: {
    gk: "Goalkeeper",
    def: "Defender",
    mid: "Midfielder",
    fwd: "Forward",
  },
};
// Softball shares Baseball's aliases.
SPORT_ALIASES.Softball = SPORT_ALIASES.Baseball;

/** Canonical position list for a sport (empty array for unknown sports). */
export function getCanonicalPositions(
  sport: string | null | undefined,
): string[] {
  if (!sport) return [];
  return [...(SPORT_POSITIONS[sport] ?? [])];
}

/**
 * Normalize a single position value to its canonical label for the given sport.
 * Returns the canonical string, or `null` when the value can't be resolved
 * (unknown label / unknown sport) so callers can decide whether to preserve it.
 */
export function normalizePosition(
  sport: string | null | undefined,
  value: string | null | undefined,
): string | null {
  if (!sport || !value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const canonical = SPORT_POSITIONS[sport];
  if (!canonical) return null;

  // Already canonical (case-insensitive).
  const lower = trimmed.toLowerCase();
  const direct = canonical.find((p) => p.toLowerCase() === lower);
  if (direct) return direct;

  // Known alias.
  const alias = SPORT_ALIASES[sport]?.[lower];
  return alias ?? null;
}

/**
 * Normalize an array of position values for a sport: canonicalize what we can,
 * PRESERVE anything unresolved (unknown label, missing/unknown sport) rather
 * than dropping it — never lose an athlete's data on a read. De-duplicates and
 * preserves order; only empty/blank entries are removed.
 */
export function normalizePositions(
  sport: string | null | undefined,
  values: string[] | null | undefined,
): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    const resolved = normalizePosition(sport, v) ?? v.trim();
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** Whether a value is already a canonical position for the sport. */
export function isCanonicalPosition(
  sport: string | null | undefined,
  value: string | null | undefined,
): boolean {
  if (!sport || !value) return false;
  const canonical = SPORT_POSITIONS[sport];
  if (!canonical) return false;
  return canonical.some((p) => p.toLowerCase() === value.trim().toLowerCase());
}
