# Smart Input Enrichment — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Scope:** Player profile data quality — address autocomplete, high school search, social handle normalization

---

## Problem

Player profiles are filled out by players themselves. Three data entry points produce inconsistent, hard-to-query data:

1. **High school name** — free-text, no canonicalization. Same school gets entered dozens of ways. Breaks regional grouping and future social proof features.
2. **Home address** — manual city/state/zip entry, often incomplete. `latitude`/`longitude` fields exist in the `HomeLocation` type but are never populated, blocking geographic reporting and social proof.
3. **Social handles** — players paste full URLs, handles with `@`, inconsistent formats. Hard to generate profile links from.

No current friction — this is proactive data quality work to avoid typos, enable reporting, and unlock social proof features ("12 players in Ohio also recruiting Duke").

---

## Goals

- Standardize high school names to NCES canonical names + store NCES school ID
- Populate `latitude`/`longitude` on home address automatically via address autocomplete
- Normalize social handles to bare format (no `@`, no URL prefix) on blur
- Store data in a way that enables future: regional grouping, zip-based reporting, "players near you" social proof

## Non-Goals

- College/university enrichment (already handled by College Scorecard integration)
- Email validation, phone formatting, GPA range checks (deferred)
- MaxPreps or other sports-specific data imports
- Backfilling existing player records (forward-only; future backfill script can fuzzy-match `high_school` text against `nces_schools.name` — not in scope for v1)

---

## Approach: Option B — Smart Inputs + Future-Proof Storage

Store the minimum necessary IDs and coordinates alongside the improved UX — enough to unlock social proof and reporting with no retroactive migration.

---

## Data Model Changes

### `PlayerDetails` interface (`types/models.ts`)
Add one field:
```ts
nces_school_id?: string  // NCES school identifier, null if free-text entry used
```
No DB migration needed — `player_details` is a JSON column in `user_preferences`.

### `HomeLocation` interface (`types/models.ts`)
No changes. `latitude` and `longitude` are already typed — they just aren't populated. Radar.io autocomplete will fill them on selection.

### New Supabase table: `nces_schools`
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE nces_schools (
  nces_id   text PRIMARY KEY,
  name      text NOT NULL,
  city      text,
  state     char(2),
  zip       text,
  latitude  numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX nces_schools_name_trgm ON nces_schools USING GIN (name gin_trgm_ops);
CREATE INDEX nces_schools_state_idx ON nces_schools (state);
```
~27k rows (operational US high schools offering grade 12, filtered from NCES CCD). Static — refresh annually if desired.

---

## Architecture

```
Player types address
  → useAddressAutocomplete (debounced 300ms, inside composable)
  → GET /api/address/autocomplete?q=
  → Radar.io /v1/autocomplete (server-side proxy, US only)
  → dropdown suggestions
  → player selects → fills address + city + state + zip + lat + lng in HomeLocation JSON
  → city/state/zip become readonly; "Clear" button resets all fields to editable

Player types school name
  → useHighSchoolSearch (debounced 300ms, inside composable)
  → GET /api/schools/high-school-search?q=&state=
  → nces_schools table (ILIKE + pg_trgm index, state-biased ORDER BY)
  → dropdown shows "name · city, STATE"
  → player selects → fills high_school name + nces_school_id in PlayerDetails JSON
  → if 0 results: "Can't find it? Enter manually" button appears → free-text mode

Player enters social handle (on blur)
  → normalizeHandle(value, platform)
  → strips @, strips known URL prefixes
  → returns { handle, isShortUrl } — component shows soft warning if isShortUrl
  → updates field in place
```

**Fallback for all three:** if Radar.io is unavailable or NCES search returns no results, fields remain plain-text editable. No hard dependencies on external services.

---

## New Files

### Composables
- `composables/useAddressAutocomplete.ts` — wraps Radar.io proxy, debounced (300ms inside composable), returns suggestions + `selectSuggestion(s)` that fills full `HomeLocation`
- `composables/useHighSchoolSearch.ts` — queries NCES endpoint, debounced (300ms inside composable), returns suggestions + `selectSchool(s)` that returns `{ name, nces_school_id }`

### Components
- `components/Common/AddressAutocompleteInput.vue` — address fields with suggestion dropdown
- `components/Common/HighSchoolSearchInput.vue` — high school typeahead, shows city+state in results

### Utility
- `utils/social.ts` — `normalizeHandle(value: string, platform: 'twitter' | 'instagram' | 'tiktok'): { handle: string, isShortUrl: boolean }`

### API Routes
- `server/api/address/autocomplete.get.ts` — Radar.io proxy
- `server/api/schools/high-school-search.get.ts` — ILIKE on `nces_schools`

### Scripts
- `scripts/seed-nces-schools.ts` — one-time: download NCES CCD CSV → filter → bulk upsert

### Migration
- `supabase/migrations/20260318000000_nces_schools.sql`

---

## Component Behavior

### AddressAutocompleteInput
- Triggers on keystroke ≥ 3 chars, 300ms debounce (in composable)
- On selection: fills all 6 fields at once (address, city, state, zip, latitude, longitude) — no extra clicks
- After selection: city, state, zip inputs become `readonly`; a "Clear" button appears on the address field
- "Clear" resets all 6 fields to empty and editable
- Falls back to plain editable text if API returns an error (non-2xx or network timeout)
- Emits `update:modelValue` with full `HomeLocation` object

**Error responses:**
- Radar 401 (bad key) → log server-side, return `[]` to client, field stays editable
- Radar 429 (rate limit) → return `[]` to client, field stays editable
- Network timeout / Radar unavailable → return `[]`, field stays editable

### HighSchoolSearchInput
- Triggers on keystroke ≥ 2 chars, 300ms debounce (in composable)
- Results show `name · city, STATE` to disambiguate same-name schools
- If player's home state is set, results bias toward that state first (without filtering others out)
- After 0 results: "Can't find it? Enter manually" button appears
  - Clicking it switches the field to plain text input
  - User can switch back to search mode via an "X" on the manual input
  - Form allows save with `nces_school_id: null` (no validation block)
- Emits `update:modelValue` with `{ name: string, nces_school_id: string | null }`

### Social Handle Normalization

`normalizeHandle(value: string, platform: 'twitter' | 'instagram' | 'tiktok'): { handle: string, isShortUrl: boolean }`

Fires on `blur` for each social handle input. Component updates the field to `handle` and shows a soft warning icon if `isShortUrl: true`.

Short URL patterns (cannot resolve client-side): `/^(vm|vt)\.tiktok\.com\//`

| Input | handle | isShortUrl |
|---|---|---|
| `@CoachSmith` | `CoachSmith` | false |
| `twitter.com/CoachSmith` | `CoachSmith` | false |
| `x.com/CoachSmith` | `CoachSmith` | false |
| `instagram.com/athlete.23/` | `athlete.23` | false |
| `tiktok.com/@athlete_23` | `athlete_23` | false |
| `vm.tiktok.com/abc123` | `vm.tiktok.com/abc123` | true |
| `vt.tiktok.com/abc123` | `vt.tiktok.com/abc123` | true |
| `` (empty) | `` | false |

When `isShortUrl: true`, component shows: _"This looks like a short link — consider entering your handle directly (e.g. `yourusername`)."_

---

## API Route Details

### `GET /api/address/autocomplete`
- Query param: `q` (string)
- Returns `[]` immediately if `q.length < 3`
- Proxies to `https://api.radar.io/v1/autocomplete` with `country=US`, `limit=5`
- Auth: `useRuntimeConfig().radarApiKey` (server-side only, never in response)
- **On Radar 401:** log `logger.error`, return `[]` (graceful degradation)
- **On Radar 429:** return `[]` (graceful degradation)
- **On network error/timeout:** return `[]` (graceful degradation)
- No caching — user-typed strings have low repeat rate; Radar CDN handles upstream
- Returns: `Array<{ label: string, address: string, city: string, state: string, zip: string, latitude: number, longitude: number }>`

**Radar response field mapping** (Radar `/v1/autocomplete` → our response shape):
```
Radar field          → Our field
formattedAddress     → label    (shown in dropdown: "1428 Elm Street, Springfield, IL 62701")
addressLabel         → address  (fills the street address input: "1428 Elm Street")
city                 → city
stateCode            → state    (already 2-letter)
postalCode           → zip
latitude             → latitude
longitude            → longitude
```
`label` is display-only. `address` is what fills the street address field in the form.

### `GET /api/schools/high-school-search`
- Query params: `q` (string), `state` (optional, 2-letter code)
- Returns `[]` if `q` is missing or empty string (`?q` omitted or `?q=` both treated identically)
- Returns 400 `{ statusMessage: "q must be at least 2 characters" }` if `0 < q.length < 2`
- Queries `nces_schools` via ILIKE with pg_trgm index, limit 8
- State bias via SQL: `ORDER BY (state = $state) DESC, name ASC` — same-state results first, not exclusive
- Caching: Nitro `useStorage('redis')`, 1-hour TTL, cache key `nces:search:${q.toLowerCase()}:${state ?? ''}`
- Returns: `Array<{ nces_id: string, name: string, city: string | null, state: string | null }>`

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `NUXT_RADAR_API_KEY` | **New** | Server-side secret key from radar.com. Loaded via `useRuntimeConfig().radarApiKey`. Add to Vercel env + `.env.local`. Never exposed in client bundle or API responses. |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing | Used by seed script only |

**`nuxt.config.ts` addition:**
```ts
runtimeConfig: {
  radarApiKey: process.env.NUXT_RADAR_API_KEY ?? '',
}
```

---

## NCES Seed Process

**Source:** NCES Common Core of Data (CCD) — Public Elementary/Secondary School Universe Survey
**URL:** `https://nces.ed.gov/ccd/files.asp` → "Public School" → most recent school year
**File format:** CSV (e.g., `ccd_sch_029_2324_w_1a_231020.csv` for 2023-24)

**Required CSV columns (validate on script start, throw if missing):**
`NCESSCH`, `SCHNAM`, `LCITY`, `LSTATE`, `LZIP`, `LATCOD`, `LONCOD`, `STATUS`, `GSHI`

**Filter:**
- `STATUS = 1` (school is operational — not closed, not future)
- `GSHI = 12` (offers grade 12 — includes public, private, charter high schools)
- Expected result: ~27k rows (script should log final count as validation)

**Latitude/longitude:** If `LATCOD` or `LONCOD` is blank/null in CSV, insert `NULL` in DB. Log a warning per row. Geocoding is out of scope.

**Upsert logic:** `INSERT ... ON CONFLICT (nces_id) DO UPDATE SET name=..., city=..., state=..., zip=..., latitude=..., longitude=...`
**Batch size:** 500 rows per Supabase request
**Error handling:** Log batch errors and continue — script is idempotent, partial data is OK

**Prerequisites:**
- `SUPABASE_SERVICE_ROLE_KEY` must be set; script throws immediately if missing
- Migration `20260318000000_nces_schools.sql` must be applied first
- Run locally only — not in CI

**Run:** `npx tsx scripts/seed-nces-schools.ts /path/to/ccd_sch_file.csv`

---

## Testing

### Unit — `utils/social.ts`
- Strips `@` prefix for all platforms
- Strips `twitter.com/`, `x.com/`, `instagram.com/`, `tiktok.com/@` prefixes
- Returns `isShortUrl: true` for `vm.tiktok.com/*` and `vt.tiktok.com/*` patterns
- Returns empty string + `isShortUrl: false` for empty input
- Handles trailing slashes, query strings in URLs

### Unit — `useAddressAutocomplete`
- Debounces correctly (no call before 300ms)
- Does not call API for `q.length < 3`
- `selectSuggestion()` returns correctly shaped `HomeLocation` with lat/lng populated

### Unit — `useHighSchoolSearch`
- Debounces correctly
- Does not call API for `q.length < 2`
- `selectSchool()` returns `{ name, nces_school_id }`
- Returns `{ name, nces_school_id: null }` when escape hatch used

### Integration — `/api/address/autocomplete`
- `?q=ab` → returns `[]` (too short)
- `?q=abc` → proxies to Radar, returns shaped results
- Radar 401 → returns `[]` (no 500 thrown)
- Radar 429 → returns `[]`
- Missing `NUXT_RADAR_API_KEY` → returns `[]` with server error logged

### Integration — `/api/schools/high-school-search`
- `?q=` → returns `[]`
- `?q=L` → returns 400
- `?q=Lincoln` → returns up to 8 results
- `?q=Lincoln&state=OH` → Ohio schools appear first in results
- `?q=xqzpwv` (no results) → returns `[]`
- Cache hit on second identical request

### E2E
- Address autocomplete: typing fills dropdown; selecting a suggestion auto-fills city, state, zip, lat, lng; "Clear" resets fields
- High school search: typing shows results with city/state; selecting fills name + nces_id; 0 results shows escape hatch; escape hatch allows free-text entry
- Social handles: pasting full URL normalizes to handle on blur; short TikTok URL shows warning
- All three degrade to plain text on API error (mock Radar as unavailable)

---

## Future Unlocked

With `nces_school_id` and `latitude`/`longitude` stored on new profiles:

- **"X players in Ohio also recruiting Duke"** — group by `state` from `HomeLocation`
- **"X players from your area also recruiting"** — haversine distance query on lat/lng
- **Admin zip-code density map** — group players by zip for growth reporting
- **In-house college database** — IPEDS unit IDs already stored via College Scorecard; same seed pattern as NCES
