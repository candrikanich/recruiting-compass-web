/**
 * Canonical recruiting-service registry — the single source of truth on web.
 *
 * Third-party recruiting profiles (NCSA, Hudl, Perfect Game, Prep Baseball
 * Report) whose IDs / URLs are stored as flat keys in `user_preferences.data`
 * (category `player`). Mirrors iOS `RecruitingServices` byte-identically: same
 * keys, `valueKind`, `urlTemplate`, signup URLs, and which sports expose which
 * service. Existing keys `perfect_game_id` / `prep_baseball_id` are reused
 * verbatim (no data migration).
 *
 * Sibling of the positions/metrics/attributes registries: pure definitions plus
 * a `servicesForSport` helper returning `[]` for a nil/unknown sport.
 */

import { buildPrepBaseballUrl } from "~/utils/recruitingLinks";

/**
 * How a service's public-profile link is derived from its stored value:
 * - `template` — `urlTemplate.replace('{value}', value)` (Perfect Game).
 * - `url` — the stored value is itself the full profile URL (Hudl).
 * - `prepBaseball` — built from the athlete's `prep_baseball_state` + name
 *   (NOT the stored id), via `buildPrepBaseballUrl`.
 * Defaults to `template` when omitted.
 */
export type ServiceLinkKind = "template" | "url" | "prepBaseball";

export interface ServiceDef {
  /** Flat key stored in `user_preferences.data`. */
  key: string;
  label: string;
  /** `id` stores an identifier; `url` stores a full profile URL. */
  valueKind: "id" | "url";
  /** When set, the public profile link is `urlTemplate.replace('{value}', v)`. */
  urlTemplate?: string;
  /** How the profile link is built from context. Defaults to `template`. */
  linkKind?: ServiceLinkKind;
  /** "Get your profile" sign-up destination. */
  signupUrl: string;
  placeholder: string;
}

/** Context for `serviceProfileUrl`; a bare string is treated as `{ value }`. */
export interface ServiceUrlContext {
  value?: string | null;
  /** PBR only: US state (name or 2-letter code) the profile is filed under. */
  state?: string | null;
  /** PBR only: the athlete's name, slugified into the profile URL. */
  name?: string | null;
}

/** All 17 sports (keys match `SPORT_POSITIONS`). */
const ALL_SPORTS: readonly string[] = [
  "Baseball",
  "Softball",
  "Basketball",
  "Football",
  "Soccer",
  "Volleyball",
  "Track & Field",
  "Swimming",
  "Cross Country",
  "Tennis",
  "Golf",
  "Lacrosse",
  "Field Hockey",
  "Ice Hockey",
  "Wrestling",
  "Rowing",
  "Water Polo",
];

const HUDL_SPORTS: readonly string[] = [
  "Football",
  "Basketball",
  "Volleyball",
  "Soccer",
  "Lacrosse",
  "Ice Hockey",
  "Field Hockey",
  "Water Polo",
  "Wrestling",
];

const BASEBALL_SOFTBALL: readonly string[] = ["Baseball", "Softball"];

const TRACK_XC: readonly string[] = ["Track & Field", "Cross Country"];
const TENNIS: readonly string[] = ["Tennis"];
const SPORTSRECRUITS_SPORTS: readonly string[] = [
  "Soccer",
  "Lacrosse",
  "Volleyball",
  "Field Hockey",
];
const FOOTBALL_BASKETBALL: readonly string[] = ["Football", "Basketball"];

const NCSA: ServiceDef = {
  key: "ncsa_id",
  label: "NCSA",
  valueKind: "id",
  signupUrl: "https://www.ncsasports.org/",
  placeholder: "ID Number",
};

const HUDL: ServiceDef = {
  key: "hudl_url",
  label: "Hudl",
  valueKind: "url",
  linkKind: "url",
  signupUrl: "https://www.hudl.com/",
  placeholder: "Profile URL",
};

const PERFECT_GAME: ServiceDef = {
  key: "perfect_game_id",
  label: "Perfect Game",
  valueKind: "id",
  linkKind: "template",
  urlTemplate:
    "https://www.perfectgame.org/Players/Playerprofile.aspx?ID={value}",
  signupUrl: "https://www.perfectgame.org/",
  placeholder: "ID Number",
};

// PBR profiles are slug-based (/profiles/{STATE}/{name-slug}), so the link is
// built from the athlete's state + name — not the stored id. `urlTemplate` is
// intentionally omitted.
const PREP_BASEBALL: ServiceDef = {
  key: "prep_baseball_id",
  label: "Prep Baseball Report",
  valueKind: "id",
  linkKind: "prepBaseball",
  signupUrl: "https://www.prepbaseballreport.com/",
  placeholder: "ID Number",
};

// ── Services v2 ──────────────────────────────────────────────────────────
// id-kind: clean stable numeric id whose bare-id URL resolves → linkKind
// 'template' with a {value} urlTemplate. url-kind: name/compound-slug where a
// bare id fails → store the full URL, link is the value itself (like Hudl).

const ATHLETIC_NET: ServiceDef = {
  key: "athletic_net_id",
  label: "Athletic.net",
  valueKind: "id",
  linkKind: "template",
  urlTemplate: "https://www.athletic.net/athlete/{value}",
  signupUrl: "https://www.athletic.net/",
  placeholder: "ID Number",
};

const MILESPLIT: ServiceDef = {
  key: "milesplit_url",
  label: "MileSplit",
  valueKind: "url",
  linkKind: "url",
  signupUrl: "https://www.milesplit.com/",
  placeholder: "Profile URL",
};

const SWIMCLOUD: ServiceDef = {
  key: "swimcloud_id",
  label: "SwimCloud",
  valueKind: "id",
  linkKind: "template",
  urlTemplate: "https://www.swimcloud.com/swimmer/{value}/",
  signupUrl: "https://www.swimcloud.com/",
  placeholder: "ID Number",
};

const UTR: ServiceDef = {
  key: "utr_id",
  label: "Universal Tennis (UTR)",
  valueKind: "id",
  linkKind: "template",
  urlTemplate: "https://app.utrsports.net/profiles/{value}",
  signupUrl: "https://www.utrsports.net/",
  placeholder: "ID Number",
};

const TENNIS_RECRUITING: ServiceDef = {
  key: "tennis_recruiting_id",
  label: "Tennis Recruiting Network",
  valueKind: "id",
  linkKind: "template",
  urlTemplate: "https://www.tennisrecruiting.net/player.asp?id={value}",
  signupUrl: "https://www.tennisrecruiting.net/",
  placeholder: "ID Number",
};

const ELITE_PROSPECTS: ServiceDef = {
  key: "elite_prospects_id",
  label: "Elite Prospects",
  valueKind: "id",
  linkKind: "template",
  urlTemplate: "https://www.eliteprospects.com/player/{value}",
  signupUrl: "https://www.eliteprospects.com/",
  placeholder: "ID Number",
};

const SPORTSRECRUITS: ServiceDef = {
  key: "sportsrecruits_id",
  label: "SportsRecruits",
  valueKind: "id",
  linkKind: "template",
  urlTemplate: "https://sportsrecruits.com/athlete/{value}",
  signupUrl: "https://sportsrecruits.com/",
  placeholder: "ID Number",
};

const CONCEPT2: ServiceDef = {
  key: "concept2_id",
  label: "Concept2 Logbook",
  valueKind: "id",
  linkKind: "template",
  urlTemplate: "https://log.concept2.com/profile/{value}",
  signupUrl: "https://log.concept2.com/",
  placeholder: "ID Number",
};

const ON3: ServiceDef = {
  key: "on3_url",
  label: "On3",
  valueKind: "url",
  linkKind: "url",
  signupUrl: "https://www.on3.com/",
  placeholder: "Profile URL",
};

const SPORTS247: ServiceDef = {
  key: "sports247_url",
  label: "247Sports",
  valueKind: "url",
  linkKind: "url",
  signupUrl: "https://247sports.com/",
  placeholder: "Profile URL",
};

/** Service → the sports that expose it, in display order. */
const SERVICE_MEMBERSHIP: ReadonlyArray<{
  def: ServiceDef;
  sports: readonly string[];
}> = [
  { def: NCSA, sports: ALL_SPORTS },
  { def: HUDL, sports: HUDL_SPORTS },
  { def: PERFECT_GAME, sports: BASEBALL_SOFTBALL },
  { def: PREP_BASEBALL, sports: BASEBALL_SOFTBALL },
  // Services v2 — ordered after the v1 four in every sport's list.
  { def: ATHLETIC_NET, sports: TRACK_XC },
  { def: MILESPLIT, sports: TRACK_XC },
  { def: SWIMCLOUD, sports: ["Swimming"] },
  { def: UTR, sports: TENNIS },
  { def: TENNIS_RECRUITING, sports: TENNIS },
  { def: ELITE_PROSPECTS, sports: ["Ice Hockey"] },
  { def: SPORTSRECRUITS, sports: SPORTSRECRUITS_SPORTS },
  { def: CONCEPT2, sports: ["Rowing"] },
  { def: ON3, sports: FOOTBALL_BASKETBALL },
  { def: SPORTS247, sports: FOOTBALL_BASKETBALL },
];

/** Every service def, once each (for label lookups). */
export const ALL_SERVICE_DEFS: readonly ServiceDef[] = SERVICE_MEMBERSHIP.map(
  (m) => m.def,
);

/**
 * Recruiting services offered for a sport, in display order. A nil or
 * unrecognized sport returns an EMPTY array — mirrors iOS `servicesForSport`.
 */
export function servicesForSport(sport?: string | null): readonly ServiceDef[] {
  if (!sport) return [];
  return SERVICE_MEMBERSHIP.filter((m) => m.sports.includes(sport)).map(
    (m) => m.def,
  );
}

/**
 * Public-profile link for a service, dispatched on `def.linkKind`:
 * - `template` → `urlTemplate.replace('{value}', value)` (null without a value
 *   or a template — e.g. NCSA, a signup-only id)
 * - `url` → the stored value itself
 * - `prepBaseball` → `buildPrepBaseballUrl(state, name)` (ignores `value`)
 *
 * `ctx` may be a bare value string (back-compat for the id/url kinds) or a full
 * `{ value, state, name }` context (required for `prepBaseball`).
 */
export function serviceProfileUrl(
  def: ServiceDef,
  ctx: string | ServiceUrlContext | null | undefined,
): string | null {
  const context: ServiceUrlContext =
    typeof ctx === "string" || ctx == null ? { value: ctx } : ctx;
  const kind = def.linkKind ?? "template";

  if (kind === "prepBaseball") {
    return buildPrepBaseballUrl(context.state, context.name);
  }

  const v = (context.value ?? "").trim();
  if (!v) return null;
  if (kind === "url") return v;
  if (def.urlTemplate) return def.urlTemplate.replace("{value}", v);
  return null;
}
