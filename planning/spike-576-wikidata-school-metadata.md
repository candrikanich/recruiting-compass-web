# Spike #576: School Metadata Data Source Validation

**Date:** 2026-09-02
**Status:** Complete
**Conclusion:** Wikidata not viable for mascots/colors. Wikipedia tables + open datasets are the path.

## Findings

### Wikidata SPARQL

| What | Finding |
|------|---------|
| IPEDS property | **P1771** (not P6782 which is ROR ID) |
| Mascot (P822) | Only **37 of 1,557** US colleges have it (2.4% coverage) ❌ |
| Colors (P462) | Virtually zero coverage — not populated for colleges ❌ |
| Athletics URL | Lives on separate "athletics program" entities linked via `wdt:P1376` (represents). Sparse — even Alabama needed name-based lookup ❌ |
| School website (P856) | Good coverage ✅ but we already have this |
| Twitter/Instagram (P2002/P2003) | Decent for large schools, sparse for small ⚠️ |
| Query speed | ~1-3s per query. Acceptable with caching |
| Rate limits | 5 req/s for unregistered, generous for batch |

**Verdict:** Wikidata is **not viable** as a primary or fallback source for mascots, colors, or athletics URLs. Coverage too low.

### What We ALREADY Have (ncaaSchools.json)

Massive discovery: our existing `data/ncaaSchools.json` already contains:

| Field | Coverage |
|-------|----------|
| `athleticWebsite` | **1,091/1,093 (99.8%)** ✅ |
| `website` | **1,091/1,093 (99.8%)** ✅ |
| `conference` | All entries |
| `state` | All entries |

**Athletics URL is a solved problem** — just not wired to the `athletics_url` column when schools are added via autocomplete.

### Wikipedia Tables (for mascots/nicknames)

Three pages have structured tables with nickname for every NCAA school:
- `List_of_NCAA_Division_I_institutions` — ~362 schools with `Nickname` column
- `List_of_NCAA_Division_II_institutions` — ~302 schools with `Nickname` column  
- `List_of_NCAA_Division_III_institutions` — ~429 schools with `Nickname` column

Extractable via Wikipedia API (`action=parse`). Format: `| School | Nickname | City | State | ...`

**Verdict:** Best source for mascots/nicknames. One-time extraction to build seed file.

### NCAA Team Colors Dataset (GitHub)

`glidej/ncaa-team-colors` — MIT-licensed JSON:
- **347 schools** with hex color arrays
- Format: `{ "name": "Alabama Crimson Tide", "colors": ["#CACCCE", "#FFFFFF", "#A80532"] }`
- Covers mostly D1 (~347 ≈ D1 count). D2/D3 NOT covered.

**Verdict:** Good starting point for D1 colors. D2/D3 need manual curation or Wikipedia infobox extraction (text-to-hex mapping required).

### Wikipedia Infoboxes (for colors)

Individual school pages have colors in infobox: `| colors = [[Crimson]] and White`
- Text format, not hex — needs color-name-to-hex mapping
- High coverage (virtually every school)
- More extraction work than the GitHub dataset

## Revised Recommendation

### Drop Wikidata from the plan entirely
Coverage is too poor. Not worth the complexity of SPARQL client, Redis caching, rate limit handling.

### Three-source hybrid instead:

1. **Existing `ncaaSchools.json`** (already in repo)
   - Athletics URL ✅ (99.8%)
   - Wire into school creation flow — zero new data needed

2. **Wikipedia table extraction** (one-time script → static JSON)
   - Nickname/mascot for all 1,093 schools
   - Run once, commit `data/schoolMetadata.json`

3. **NCAA team colors dataset** (GitHub, MIT license, one-time merge)
   - Hex colors for ~347 D1 schools
   - D2/D3: extract from Wikipedia infoboxes or curate manually (~700 schools)

### Simplified architecture
- **No runtime API calls** — everything is static seed data
- **No Redis caching** — nothing to cache
- **No SSRF hardening** — no outbound requests
- Server utility becomes a simple JSON lookup, not a multi-source resolver

### Impact on issues

| Issue | Change |
|-------|--------|
| #576 (this spike) | ✅ Complete |
| #577 (schoolMetadata.json) | Script extracts from Wikipedia + merges color dataset. No Wikidata |
| #578 (scholarships + conferences) | No change |
| #579 (schema) | No change |
| #580 (server utility) | **Massively simplified** — static JSON lookup only, no Wikidata client |
| #581 (school add trigger) | Wire existing `athleticWebsite` from ncaaSchools.json + mascot from seed |
| #582 (enrich trigger) | Simpler — just fill from static data |
| #583 (cron backfill) | May not be needed — if populated at add time, backfill only for existing schools |
| #584 (web UI) | No change |
| #585 (iOS UI) | No change |
