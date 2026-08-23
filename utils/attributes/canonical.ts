/**
 * Canonical athlete-attribute registry — the single source of truth on web.
 *
 * Per-sport handedness / laterality attributes (bats, throws, shooting hand,
 * dominant foot, …) stored as flat keys in `user_preferences.data` (category
 * `player`). Mirrors iOS `AthleteAttributes` byte-identically: same keys, option
 * tokens, position-gate label strings, and which sports expose which attribute.
 *
 * Sibling of the positions/metrics registries: a `Record<string, ...>` map keyed
 * by the same sport labels as `SPORT_POSITIONS`, plus a pure `attributesForSport`
 * helper returning `[]` for a nil/unknown sport (no baseball fallback).
 */

export interface AttributeDef {
  /** Flat key stored in `user_preferences.data`. */
  key: string;
  label: string;
  /** Persisted option tokens (order = display order). */
  options: readonly string[];
  /** Token → display label. */
  optionLabels: Record<string, string>;
  /**
   * When set, the attribute renders only if the athlete's primary position is
   * in this list. Values are canonical position LABELS from `SPORT_POSITIONS`.
   */
  positions?: readonly string[];
}

const attr = (
  key: string,
  label: string,
  optionLabels: Record<string, string>,
  positions?: readonly string[],
): AttributeDef => ({
  key,
  label,
  options: Object.keys(optionLabels),
  optionLabels,
  ...(positions ? { positions } : {}),
});

// --- Reusable attribute defs (Baseball/Softball share bats + throws) ---
const bats = attr("bats", "Bats", { L: "Left", R: "Right", S: "Switch" });
const throws = attr("throws", "Throws", { L: "Left", R: "Right" });

/** Attribute definitions per sport. Sport keys match `SPORT_POSITIONS`. */
export const ATTRIBUTES_BY_SPORT: Record<string, readonly AttributeDef[]> = {
  Baseball: [bats, throws],
  Softball: [bats, throws],
  Basketball: [
    attr("shooting_hand", "Shooting Hand", { L: "Left", R: "Right" }),
  ],
  Soccer: [
    attr("dominant_foot", "Dominant Foot", {
      L: "Left",
      R: "Right",
      Both: "Both",
    }),
  ],
  Volleyball: [attr("hitting_hand", "Hitting Arm", { L: "Left", R: "Right" })],
  Tennis: [
    attr("racket_hand", "Plays", { L: "Left-handed", R: "Right-handed" }),
    attr("backhand_style", "Backhand", {
      one: "One-handed",
      two: "Two-handed",
    }),
  ],
  Golf: [
    attr("golf_handedness", "Plays", { L: "Left-handed", R: "Right-handed" }),
  ],
  Lacrosse: [attr("dominant_hand", "Dominant Hand", { L: "Left", R: "Right" })],
  "Ice Hockey": [
    attr("shoots", "Shoots", { L: "Left", R: "Right" }),
    attr("catches", "Catches (Goalie)", { L: "Left", R: "Right" }, ["Goalie"]),
  ],
  "Water Polo": [
    attr("wp_dominant_hand", "Dominant Hand", { L: "Left", R: "Right" }),
  ],
  Rowing: [
    attr("rowing_side", "Rigging Side", {
      port: "Port",
      starboard: "Starboard",
      both: "Both",
      cox: "Coxswain",
    }),
    attr("rowing_discipline", "Discipline", {
      sweep: "Sweep",
      scull: "Sculling",
      both: "Both",
    }),
  ],
  Football: [
    attr("throwing_hand", "Throwing Hand", { L: "Left", R: "Right" }, [
      "Quarterback",
    ]),
    attr("kicking_foot", "Kicking Foot", { L: "Left", R: "Right" }, [
      "Kicker",
      "Punter",
    ]),
  ],
  // No attributes: Track & Field, Cross Country, Swimming, Wrestling,
  // Field Hockey — intentionally absent (returns [] via attributesForSport).
};

/** Every attribute def, de-duplicated by key (bats/throws appear twice). */
export const ALL_ATTRIBUTE_DEFS: readonly AttributeDef[] = (() => {
  const seen = new Set<string>();
  const out: AttributeDef[] = [];
  for (const defs of Object.values(ATTRIBUTES_BY_SPORT)) {
    for (const d of defs) {
      if (seen.has(d.key)) continue;
      seen.add(d.key);
      out.push(d);
    }
  }
  return out;
})();

/**
 * Attribute definitions offered for a sport. A nil or unrecognized sport
 * returns an EMPTY array (no baseball fallback) — mirrors `attributesForSport`
 * on iOS and the positions/metrics helpers.
 */
export function attributesForSport(
  sport?: string | null,
): readonly AttributeDef[] {
  if (!sport) return [];
  return ATTRIBUTES_BY_SPORT[sport] ?? [];
}
