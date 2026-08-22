/**
 * Builders for external recruiting-database profile links.
 *
 * Prep Baseball Report profile URLs are slug-based, not ID-based:
 *   https://www.prepbaseballreport.com/profiles/{STATE}/{name-slug}
 * e.g. https://www.prepbaseballreport.com/profiles/OH/owen-andrikanich
 *
 * The stored `prep_baseball_id` now holds the name-slug; `prep_baseball_state`
 * holds the 2-letter state code the athlete's profile lives under (PBR files
 * profiles by state, which can differ from the athlete's home state).
 */

const PREP_BASEBALL_BASE = "https://www.prepbaseballreport.com/profiles";

/** name -> 2-letter code, plus every code mapped to itself for pass-through. */
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

const STATE_CODES = new Set(Object.values(STATE_NAME_TO_CODE));

/** Dropdown options: { code, name } sorted by name, for state <select>s. */
export const US_STATE_OPTIONS: ReadonlyArray<{ code: string; name: string }> =
  Object.entries(STATE_NAME_TO_CODE)
    .map(([name, code]) => ({
      code,
      name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

/** Kebab-case a player name for use as a PBR profile slug. */
export function slugifyPlayerName(name: string | undefined | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/['".]/g, "") // drop apostrophes/periods entirely (O'Brien -> obrien)
    .replace(/[^a-z0-9]+/g, "-") // any other run of non-alphanumerics -> single dash
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
}

/** Normalize a state name or code to a valid 2-letter USPS code, or null. */
export function normalizeStateCode(
  input: string | undefined | null,
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (STATE_CODES.has(upper)) return upper;
  return STATE_NAME_TO_CODE[trimmed.toLowerCase()] ?? null;
}

/**
 * Build a Prep Baseball Report profile URL from a state and name-slug.
 * Returns null unless both a valid state and a non-empty slug are present.
 */
export function buildPrepBaseballUrl(
  state: string | undefined | null,
  slug: string | undefined | null,
): string | null {
  const code = normalizeStateCode(state);
  if (!code) return null;
  const normalizedSlug = slugifyPlayerName(slug);
  if (!normalizedSlug) return null;
  return `${PREP_BASEBALL_BASE}/${code}/${normalizedSlug}`;
}
