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
  // Gymnastics has "events", not positions; they differ by gender (women's vs
  // men's artistic). One combined superset + All-Around serves both — coaches
  // recruit by event specialty. Women's: Vault/Uneven Bars/Balance Beam/Floor;
  // Men's: Floor/Pommel Horse/Still Rings/Vault/Parallel Bars/Horizontal Bar.
  Gymnastics: [
    "All-Around",
    "Vault",
    "Uneven Bars",
    "Balance Beam",
    "Floor Exercise",
    "Pommel Horse",
    "Still Rings",
    "Parallel Bars",
    "Horizontal Bar",
  ],
  // Beach Volleyball is a 2-player game with two roles, distinct from indoor.
  "Beach Volleyball": ["Blocker", "Defender"],
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
    // "Utility"/"Infielder"/"Outfielder" and their abbreviations are deliberately
    // NOT mapped: recruiting output must name a specific position, so coarse
    // catch-alls no longer resolve to a canonical value (they preserve raw on
    // read, and backfill migrates them to the athlete's real positions[0]).
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

/**
 * Sport-scoped map from canonical full name to its short display code. Only
 * sports with an established shorthand are listed; everything else renders its
 * full name. Baseball and Softball share standard scorekeeping abbreviations.
 */
const POSITION_ABBREVIATIONS: Record<string, Record<string, string>> = {
  Baseball: {
    Pitcher: "P",
    Catcher: "C",
    "First Base": "1B",
    "Second Base": "2B",
    "Third Base": "3B",
    Shortstop: "SS",
    "Left Field": "LF",
    "Center Field": "CF",
    "Right Field": "RF",
    "Designated Hitter": "DH",
  },
};
POSITION_ABBREVIATIONS.Softball = POSITION_ABBREVIATIONS.Baseball;

/**
 * Short display code for a position, for coach-facing output (e.g. "3B", "SS").
 * Canonicalizes the input first (so "shortstop"/"SS" both resolve), then maps to
 * the sport's shorthand. Falls back to the canonical full name — or, when the
 * value can't be resolved at all, the trimmed input — so nothing renders blank.
 */
export function abbreviatePosition(
  sport: string | null | undefined,
  value: string | null | undefined,
): string {
  const raw = typeof value === "string" ? value.trim() : "";
  const canonical = normalizePosition(sport, raw) ?? raw;
  if (!sport) return canonical;
  return POSITION_ABBREVIATIONS[sport]?.[canonical] ?? canonical;
}

/**
 * Ordered primary/secondary from an athlete's entered `positions[]`, with the
 * legacy `primary_position` string as a last-resort fallback only.
 * `positions[0]` is primary; the first later entry that differs is secondary.
 */
export function primaryAndSecondary(
  positions: string[] | null | undefined,
  primaryFallback?: string | null,
): { primary: string; secondary: string } {
  const list = Array.isArray(positions)
    ? positions.filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
      )
    : [];
  const primary = (list[0] ?? primaryFallback ?? "").trim();
  const secondary = list.find((p) => p.trim() !== primary)?.trim() ?? "";
  return { primary, secondary };
}

/**
 * Coach-facing short position string from entered `positions[]`: the first two,
 * abbreviated, primary first, joined with "/" (e.g. "3B/SS"). Empty string when
 * nothing is entered and no fallback is given.
 */
export function formatPositionsShort(
  sport: string | null | undefined,
  positions: string[] | null | undefined,
  primaryFallback?: string | null,
): string {
  const { primary, secondary } = primaryAndSecondary(
    positions,
    primaryFallback,
  );
  return [primary, secondary]
    .filter(Boolean)
    .map((p) => abbreviatePosition(sport, p))
    .join("/");
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

/**
 * Whether a stored `primary_position` should be cleared because the athlete
 * switched sports. Sport-agnostic.
 *
 * Guards against the load-time data-wipe bug: the position picker's sport
 * watcher must only reset the position on a genuine USER sport change, never
 * when the form is first populated from saved data. A stored value that isn't
 * one of the newly-selected sport's canonical options (e.g. an iOS/onboarding
 * label like "Infielder" or "Point Guard") would otherwise be silently deleted
 * on every page load, dropping 10% off profile completeness.
 *
 * @param previousSport - The sport value before the change (`undefined` on the
 *   initial population — the watcher's first fire — which must NOT clear)
 * @param newSport - The sport value after the change
 * @param currentPosition - The currently-stored primary position
 * @param newSportPositions - Canonical options for `newSport`
 * @returns True only on a real sport change to an incompatible position
 */
export function shouldClearPositionOnSportChange(
  previousSport: string | undefined,
  newSport: string | undefined,
  currentPosition: string | undefined | null,
  newSportPositions: string[],
): boolean {
  if (previousSport === undefined) return false; // initial load / first set
  if (!newSport || !currentPosition) return false;
  return !newSportPositions.includes(currentPosition);
}

/**
 * Reconcile a sport's canonical position options with the athlete's stored
 * value so a legacy/foreign label (e.g. "Infielder" from iOS) stays selectable
 * in the dropdown instead of rendering as an empty selection. Sport-agnostic.
 *
 * @param sportPositions - Canonical options for the current sport
 * @param currentPosition - The stored primary position
 * @returns Options including `currentPosition` when it isn't already canonical
 */
export function reconcilePositionOptions(
  sportPositions: string[],
  currentPosition: string | undefined | null,
): string[] {
  if (currentPosition && !sportPositions.includes(currentPosition)) {
    return [...sportPositions, currentPosition];
  }
  return sportPositions;
}
