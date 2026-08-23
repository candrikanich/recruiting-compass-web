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

/** Service → the sports that expose it, in display order. */
const SERVICE_MEMBERSHIP: ReadonlyArray<{
  def: ServiceDef;
  sports: readonly string[];
}> = [
  { def: NCSA, sports: ALL_SPORTS },
  { def: HUDL, sports: HUDL_SPORTS },
  { def: PERFECT_GAME, sports: BASEBALL_SOFTBALL },
  { def: PREP_BASEBALL, sports: BASEBALL_SOFTBALL },
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
