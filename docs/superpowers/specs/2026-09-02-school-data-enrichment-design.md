# School Data Enrichment — Design Spec

**Date:** 2026-09-02
**Status:** Approved
**Branch:** TBD (future implementation)

## Problem

Schools have athletics websites, mascots, colors, and scholarship info that matter to recruiting families. These fields exist in the schema (or can be added) but are never auto-populated — users must manually enter everything. Current external data sources (College Scorecard, NCAA static JSON) don't cover this data.

## Solution

Hybrid data pipeline: static seed files + Wikidata API fallback, triggered on school add, enrich, and background cron. Cross-platform (data in Supabase, consumed by both web and iOS).

## Data Sources

### Static Seed Files (checked into repo)

1. **`data/schoolMetadata.json`** — keyed by IPEDS ID
   ```json
   {
     "100654": {
       "mascot": "Bulldogs",
       "athleticsUrl": "https://alabamaamathletics.com",
       "colors": ["#660000", "#FFFFFF"],
       "conferenceUrl": "https://www.swac.org"
     }
   }
   ```
   Initial build: script queries Wikidata SPARQL for all US colleges with IPEDS IDs, dumps mascot (P822), athletics website, colors (P462). Manual review for top ~100 schools.

2. **`data/scholarshipLimits.json`** — keyed by `{sport}_{division}`
   ```json
   {
     "baseball_D1": { "total": 11.7, "headCount": null, "equivalency": 11.7, "notes": "Equivalency sport" },
     "football_D1_FBS": { "total": 85, "headCount": 85, "equivalency": null, "notes": "Head count sport" }
   }
   ```
   ~150 rows. Source: NCAA published limits. Changes rarely (rule changes only).

3. **`data/conferenceUrls.json`** — keyed by conference name string
   ```json
   {
     "Big Ten": "https://bigten.org",
     "SEC": "https://secsports.com"
   }
   ```
   ~35 entries. Matched against existing `conference` column values.

### Wikidata API (runtime fallback)

Server utility queries Wikidata SPARQL endpoint when static seed misses fields. Redis-cached 30 days. Fails open (nulls, never blocks).

SPARQL query by IPEDS ID (property P6782), returns mascot (P822), athletics website, colors (P462). Exact property IDs need spike validation.

## Schema Changes

### New columns on `schools` table

| Column | Type | Notes |
|--------|------|-------|
| `mascot` | text, nullable | Promoted from `academic_info.mascot` JSONB. Migration backfills existing values. |
| `school_colors` | text[], nullable | Array of hex strings, e.g. `["#660000", "#FFFFFF"]` |

`athletics_url` already exists. No change.

### New table: `scholarship_limits`

```sql
CREATE TABLE scholarship_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport text NOT NULL,
  division text NOT NULL,
  total numeric,
  head_count integer,
  equivalency numeric,
  notes text,
  UNIQUE(sport, division)
);
```

RLS: read-only for authenticated, service-role writes. Seeded from static file. ~150 rows.

### Not changed

- `academic_info` JSONB shape (backward compat, reads still work)
- `nces_schools`, `conference` column, `website`, `favicon_url`
- Conference URLs stay client-side (static file, no DB table)

## Enrichment Pipeline

### Server utility: `server/utils/schoolMetadataLookup.ts`

```typescript
lookupSchoolMetadata(schoolName: string, ipedsId?: string): Promise<{
  mascot: string | null
  athleticsUrl: string | null
  colors: string[] | null
  conferenceUrl: string | null
}>
```

Resolution order:
1. Static seed (`data/schoolMetadata.json`) — instant, no network
2. Wikidata SPARQL — if static misses any field. Redis-cached 30 days
3. Conference URL — from `data/conferenceUrls.json` by conference name
4. Merged result. Nulls for unfound fields. Never throws.

### Trigger 1: On school add (NCAA autocomplete)

In `pages/schools/new.vue`, after NCAA autocomplete selection, before save:
- Call `lookupSchoolMetadata` with IPEDS ID
- Pre-fill `mascot`, `athletics_url`, `school_colors`
- User sees pre-filled fields, can edit before saving
- Non-blocking — failure = empty fields

### Trigger 2: On enrich button

Extend `server/api/schools/[id]/enrich.post.ts`:
- After College Scorecard enrichment, also call `lookupSchoolMetadata`
- Null-fill only (don't overwrite user-edited values)
- Return enriched fields in response

### Trigger 3: Background cron backfill

New cron job `school-metadata-backfill`:
- Queries schools with null mascot/athletics_url/school_colors
- Batch-processes, throttled ~5/sec (Wikidata rate limits)
- Null-fill only (preserves user edits)
- Wrapped in `withCronRun`
- Weekly cadence

### Null-fill-only rule

All three triggers: if a field already has a value, enrichment skips it. User is always the authority.

## UI Changes

### Web — SchoolInformationCard.vue (Contact & Social)

- **Mascot** — text display + edit field, wired to new `mascot` column
- **School colors** — color swatches (small circles). Edit = hex input fields (2 slots)
- **Conference URL** — clickable link under conference name (auto-resolved, not user-editable)
- **Athletics URL** — already present, no change

### Web — School header

- Mascot as subtitle: "Ashland Eagles" not just "Ashland University"
- Color swatches next to logo (subtle, optional)

### Web — College Data section

- **Scholarship info** — "Athletic Scholarships: 11.7 equivalency (D1 Baseball)" from `scholarship_limits`, matched by school division + athlete sport preference

### iOS

- Same fields in school detail Contact & Social section
- Same scholarship display
- Reads same Supabase columns — display-only PR
- No iOS-specific enrichment logic

### Not changed

- Schools list page (mascot/colors are detail-level)
- Recommendations cards (low priority, separate issue if desired)

## Issue Breakdown

1. **Spike: Wikidata SPARQL validation** — validate property IDs, test query coverage, measure response times
2. **Static seed: build schoolMetadata.json** — script + manual review for ~600 NCAA schools
3. **Static seed: scholarshipLimits.json + conferenceUrls.json** — curate from NCAA published data
4. **Schema: mascot column + school_colors column** — migration, backfill from academic_info
5. **Schema: scholarship_limits table** — migration + seed
6. **Server: schoolMetadataLookup utility** — static + Wikidata resolver, Redis cache
7. **Trigger: auto-populate on school add** — wire into NCAA autocomplete flow
8. **Trigger: extend enrich endpoint** — add metadata lookup to existing enrichment
9. **Trigger: background cron backfill** — weekly job for missing data
10. **Web UI: display mascot, colors, conference URL, scholarships** — SchoolInformationCard + header
11. **iOS UI: display new school metadata fields** — mirror web changes

## Open Questions

- Wikidata property P6782 (IPEDS) coverage — how many of the ~600 NCAA catalog schools have Wikidata entries? Spike will answer.
- Athletics URL: Wikidata may store the school's general website (P856) not athletics-specific. May need heuristic (check for "athletics" subdomain pattern). Spike will clarify.
- School colors: Wikidata stores color entities (Q...) not hex values. Need color-entity-to-hex mapping. Spike scope.
- Scholarship limits for non-NCAA divisions (NAIA, JUCO) — different governing bodies, different rules. May need separate data sources.
