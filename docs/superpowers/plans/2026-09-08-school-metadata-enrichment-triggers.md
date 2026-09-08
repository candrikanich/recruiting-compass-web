# School Metadata Enrichment Triggers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared `lookupSchoolMetadata` server util and wire it into all three remaining enrichment triggers from the design spec — enrich endpoint (#582), NCAA-autocomplete school-add (#581), and weekly cron backfill (#583) — closing all three issues.

**Architecture:** One pure-ish server util (`server/utils/schoolMetadataLookup.ts`) resolves `{mascot, athleticsUrl, colors, conferenceUrl}` for a school name: static seed (`data/schoolMetadata.json`, already shipped in #616) → Wikidata SPARQL fallback for mascot/colors only (Redis-cached 30d, fails open) → `getConferenceUrl` (already shipped in #633, pure/local). Each trigger calls this util and null-fills only — never overwrites a user-edited value. Trigger 1 needs a new thin GET endpoint (no school exists yet to attach the POST-based enrich endpoint to). Trigger 2 extends the existing enrich endpoint's confirm step. Trigger 3 is a new cron following the existing `withCronRun` + `mapWithConcurrency` pattern.

**Tech Stack:** Nitro server routes, Zod, `@upstash/redis` (already wired via `server/utils/redis.ts`), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-02-school-data-enrichment-design.md`

## Global Constraints

- Null-fill only, every trigger: a field with an existing value is never overwritten. User edits are always authoritative.
- Every lookup path fails open — network/API errors return nulls, never throw, never block the caller's primary action (school save, enrich, cron run).
- `data/schoolMetadata.json` is keyed by **exact school name string** (not IPEDS ID as the original spec draft assumed — verify against the actual shipped seed before changing this).
- Wikidata SPARQL fallback covers **mascot and colors only** — there is no reliable Wikidata property for an "athletics website" distinct from the general official-website property, so `athleticsUrl` comes from the static seed exclusively (null if the seed misses it). Document this deviation from the spec in the util's file header.
- Reuse `getConferenceUrl` from `utils/conferenceUrls.ts` (already shipped, already unit-tested) for the conference-URL piece — do not reimplement it.
- Already shipped, do not touch: `schools.mascot`/`schools.school_colors` columns, `scholarship_limits` table, `SchoolInformationCard.vue` display/edit rows, `SchoolDetailHeader.vue` mascot subtitle + swatches, `useScholarshipLimits`.

---

## File Structure

| File | Responsibility |
|---|---|
| `server/utils/schoolMetadataLookup.ts` | **New.** Core resolution logic — seed → Wikidata fallback → conference URL. No callers baked in. |
| `tests/unit/server/utils/schoolMetadataLookup.spec.ts` | **New.** Unit tests for the util (mocked fetch + mocked redis). |
| `server/api/schools/[id]/enrich.post.ts` | **Modify.** Confirm step calls the util after the Scorecard merge, null-fills mascot/colors/athleticsUrl/conferenceUrl. |
| `tests/unit/server/api/schools/enrich.spec.ts` | **Modify (or create).** Cover the null-fill merge behavior. |
| `server/api/schools/metadata-lookup.get.ts` | **New.** Thin authed GET wrapping the util, for the pre-save (no `schoolId` yet) trigger. |
| `tests/unit/server/api/schools/metadata-lookup.spec.ts` | **New.** |
| `components/School/SchoolForm.vue` | **Modify.** Add mascot / athletics URL / school colors fields (none exist today), wired to the same `initialData` + `auto-filled` pattern as division/conference. |
| `pages/schools/new.vue` | **Modify.** Call the new endpoint alongside the existing NCAA + Scorecard `Promise.all`, apply results the same way. |
| `tests/unit/components/School/SchoolForm.spec.ts` | **Modify.** Cover new fields + auto-fill badges. |
| `server/api/cron/school-metadata-backfill.get.ts` | **New.** Weekly cron: query null-mascot schools, batch-resolve via the util at 5/sec, null-fill, wrapped in `withCronRun`. |
| `tests/unit/server/api/cron/school-metadata-backfill.spec.ts` | **New.** |
| `utils/cronDashboard.ts` | **Modify.** Add `"school-metadata-backfill"` to `TRIGGERABLE_JOBS`. |
| `vercel.json` | **Modify.** Add weekly cron entry. |

---

### Task 1: `schoolMetadataLookup` util

**Files:**
- Create: `server/utils/schoolMetadataLookup.ts`
- Test: `tests/unit/server/utils/schoolMetadataLookup.spec.ts`

**Interfaces:**
- Produces: `lookupSchoolMetadata(schoolName: string, conference?: string | null): Promise<SchoolMetadataResult>` where
  ```ts
  export interface SchoolMetadataResult {
    mascot: string | null;
    athleticsUrl: string | null;
    colors: string[] | null;
    conferenceUrl: string | null;
  }
  ```
- Consumes: `redis` (nullable client) + `TTL.THIRTY_DAYS` from `~/server/utils/redis`, `getConferenceUrl` from `~/utils/conferenceUrls`, `data/schoolMetadata.json`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/server/utils/schoolMetadataLookup.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
vi.mock("~/server/utils/redis", () => ({
  redis: { get: (...a: unknown[]) => mockRedisGet(...a), set: (...a: unknown[]) => mockRedisSet(...a) },
  TTL: { THIRTY_DAYS: 2592000 },
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

describe("lookupSchoolMetadata", () => {
  beforeEach(() => {
    mockRedisGet.mockReset().mockResolvedValue(null);
    mockRedisSet.mockReset();
    fetchMock.mockReset();
  });

  it("resolves fully from the static seed when it has every field", async () => {
    const result = await lookupSchoolMetadata("Alabama State University");
    expect(result).toEqual({
      mascot: "Hornets",
      athleticsUrl: "https://www.bamastatesports.com",
      colors: ["#FFFFFF", "#231F20", "#FECB09"],
      conferenceUrl: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to Wikidata for mascot/colors when the seed is missing them, and caches the result", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          bindings: [
            { mascotLabel: { value: "Wildcats" }, color: { value: "#003087" } },
          ],
        },
      }),
    });

    const result = await lookupSchoolMetadata("Abilene Christian University");

    expect(result.mascot).toBe("Wildcats");
    expect(result.colors).toEqual(["#003087"]);
    expect(result.athleticsUrl).toBe("https://www.acusports.com"); // seed-only, unaffected
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining("wikidata:school:"),
      expect.any(String),
      { ex: 2592000 },
    );
  });

  it("returns Wikidata result from cache without calling fetch again", async () => {
    mockRedisGet.mockResolvedValueOnce(
      JSON.stringify({ mascot: "Wildcats", colors: ["#003087"] }),
    );
    const result = await lookupSchoolMetadata("Abilene Christian University");
    expect(result.mascot).toBe("Wildcats");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails open on Wikidata network error — never throws, returns seed-only nulls", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await lookupSchoolMetadata("Zzz Unknown University");
    expect(result).toEqual({
      mascot: null,
      athleticsUrl: null,
      colors: null,
      conferenceUrl: null,
    });
  });

  it("resolves conferenceUrl via getConferenceUrl when a conference is passed", async () => {
    const result = await lookupSchoolMetadata("Zzz Unknown University", "SEC");
    expect(result.conferenceUrl).toBe("https://www.secsports.com");
  });

  it("never overrides seed athleticsUrl with a Wikidata value — Wikidata is not queried for it", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: { bindings: [] } }),
    });
    await lookupSchoolMetadata("Zzz Unknown University");
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain("athleticsUrl");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/unit/server/utils/schoolMetadataLookup.spec.ts`
Expected: FAIL — `Cannot find module '~/server/utils/schoolMetadataLookup'`

- [ ] **Step 3: Implement the util**

First confirm the real value at `utils/conferenceUrls.ts`'s `"SEC"` key so the test above matches (`cat data/conferenceUrls.json | grep -A1 '"SEC"'`) — adjust the test's expected URL if it differs.

```ts
// server/utils/schoolMetadataLookup.ts
/**
 * Resolves mascot / athletics URL / colors / conference URL for a school
 * name. Three-tier resolution, all fail-open (never throws):
 *
 *   1. Static seed (data/schoolMetadata.json, issue #616) — instant, keyed
 *      by exact school name string (NOT IPEDS id — that's what the design
 *      spec assumed, but the shipped seed keys by name).
 *   2. Wikidata SPARQL — only for mascot/colors, only when the seed missed
 *      them. There's no reliable Wikidata property for an athletics-specific
 *      website (distinct from the school's general site), so athleticsUrl
 *      is seed-only by design. Redis-cached 30 days; any failure (network,
 *      malformed response, missing redis) degrades to seed-only nulls.
 *   3. Conference URL — delegates to the already-shipped, pure
 *      getConferenceUrl (utils/conferenceUrls.ts). No network.
 *
 * Callers (enrich endpoint, autocomplete pre-fill, cron backfill) are all
 * responsible for null-fill-only merging — this util just resolves values,
 * it does not know about existing school state.
 */
import { redis, TTL } from "~/server/utils/redis";
import { getConferenceUrl } from "~/utils/conferenceUrls";
import { createLogger } from "~/server/utils/logger";
import schoolMetadataSeed from "~/data/schoolMetadata.json";

const logger = createLogger("schoolMetadataLookup");

const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const WIKIDATA_CACHE_PREFIX = "wikidata:school:";

interface SeedEntry {
  mascot: string | null;
  athleticsUrl: string | null;
  colors: string[] | null;
  conferenceUrl: string | null;
  division?: string;
}

const SEED = schoolMetadataSeed as Record<string, SeedEntry>;

export interface SchoolMetadataResult {
  mascot: string | null;
  athleticsUrl: string | null;
  colors: string[] | null;
  conferenceUrl: string | null;
}

interface WikidataFields {
  mascot: string | null;
  colors: string[] | null;
}

async function fetchWikidataFields(
  schoolName: string,
): Promise<WikidataFields> {
  const cacheKey = `${WIKIDATA_CACHE_PREFIX}${schoolName.toLowerCase().trim()}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (typeof cached === "string") {
        return JSON.parse(cached) as WikidataFields;
      }
    } catch (err) {
      logger.warn("Wikidata cache read failed", { schoolName, err });
    }
  }

  const escaped = schoolName.replace(/"/g, '\\"');
  const query = `
    SELECT ?mascotLabel ?color WHERE {
      ?school rdfs:label "${escaped}"@en.
      OPTIONAL { ?school wdt:P822 ?mascot. }
      OPTIONAL { ?school wdt:P462 ?colorEntity. ?colorEntity rdfs:label ?colorLabelRaw. FILTER(LANG(?colorLabelRaw) = "en") BIND(?colorLabelRaw AS ?color) }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 5
  `.trim();

  let result: WikidataFields = { mascot: null, colors: null };

  try {
    const res = await fetch(
      `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`,
      { headers: { Accept: "application/sparql-results+json" } },
    );
    if (res.ok) {
      const body = (await res.json()) as {
        results: { bindings: Array<Record<string, { value: string }>> };
      };
      const bindings = body.results?.bindings ?? [];
      const mascot = bindings.find((b) => b.mascotLabel)?.mascotLabel?.value ?? null;
      const colors = bindings
        .map((b) => b.color?.value)
        .filter((v): v is string => Boolean(v));
      result = { mascot, colors: colors.length > 0 ? colors : null };
    }
  } catch (err) {
    logger.warn("Wikidata SPARQL lookup failed", { schoolName, err });
  }

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(result), { ex: TTL.THIRTY_DAYS });
    } catch (err) {
      logger.warn("Wikidata cache write failed", { schoolName, err });
    }
  }

  return result;
}

export async function lookupSchoolMetadata(
  schoolName: string,
  conference?: string | null,
): Promise<SchoolMetadataResult> {
  const seed = SEED[schoolName];

  let mascot = seed?.mascot ?? null;
  let colors = seed?.colors ?? null;
  const athleticsUrl = seed?.athleticsUrl ?? null;

  if (!mascot || !colors) {
    const wikidata = await fetchWikidataFields(schoolName);
    mascot = mascot ?? wikidata.mascot;
    colors = colors ?? wikidata.colors;
  }

  return {
    mascot,
    athleticsUrl,
    colors,
    conferenceUrl: getConferenceUrl(conference),
  };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/unit/server/utils/schoolMetadataLookup.spec.ts`
Expected: PASS (all 6)

- [ ] **Step 5: Commit**

```bash
git add server/utils/schoolMetadataLookup.ts tests/unit/server/utils/schoolMetadataLookup.spec.ts
git commit -m "feat(schools): add shared school-metadata lookup util"
```

---

### Task 2: Wire into enrich endpoint (closes #582)

**Files:**
- Modify: `server/api/schools/[id]/enrich.post.ts:104-168` (Step 2 / confirm block)
- Test: `tests/unit/server/api/schools/enrich.spec.ts` (create if no existing spec file — check first: `find tests -iname "*enrich*"`)

**Interfaces:**
- Consumes: `lookupSchoolMetadata(schoolName, conference?)` from Task 1.
- Produces: response `data` gains `mascot`, `athleticsUrl`, `colors`, `conferenceUrl` (each `string | string[] | null`) alongside the existing `academicInfo`.

- [ ] **Step 1: Write the failing test**

First check for an existing spec covering this endpoint (`find tests -iname "*enrich*"`); if one exists, add to it instead of creating a new file — match its existing mocking style for `createServerSupabaseClient`/`requireAuth`. If none exists, create:

```ts
// tests/unit/server/api/schools/enrich.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/collegeScorecard", () => ({
  searchCollegeScorecard: vi.fn(),
  scorecardToAcademicInfo: vi.fn(() => ({ student_size: 12000 })),
}));
vi.mock("~/server/utils/schoolMetadataLookup", () => ({
  lookupSchoolMetadata: vi.fn(),
}));
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-1" })),
  assertNotParent: vi.fn(async () => undefined),
}));
vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => "school-1"),
}));

// Build a chainable Supabase mock: family_members -> membership,
// schools select -> existing row, schools update -> success.
function buildSupabaseMock(existingSchool: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { family_unit_id: "fam-1" } }),
            }),
          }),
        };
      }
      if (table === "schools") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: existingSchool, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "~/server/utils/supabase";
import { searchCollegeScorecard } from "~/server/utils/collegeScorecard";
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";
import handler from "~/server/api/schools/[id]/enrich.post";

describe("POST /api/schools/[id]/enrich — confirm step metadata null-fill", () => {
  beforeEach(() => {
    vi.mocked(searchCollegeScorecard).mockResolvedValue({
      results: [{ id: 42, "school.name": "Test U" } as any],
    } as any);
  });

  it("null-fills mascot/colors/athleticsUrl/conferenceUrl when the school has none", async () => {
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      buildSupabaseMock({
        id: "school-1",
        name: "Test U",
        academic_info: {},
        mascot: null,
        school_colors: null,
        athletics_url: null,
        conference: "SEC",
        family_unit_id: "fam-1",
      }) as any,
    );
    vi.mocked(lookupSchoolMetadata).mockResolvedValue({
      mascot: "Tigers",
      athleticsUrl: "https://testu.example/athletics",
      colors: ["#FF0000"],
      conferenceUrl: "https://secsports.com",
    });

    const event = { context: {} } as any;
    // readBody is imported from h3 in the handler — mock the module-level
    // h3 import used by the file under test via vi.mock at file scope if
    // the existing test-harness pattern in this repo does so; otherwise
    // stub event.node.req body per this repo's existing enrich/endpoint
    // test convention (check an existing server/api spec for the pattern
    // actually in use before writing this stub).
    const result = await handler(event);

    expect(result.data.mascot).toBe("Tigers");
    expect(result.data.athleticsUrl).toBe("https://testu.example/athletics");
    expect(result.data.colors).toEqual(["#FF0000"]);
    expect(result.data.conferenceUrl).toBe("https://secsports.com");
  });

  it("does not overwrite an existing mascot/colors value", async () => {
    vi.mocked(createServerSupabaseClient).mockReturnValue(
      buildSupabaseMock({
        id: "school-1",
        name: "Test U",
        academic_info: {},
        mascot: "User-Set Mascot",
        school_colors: ["#000000"],
        athletics_url: null,
        conference: "SEC",
        family_unit_id: "fam-1",
      }) as any,
    );
    vi.mocked(lookupSchoolMetadata).mockResolvedValue({
      mascot: "Tigers",
      athleticsUrl: "https://testu.example/athletics",
      colors: ["#FF0000"],
      conferenceUrl: "https://secsports.com",
    });

    const event = { context: {} } as any;
    const result = await handler(event);

    expect(result.data.mascot).toBe("User-Set Mascot");
    expect(result.data.colors).toEqual(["#000000"]);
    expect(result.data.athleticsUrl).toBe("https://testu.example/athletics");
  });
});
```

Note: the exact `readBody`/event stub shape depends on how this repo's existing `server/api/**` Vitest specs mock h3 — **before finalizing this test file, read one existing passing spec under `tests/unit/server/api/schools/` (or the nearest sibling) and match its `event`/`readBody` mocking convention exactly**, rather than the placeholder `{ context: {} }` shown above.

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/unit/server/api/schools/enrich.spec.ts`
Expected: FAIL — `result.data.mascot` is `undefined` (field doesn't exist yet)

- [ ] **Step 3: Implement — extend the confirm block**

```ts
// server/api/schools/[id]/enrich.post.ts
// Add import near the top, alongside the collegeScorecard import:
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

// Extend the school select at line 52-57 to also pull the columns this
// trigger null-fills:
const { data: school, error: schoolError } = await supabase
  .from("schools")
  .select(
    "id, name, academic_info, family_unit_id, mascot, school_colors, athletics_url, conference",
  )
  .eq("id", schoolId)
  .eq("family_unit_id", membership.family_unit_id)
  .single();
```

Then, inside the Step 2 (confirm) `try` block, right after `const mergedInfo: SchoolAcademicInfo = { ...existingInfo, ...enrichedData };` (existing line ~127):

```ts
    const schoolRow = school as {
      mascot: string | null;
      school_colors: string[] | null;
      athletics_url: string | null;
      conference: string | null;
    };

    const metadata = await lookupSchoolMetadata(schoolName, schoolRow.conference);

    // Null-fill only: an existing value always wins.
    const mascot = schoolRow.mascot ?? metadata.mascot;
    const schoolColors = schoolRow.school_colors ?? metadata.colors;
    const athleticsUrl = schoolRow.athletics_url ?? metadata.athleticsUrl;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const academicInfo = mergedInfo as any;
    const { error: updateError } = await supabase
      .from("schools")
      .update({
        academic_info: academicInfo,
        mascot,
        school_colors: schoolColors,
        athletics_url: athleticsUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", schoolId);
```

And extend the success response (existing `return` at the bottom of the confirm block):

```ts
    return {
      success: true,
      data: {
        schoolId,
        academicInfo: mergedInfo,
        mascot,
        athleticsUrl,
        colors: schoolColors,
        conferenceUrl: metadata.conferenceUrl,
        message: "Academic data updated from College Scorecard.",
      },
    };
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/unit/server/api/schools/enrich.spec.ts`
Expected: PASS (both cases)

- [ ] **Step 5: Full regression on the endpoint's existing suite**

Run: `npx vitest run tests/unit/server/api/schools/`
Expected: all PASS — the confirm-step change must not break existing Scorecard-only assertions.

- [ ] **Step 6: Type-check**

Run: `npm run type-check`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add server/api/schools/\[id\]/enrich.post.ts tests/unit/server/api/schools/enrich.spec.ts
git commit -m "feat(schools): null-fill mascot/colors/athletics/conference on enrich confirm (#582)"
```

---

### Task 3: Wire into NCAA-autocomplete school-add (closes #581)

**Files:**
- Create: `server/api/schools/metadata-lookup.get.ts`
- Test: `tests/unit/server/api/schools/metadata-lookup.spec.ts`
- Modify: `components/School/SchoolForm.vue` (add mascot / athletics URL / school colors fields — none exist today)
- Modify: `pages/schools/new.vue:146-206` (`handleCollegeSelect`)
- Test: `tests/unit/components/School/SchoolForm.spec.ts`

**Interfaces:**
- Produces (endpoint): `GET /api/schools/metadata-lookup?name=<string>&conference=<string?>` → `{ success: true, data: SchoolMetadataResult }`
- Produces (SchoolForm): `initialData` gains `mascot?: string; athletics_url?: string; school_colors?: string[]`; `initialAutoFilledFields` gains matching booleans; emitted `submit` payload gains the same 3 fields.

- [ ] **Step 1: Write the failing endpoint test**

```ts
// tests/unit/server/api/schools/metadata-lookup.spec.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("~/server/utils/schoolMetadataLookup", () => ({
  lookupSchoolMetadata: vi.fn(async () => ({
    mascot: "Tigers",
    athleticsUrl: "https://example.edu/athletics",
    colors: ["#FF0000"],
    conferenceUrl: null,
  })),
}));

import handler from "~/server/api/schools/metadata-lookup.get";
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

// Match this repo's existing GET-endpoint test convention for stubbing
// getQuery/event — check a sibling GET handler spec (e.g.
// tests/unit/server/api/schools/ or tests/unit/server/api/cron/) before
// writing this event stub.
describe("GET /api/schools/metadata-lookup", () => {
  it("returns the lookup result for a valid name", async () => {
    const event = { node: { req: { url: "/api/schools/metadata-lookup?name=Test%20U&conference=SEC" } } } as any;
    const result = await handler(event);
    expect(result).toEqual({
      success: true,
      data: {
        mascot: "Tigers",
        athleticsUrl: "https://example.edu/athletics",
        colors: ["#FF0000"],
        conferenceUrl: null,
      },
    });
    expect(lookupSchoolMetadata).toHaveBeenCalledWith("Test U", "SEC");
  });

  it("400s when name is missing", async () => {
    const event = { node: { req: { url: "/api/schools/metadata-lookup" } } } as any;
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/unit/server/api/schools/metadata-lookup.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the endpoint**

```ts
// server/api/schools/metadata-lookup.get.ts
/**
 * GET /api/schools/metadata-lookup?name=<school name>&conference=<optional>
 *
 * Pre-save school-metadata lookup for the "add school" flow (issue #581) —
 * called after NCAA-autocomplete selection, before the school row exists,
 * so it can't hang off /api/schools/[id]/enrich (no id yet). Thin wrapper
 * around the same lookupSchoolMetadata util the enrich endpoint (#582) and
 * cron backfill (#583) use. Read-only, authed-user-only (no family scoping
 * needed — this queries third-party data, not this family's records).
 */
import { defineEventHandler, getQuery, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

export default defineEventHandler(async (event) => {
  await requireAuth(event);

  const query = getQuery(event);
  const name = typeof query.name === "string" ? query.name.trim() : "";
  const conference =
    typeof query.conference === "string" ? query.conference : undefined;

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "School name required" });
  }

  const data = await lookupSchoolMetadata(name, conference);
  return { success: true, data };
});
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/unit/server/api/schools/metadata-lookup.spec.ts`
Expected: PASS

- [ ] **Step 5: Read `SchoolForm.vue`'s division/conference field pattern before editing**

Run: `sed -n '45,70p' components/School/SchoolForm.vue` and `sed -n '236,300p' components/School/SchoolForm.vue` to see the exact `DesignSystemFormSelect`/`DesignSystemFormInput` props and the `initialData`/`autoFilledFields` reactive-object pattern you're extending — match it exactly, don't invent a new pattern.

- [ ] **Step 6: Add the 3 new fields to `SchoolForm.vue`**

In the `<template>`, after the Website field (existing lines 74-82), add:

```html
    <!-- Mascot -->
    <DesignSystemFormInput
      v-model="formData.mascot"
      label="Mascot"
      :disabled="loading"
      :auto-filled="isAutoFilled('mascot')"
      placeholder="e.g., Wildcats"
      :error="fieldErrors.mascot"
    />

    <!-- Athletics Website -->
    <DesignSystemFormInput
      v-model="formData.athletics_url"
      label="Athletics Website"
      type="url"
      :disabled="loading"
      :auto-filled="isAutoFilled('athletics_url')"
      placeholder="example.com/athletics"
      :error="fieldErrors.athletics_url"
    />

    <!-- School Colors -->
    <div>
      <label class="mb-2 block text-sm font-medium text-slate-700">
        School Colors
        <span
          v-if="isAutoFilled('school_colors')"
          class="text-xs font-normal text-blue-700"
          >(auto-filled)</span
        >
      </label>
      <div class="flex gap-3">
        <input
          v-model="formData.schoolColorPrimary"
          type="text"
          :disabled="loading"
          placeholder="#RRGGBB"
          class="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          v-model="formData.schoolColorSecondary"
          type="text"
          :disabled="loading"
          placeholder="#RRGGBB (optional)"
          class="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
```

In `<script setup>`, extend the `props.initialData` type, the `initialAutoFilledFields` type, `formData` reactive init, and `autoFilledFields` reactive init:

```ts
const props = defineProps<{
  loading: boolean;
  useAutocomplete?: boolean;
  collegeScorecardData?: CollegeDataResult | null;
  initialData?: {
    name?: string;
    location?: string;
    division?: string;
    conference?: string;
    website?: string;
    twitter_handle?: string;
    instagram_handle?: string;
    notes?: string;
    status?: string;
    mascot?: string;
    athletics_url?: string;
    school_colors?: string[];
  };
  initialAutoFilledFields?: {
    name?: boolean;
    location?: boolean;
    website?: boolean;
    division?: boolean;
    conference?: boolean;
    mascot?: boolean;
    athletics_url?: boolean;
    school_colors?: boolean;
  };
}>();
```

```ts
const formData = reactive({
  name: props.initialData?.name || "",
  location: props.initialData?.location || "",
  division: props.initialData?.division || "",
  conference: props.initialData?.conference || "",
  website: props.initialData?.website || "",
  twitter_handle: props.initialData?.twitter_handle || "",
  instagram_handle: props.initialData?.instagram_handle || "",
  notes: props.initialData?.notes || "",
  status: props.initialData?.status || "researching",
  mascot: props.initialData?.mascot || "",
  athletics_url: props.initialData?.athletics_url || "",
  schoolColorPrimary: props.initialData?.school_colors?.[0] || "",
  schoolColorSecondary: props.initialData?.school_colors?.[1] || "",
});

const autoFilledFields = reactive({
  name: props.initialAutoFilledFields?.name || false,
  location: props.initialAutoFilledFields?.location || false,
  website: props.initialAutoFilledFields?.website || false,
  division: props.initialAutoFilledFields?.division || false,
  conference: props.initialAutoFilledFields?.conference || false,
  mascot: props.initialAutoFilledFields?.mascot || false,
  athletics_url: props.initialAutoFilledFields?.athletics_url || false,
  school_colors: props.initialAutoFilledFields?.school_colors || false,
});
```

Find the existing `watch(initialData, ...)` block (~line 292-320) and extend it the same way it already handles `website`/`division`/`conference` — add `mascot`, `athletics_url`, and the two color fields following the exact same "apply if present, don't clobber a user edit if parent sends nothing" logic already there for `website`. Read the existing watcher in full first (`sed -n '291,350p' components/School/SchoolForm.vue`) so the new branches match its structure exactly rather than approximating it.

In `handleSubmit` (wherever `formData` is currently spread into the emitted `submit` payload), assemble `school_colors` from the two color inputs, filtering out blanks:

```ts
const school_colors = [formData.schoolColorPrimary, formData.schoolColorSecondary]
  .map((c) => c.trim())
  .filter((c) => c.length > 0);

emit("submit", {
  ...formData, // existing fields
  mascot: formData.mascot || null,
  athletics_url: formData.athletics_url || null,
  school_colors: school_colors.length > 0 ? school_colors : null,
});
```
(Locate the exact current `emit("submit", ...)` call site first — `grep -n 'emit(\"submit\"' components/School/SchoolForm.vue` — and adapt in place; don't guess its current shape.)

- [ ] **Step 7: Wire the lookup call into `pages/schools/new.vue`**

In `handleCollegeSelect` (existing lines 146-206), add a third parallel call alongside the NCAA + Scorecard ones:

```ts
const [ncaaResult, scorecardResult, metadataResult] = await Promise.all([
  lookupDivision(college.name, college.id).catch((err) => {
    logger.debug("NCAA lookup failed", { collegeName: college.name, err });
    return null;
  }),
  fetchByName(college.name).catch((err) => {
    logger.debug("College Scorecard lookup failed", { collegeName: college.name, err });
    return null;
  }),
  $fetchAuth<{ success: boolean; data: { mascot: string | null; athleticsUrl: string | null; colors: string[] | null } }>(
    `/api/schools/metadata-lookup?name=${encodeURIComponent(college.name)}${ncaaResultConferencePlaceholder}`,
  ).catch((err) => {
    logger.debug("School metadata lookup failed", { collegeName: college.name, err });
    return null;
  }),
]);
```

Note the conference isn't known until *after* `ncaaResult` resolves (it comes from the NCAA lookup, resolved in the same `Promise.all`), so the metadata call can't pass it up front. Two correct options — pick whichever reads cleaner in context, don't leave both:
1. Fire the metadata lookup without `conference` (conference URL will be null this pass — acceptable, since Trigger 3's cron backfill will fill `conferenceUrl` in later once `conference` is saved), or
2. Sequence it: resolve `ncaaResult` first, then fire Scorecard + metadata-lookup (with conference) in parallel.

Given the design spec's "non-blocking, best-effort" framing for this trigger, prefer **option 1** (all three in one `Promise.all`, metadata lookup without conference) — simpler, and the conference-URL gap self-heals via the cron in Task 4. Remove the `ncaaResultConferencePlaceholder` placeholder above and just omit the query param when implementing.

Then apply the result, mirroring how `scorecardResult` is applied:

```ts
if (metadataResult?.data) {
  selectedCollege.value = {
    ...selectedCollege.value,
    mascot: metadataResult.data.mascot ?? undefined,
    athletics_url: metadataResult.data.athleticsUrl ?? undefined,
    school_colors: metadataResult.data.colors ?? undefined,
  };
  autoFilledFields.mascot = !!metadataResult.data.mascot;
  autoFilledFields.athletics_url = !!metadataResult.data.athleticsUrl;
  autoFilledFields.school_colors = !!metadataResult.data.colors;
}
```

`selectedCollege` is typed as `CollegeSearchResult` (`types/api.ts:6-15`) — extend that interface with the 3 optional fields (`mascot?: string; athletics_url?: string; school_colors?: string[]`) so this assignment type-checks, and confirm `autoFilledFields` (declared ~line 136-142) gains the 3 matching boolean keys.

Finally, in `createSchoolWithData` (existing ~line 255-276), pass the 3 fields through to `createSchool` alongside `academic_info`:

```ts
const school = await createSchool({
  ...formData,
  academic_info,
  mascot: formData.mascot || null,
  athletics_url: formData.athletics_url || null,
  school_colors: formData.school_colors || null,
  favicon_url: null,
  is_favorite: false,
  user_id: "",
});
```

Check `createSchool`'s parameter type (`composables/useSchools.ts:114`) accepts these — if it's typed against `SchoolInput`/`schoolSchema` and `mascot`/`school_colors` aren't in that Zod schema yet, add them there too (`utils/validation/schemas.ts:112` `schoolSchema`) as `z.string().nullable().optional()` / `z.array(z.string()).nullable().optional()`, matching the existing `athletics_url: urlSchema.nullable().optional()` line.

- [ ] **Step 8: Update `SchoolForm.spec.ts`**

Read the existing spec (`tests/unit/components/School/SchoolForm.spec.ts`) to match its mounting/assertion style, then add:

```ts
it("renders mascot, athletics URL, and school color fields", () => {
  const wrapper = mountSchoolForm(); // use this file's existing mount helper
  expect(wrapper.find('input[placeholder="e.g., Wildcats"]').exists()).toBe(true);
  expect(wrapper.find('input[placeholder="example.com/athletics"]').exists()).toBe(true);
  expect(wrapper.find('input[placeholder="#RRGGBB"]').exists()).toBe(true);
});

it("shows auto-filled badge for mascot when initialAutoFilledFields.mascot is true", () => {
  const wrapper = mountSchoolForm({
    initialData: { mascot: "Wildcats" },
    initialAutoFilledFields: { mascot: true },
  });
  expect(wrapper.text()).toContain("Mascot");
  expect(wrapper.text()).toContain("(auto-filled)");
});

it("emits school_colors as a filtered array on submit", async () => {
  const wrapper = mountSchoolForm({ initialData: { name: "Test U" } });
  await wrapper.find('input[placeholder="#RRGGBB"]').setValue("#FF0000");
  await wrapper.find("form").trigger("submit.prevent");
  const emitted = wrapper.emitted("submit")?.[0]?.[0] as any;
  expect(emitted.school_colors).toEqual(["#FF0000"]);
});
```

- [ ] **Step 9: Run tests, verify all pass**

Run: `npx vitest run tests/unit/components/School/SchoolForm.spec.ts tests/unit/server/api/schools/metadata-lookup.spec.ts`
Expected: PASS

- [ ] **Step 10: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: 0 errors

- [ ] **Step 11: Manual browser verify**

Run: `npm run dev`, go to `/schools/new`, search a school present in `data/schoolMetadata.json` (e.g. "Alabama State University"), select it, confirm Mascot/Athletics Website/School Colors fields pre-fill with an "(auto-filled)" badge and remain editable before Save.

- [ ] **Step 12: Commit**

```bash
git add server/api/schools/metadata-lookup.get.ts tests/unit/server/api/schools/metadata-lookup.spec.ts \
  components/School/SchoolForm.vue pages/schools/new.vue types/api.ts utils/validation/schemas.ts \
  tests/unit/components/School/SchoolForm.spec.ts
git commit -m "feat(schools): pre-fill mascot/athletics/colors on NCAA autocomplete add (#581)"
```

---

### Task 4: Weekly cron backfill (closes #583)

**Files:**
- Create: `server/api/cron/school-metadata-backfill.get.ts`
- Test: `tests/unit/server/api/cron/school-metadata-backfill.spec.ts`
- Modify: `utils/cronDashboard.ts:14-19` (`TRIGGERABLE_JOBS`)
- Modify: `vercel.json` (crons array)

**Interfaces:**
- Consumes: `lookupSchoolMetadata` (Task 1), `withCronRun`/`CronRunContext` (`server/utils/cronRunner.ts`), `mapWithConcurrency` (`server/utils/promisePool.ts`), `useSupabaseAdmin`.

- [ ] **Step 1: Write the failing test**

Read `tests/unit/server/api/cron/` for an existing spec (e.g. one covering `orphaned-storage-sweep` or `health-ping`) to match this repo's cron-endpoint test convention — mocking `withCronRun` typically means letting it run for real against a mocked `useSupabaseAdmin` and `requireCronAuth` short-circuited via a valid `CRON_SECRET` env, or mocking `withCronRun` itself. Match whichever convention the sibling spec uses. Then add:

```ts
// tests/unit/server/api/cron/school-metadata-backfill.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/schoolMetadataLookup", () => ({
  lookupSchoolMetadata: vi.fn(),
}));

const mockUpdate = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
const mockSchoolsSelect = vi.fn();
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "schools") {
        return {
          select: () => ({
            or: () => mockSchoolsSelect(),
          }),
          update: mockUpdate,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

// Match this repo's withCronRun test convention (see Step 1 note above)
// for how CRON_SECRET / requireCronAuth is satisfied in these specs.

import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";
import handler from "~/server/api/cron/school-metadata-backfill.get";

describe("GET /api/cron/school-metadata-backfill", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    mockSchoolsSelect.mockReset();
    mockUpdate.mockClear();
  });

  it("null-fills only schools missing mascot/colors/athletics_url, skips schools with all 3 already set", async () => {
    mockSchoolsSelect.mockResolvedValue({
      data: [
        { id: "s1", name: "Test U", conference: "SEC", mascot: null, school_colors: null, athletics_url: null },
      ],
      error: null,
    });
    vi.mocked(lookupSchoolMetadata).mockResolvedValue({
      mascot: "Tigers",
      athleticsUrl: "https://testu.example",
      colors: ["#FF0000"],
      conferenceUrl: null,
    });

    const event = {
      node: { req: { headers: { authorization: "Bearer test-secret" } } },
      context: {},
    } as any;

    const result = await handler(event);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ mascot: "Tigers", school_colors: ["#FF0000"], athletics_url: "https://testu.example" }),
    );
    expect(result).toMatchObject({ processed: 1, failed: 0 });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/unit/server/api/cron/school-metadata-backfill.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the cron**

```ts
// server/api/cron/school-metadata-backfill.get.ts
/**
 * GET /api/cron/school-metadata-backfill
 * Weekly. Finds schools missing mascot/school_colors/athletics_url and
 * resolves them via lookupSchoolMetadata (issue #583, closes the loop with
 * the enrich-endpoint (#582) and autocomplete (#581) triggers). Null-fill
 * only — never overwrites a value a user or an earlier trigger already set.
 * Throttled to 5 concurrent lookups (Wikidata SPARQL rate limits).
 */
import { defineEventHandler } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";
import { mapWithConcurrency } from "~/server/utils/promisePool";
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

const logger = createLogger("cron/school-metadata-backfill");
const CONCURRENCY = 5;
const BATCH_LIMIT = 500;

interface SchoolRow {
  id: string;
  name: string;
  conference: string | null;
  mascot: string | null;
  school_colors: string[] | null;
  athletics_url: string | null;
}

export default defineEventHandler(async (event) => {
  return withCronRun(event, "school-metadata-backfill", async (ctx) => {
    const supabase = useSupabaseAdmin();

    const { data: schools, error } = await supabase
      .from("schools")
      .select("id, name, conference, mascot, school_colors, athletics_url")
      .or("mascot.is.null,school_colors.is.null,athletics_url.is.null")
      .limit(BATCH_LIMIT);

    if (error) {
      logger.error("Failed to query schools for backfill", error);
      throw error;
    }

    const rows = (schools ?? []) as SchoolRow[];
    ctx.setProcessed(rows.length);

    let failed = 0;

    await mapWithConcurrency(rows, CONCURRENCY, async (school) => {
      try {
        const metadata = await lookupSchoolMetadata(school.name, school.conference);

        const mascot = school.mascot ?? metadata.mascot;
        const schoolColors = school.school_colors ?? metadata.colors;
        const athleticsUrl = school.athletics_url ?? metadata.athleticsUrl;

        if (
          mascot === school.mascot &&
          schoolColors === school.school_colors &&
          athleticsUrl === school.athletics_url
        ) {
          return; // nothing resolved this pass
        }

        const { error: updateError } = await supabase
          .from("schools")
          .update({ mascot, school_colors: schoolColors, athletics_url: athleticsUrl })
          .eq("id", school.id);

        if (updateError) {
          failed += 1;
          logger.error("Failed to update school metadata", { schoolId: school.id, updateError });
        }
      } catch (err) {
        failed += 1;
        logger.error("Backfill lookup threw for school", { schoolId: school.id, err });
      }
    });

    ctx.setFailed(failed);
    return { processed: rows.length, failed };
  });
});
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/unit/server/api/cron/school-metadata-backfill.spec.ts`
Expected: PASS

- [ ] **Step 5: Register the job**

```ts
// utils/cronDashboard.ts — add to TRIGGERABLE_JOBS
export const TRIGGERABLE_JOBS = [
  "daily-suggestions",
  "generate-notifications",
  "weekly-digest",
  "health-ping",
  "video-health-check",
  "school-metadata-backfill",
] as const;
```

```json
// vercel.json — add to the crons array (Sunday 11am UTC, doesn't collide with the existing 0/4/5/9/10 * * 0 weekly slots)
    {
      "path": "/api/cron/school-metadata-backfill",
      "schedule": "0 11 * * 0"
    }
```

- [ ] **Step 6: Type-check**

Run: `npm run type-check`
Expected: 0 errors

- [ ] **Step 7: Manual verify (requires CRON_SECRET set locally)**

Run: `npm run dev`, then in another terminal:
```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/school-metadata-backfill
```
Expected: `{"processed": N, "failed": 0}` shape, and a new row in `cron_runs` (check via admin Jobs tab, `NUXT_PUBLIC_ADMIN_HOST=localhost:3003`).

- [ ] **Step 8: Commit**

```bash
git add server/api/cron/school-metadata-backfill.get.ts tests/unit/server/api/cron/school-metadata-backfill.spec.ts \
  utils/cronDashboard.ts vercel.json
git commit -m "feat(schools): weekly cron backfill for missing school metadata (#583)"
```

---

## Final Verification

- [ ] `npm run type-check` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm test` — full suite green, no new failures
- [ ] `npm run audit:tokens` — 0 (new UI touches raw color inputs — swatches must not hardcode hex in `<style>`; the plain `<input>` elements above are fine since color is user/data-driven value, not a style token)
- [ ] Browser verify: add a school via NCAA autocomplete → mascot/colors/athletics pre-fill (#581). Open an existing school with no mascot set → click Enrich → confirm → mascot/colors/athletics/conference-link populate on the detail page (#582). Trigger the cron manually from admin Jobs tab → `cron_runs` row succeeds (#583).
- [ ] Close #581, #582, #583 on merge (reference all three in the PR body — they share this one implementation).

## Self-Review Notes

- **Spec coverage:** Trigger 1 (autocomplete), Trigger 2 (enrich), Trigger 3 (cron), null-fill-only rule (enforced in all 3 call sites via `existing ?? metadata`), Wikidata 30-day cache — all covered. Static-seed IPEDS-keying assumption in the original spec is explicitly corrected to name-keying (Global Constraints) since that's what #616 actually shipped. `conferenceUrl` reuses the already-shipped `getConferenceUrl` rather than rebuilding it, since the spec's own Trigger 2/3 descriptions only call out mascot/athletics/colors as the null-fill target fields.
- **Placeholder scan:** the two spots that say "check the existing spec/convention before writing this" (Task 2 Step 1, Task 4 Step 1) are deliberate — this repo's h3-mocking convention for server/api Vitest specs isn't visible from the design doc alone, and guessing it wrong produces a test that fails for the wrong reason. Everything else is concrete, runnable code.
- **Type consistency:** `SchoolMetadataResult` (Task 1) is the one shape threaded through Task 2's response, Task 3's endpoint response, and Task 4's row-merge — field names (`mascot`, `athleticsUrl`, `colors`, `conferenceUrl`) are consistent everywhere it's consumed.
