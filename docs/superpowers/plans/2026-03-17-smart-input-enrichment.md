# Smart Input Enrichment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text high school, address, and social handle inputs on player profiles with autocomplete-backed inputs that store canonical IDs and coordinates for future social proof and reporting features.

**Architecture:** A new `nces_schools` Supabase table (seeded once from NCES CCD) backs a Nitro high-school-search endpoint. Radar.io provides address autocomplete via a server-side proxy route. Two new composables (`useHighSchoolSearch`, `useAddressAutocomplete`) drive two new `components/shared/` components. Social handle normalization is a pure utility applied `onBlur`. Existing `pages/settings/player-details.vue` and `pages/settings/location.vue` are wired to use the new components.

**Tech Stack:** Nuxt 3 / Vue 3 / TypeScript, Supabase (Postgres + pg_trgm), Upstash Redis (existing), Radar.io autocomplete API, Vitest unit tests, Playwright E2E

**Spec:** `docs/superpowers/specs/2026-03-17-smart-input-enrichment-design.md`

---

## File Map

**New files:**
- `supabase/migrations/20260318000000_nces_schools.sql` — creates table + indexes
- `scripts/seed-nces-schools.ts` — one-time NCES CCD CSV → Supabase bulk upsert
- `utils/social.ts` — `normalizeHandle(value, platform)` pure utility
- `server/api/schools/high-school-search.get.ts` — ILIKE search on nces_schools, Redis cached
- `server/api/address/autocomplete.get.ts` — Radar.io proxy, returns shaped HomeLocation suggestions
- `composables/useHighSchoolSearch.ts` — debounced composable wrapping the school search API
- `composables/useAddressAutocomplete.ts` — debounced composable wrapping the address autocomplete API
- `components/shared/HighSchoolSearchInput.vue` — typeahead input with escape hatch
- `components/shared/AddressAutocompleteInput.vue` — address input that auto-fills all 6 fields
- `tests/unit/utils/social.test.ts`
- `tests/unit/server/api/schools-high-school-search.spec.ts`
- `tests/unit/server/api/address-autocomplete.spec.ts`
- `tests/unit/composables/useHighSchoolSearch.test.ts`
- `tests/unit/composables/useAddressAutocomplete.test.ts`
- `tests/e2e/smart-inputs.spec.ts`

**Modified files:**
- `types/models.ts` — add `nces_school_id?: string` to `PlayerDetails` interface
- `server/utils/redis.ts` — add `NCES_SEARCH` cache key to `CACHE_KEYS`
- `nuxt.config.ts` — add `radarApiKey` to `runtimeConfig`
- `pages/settings/player-details.vue` — replace `high_school` text input with `HighSchoolSearchInput`; wire social `onBlur` normalization
- `pages/settings/location.vue` — replace manual address entry + geocode button with `AddressAutocompleteInput`

---

## Task 1: DB Migration — nces_schools table

**Files:**
- Create: `supabase/migrations/20260318000000_nces_schools.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260318000000_nces_schools.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS nces_schools (
  nces_id    text PRIMARY KEY,
  name       text NOT NULL,
  city       text,
  state      char(2),
  zip        text,
  latitude   numeric,
  longitude  numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nces_schools_name_trgm
  ON nces_schools USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS nces_schools_state_idx
  ON nces_schools (state);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies cleanly, `nces_schools` table visible in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260318000000_nces_schools.sql
git commit -m "chore: add nces_schools table migration"
```

---

## Task 2: Types + Config Updates

**Files:**
- Modify: `types/models.ts`
- Modify: `server/utils/redis.ts`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Add `nces_school_id` to `PlayerDetails`**

In `types/models.ts`, find the `PlayerDetails` interface (around line 363). Add after `high_school`:

```typescript
high_school?: string;
nces_school_id?: string;  // NCES school identifier; null if free-text entry was used
```

- [ ] **Step 2: Add NCES cache key to Redis utils**

In `server/utils/redis.ts`, add to the `CACHE_KEYS` object:

```typescript
export const CACHE_KEYS = {
  COLLEGE_SEARCH: (query: string) => `college:search:${query.toLowerCase().trim()}`,
  COLLEGE_ID: (id: string) => `college:id:${id}`,
  NCAA_METADATA: "ncaa:metadata:all",
  NCES_SEARCH: (q: string, state: string) =>
    `nces:search:${q.toLowerCase().trim()}:${state.toLowerCase()}`,
} as const;
```

- [ ] **Step 3: Add `radarApiKey` to runtimeConfig**

In `nuxt.config.ts`, add to the existing `runtimeConfig` block (alongside `collegeScorecardApiKey`):

```typescript
runtimeConfig: {
  adminTokenSecret: process.env.NUXT_ADMIN_TOKEN_SECRET || "",
  collegeScorecardApiKey: process.env.NUXT_COLLEGE_SCORECARD_API_KEY || "",
  radarApiKey: process.env.NUXT_RADAR_API_KEY || "",  // ADD THIS
  public: { ... }
}
```

- [ ] **Step 4: Add env var to `.env.local`**

```bash
# Add to .env.local
NUXT_RADAR_API_KEY=your_radar_publishable_key_here
```

Get the key from radar.com → Dashboard → API Keys → use the **secret** key (not the publishable one — we proxy server-side).

- [ ] **Step 5: Commit**

```bash
git add types/models.ts server/utils/redis.ts nuxt.config.ts
git commit -m "chore: add nces_school_id type, radar api key config, nces redis cache key"
```

---

## Task 3: `utils/social.ts` — normalizeHandle

**Files:**
- Create: `utils/social.ts`
- Create: `tests/unit/utils/social.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/utils/social.test.ts
import { describe, it, expect } from "vitest";
import { normalizeHandle } from "~/utils/social";

describe("normalizeHandle", () => {
  describe("twitter", () => {
    it("strips @ prefix", () => {
      expect(normalizeHandle("@CoachSmith", "twitter")).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
    it("strips twitter.com/ prefix", () => {
      expect(normalizeHandle("twitter.com/CoachSmith", "twitter")).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
    it("strips https://twitter.com/ prefix", () => {
      expect(normalizeHandle("https://twitter.com/CoachSmith", "twitter")).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
    it("strips x.com/ prefix", () => {
      expect(normalizeHandle("x.com/CoachSmith", "twitter")).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
    it("strips https://x.com/ prefix", () => {
      expect(normalizeHandle("https://x.com/CoachSmith", "twitter")).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
    it("returns bare handle unchanged", () => {
      expect(normalizeHandle("CoachSmith", "twitter")).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
    it("handles trailing slash", () => {
      expect(normalizeHandle("twitter.com/CoachSmith/", "twitter")).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
    it("handles empty string", () => {
      expect(normalizeHandle("", "twitter")).toEqual({ handle: "", isShortUrl: false });
    });
    it("trims whitespace", () => {
      expect(normalizeHandle("  @CoachSmith  ", "twitter")).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
  });

  describe("instagram", () => {
    it("strips @ prefix", () => {
      expect(normalizeHandle("@athlete.23", "instagram")).toEqual({ handle: "athlete.23", isShortUrl: false });
    });
    it("strips instagram.com/ prefix", () => {
      expect(normalizeHandle("instagram.com/athlete.23", "instagram")).toEqual({ handle: "athlete.23", isShortUrl: false });
    });
    it("strips https://instagram.com/ prefix with trailing slash", () => {
      expect(normalizeHandle("https://instagram.com/athlete.23/", "instagram")).toEqual({ handle: "athlete.23", isShortUrl: false });
    });
    it("strips www.instagram.com/ prefix", () => {
      expect(normalizeHandle("www.instagram.com/athlete.23", "instagram")).toEqual({ handle: "athlete.23", isShortUrl: false });
    });
  });

  describe("tiktok", () => {
    it("strips @ prefix", () => {
      expect(normalizeHandle("@athlete_23", "tiktok")).toEqual({ handle: "athlete_23", isShortUrl: false });
    });
    it("strips tiktok.com/@ prefix", () => {
      expect(normalizeHandle("tiktok.com/@athlete_23", "tiktok")).toEqual({ handle: "athlete_23", isShortUrl: false });
    });
    it("strips https://www.tiktok.com/@ prefix", () => {
      expect(normalizeHandle("https://www.tiktok.com/@athlete_23", "tiktok")).toEqual({ handle: "athlete_23", isShortUrl: false });
    });
    it("flags vm.tiktok.com short URL", () => {
      expect(normalizeHandle("vm.tiktok.com/abc123", "tiktok")).toEqual({ handle: "vm.tiktok.com/abc123", isShortUrl: true });
    });
    it("flags vt.tiktok.com short URL", () => {
      expect(normalizeHandle("vt.tiktok.com/abc123", "tiktok")).toEqual({ handle: "vt.tiktok.com/abc123", isShortUrl: true });
    });
    it("flags https://vm.tiktok.com short URL", () => {
      expect(normalizeHandle("https://vm.tiktok.com/abc123", "tiktok")).toEqual({ handle: "vm.tiktok.com/abc123", isShortUrl: true });
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- tests/unit/utils/social.test.ts
```

Expected: All tests FAIL with "Cannot find module '~/utils/social'"

- [ ] **Step 3: Implement `normalizeHandle`**

```typescript
// utils/social.ts

export type SocialPlatform = "twitter" | "instagram" | "tiktok";

export interface NormalizeHandleResult {
  handle: string;
  isShortUrl: boolean;
}

const SHORT_URL_PATTERNS = /^(https?:\/\/)?(vm|vt)\.tiktok\.com\//;

const URL_PREFIXES: Record<SocialPlatform, RegExp[]> = {
  twitter: [
    /^https?:\/\/(www\.)?x\.com\//,
    /^https?:\/\/(www\.)?twitter\.com\//,
    /^(www\.)?x\.com\//,
    /^(www\.)?twitter\.com\//,
  ],
  instagram: [
    /^https?:\/\/(www\.)?instagram\.com\//,
    /^(www\.)?instagram\.com\//,
  ],
  tiktok: [
    /^https?:\/\/(www\.)?tiktok\.com\/@?/,
    /^(www\.)?tiktok\.com\/@?/,
  ],
};

export function normalizeHandle(
  value: string,
  platform: SocialPlatform,
): NormalizeHandleResult {
  const trimmed = value.trim();
  if (!trimmed) return { handle: "", isShortUrl: false };

  // Check for short URLs first (before any other processing)
  if (platform === "tiktok" && SHORT_URL_PATTERNS.test(trimmed)) {
    const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
    return { handle: withoutProtocol, isShortUrl: true };
  }

  // Strip known URL prefixes
  let handle = trimmed;
  for (const pattern of URL_PREFIXES[platform]) {
    if (pattern.test(handle)) {
      handle = handle.replace(pattern, "");
      break;
    }
  }

  // Strip @ prefix and trailing slashes/query strings
  handle = handle.replace(/^@/, "").replace(/[/?#].*$/, "").trim();

  return { handle, isShortUrl: false };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- tests/unit/utils/social.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add utils/social.ts tests/unit/utils/social.test.ts
git commit -m "feat: add normalizeHandle utility for social media handles"
```

---

## Task 4: `server/api/schools/high-school-search.get.ts`

**Files:**
- Create: `server/api/schools/high-school-search.get.ts`
- Create: `tests/unit/server/api/schools-high-school-search.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/server/api/schools-high-school-search.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getQuery: vi.fn(),
    createError: vi.fn((opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    }),
    defineEventHandler: vi.fn((handler: (event: unknown) => unknown) => handler),
  };
});

const mockSchools = [
  { nces_id: "100001", name: "Lincoln High School", city: "Des Moines", state: "IA" },
  { nces_id: "100002", name: "Lincoln-Way East High School", city: "Frankfort", state: "IL" },
];

const mockSelect = vi.fn();
const mockIlike = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("~/server/utils/redis", () => ({
  redis: null,
  CACHE_KEYS: { NCES_SEARCH: (q: string, s: string) => `nces:search:${q}:${s}` },
  TTL: { ONE_HOUR: 3600 },
}));

const mockEvent = { context: {}, node: { req: { headers: {} }, res: {} } } as never;

import { getQuery, createError } from "h3";

describe("GET /api/schools/high-school-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({ data: mockSchools, error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockIlike.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ ilike: mockIlike });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("returns [] when q is missing", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("returns [] when q is empty string", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "" });
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("throws 400 when q is 1 character", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "L" });
    vi.mocked(createError).mockImplementation((opts) => {
      const err = new Error(opts.statusMessage!) as any;
      err.statusCode = opts.statusCode;
      return err;
    });
    const handler = await import("~/server/api/schools/high-school-search.get");
    await expect(handler.default(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns schools matching query", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "Lincoln" });
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual(mockSchools);
    expect(mockIlike).toHaveBeenCalledWith("name", "%Lincoln%");
  });

  it("returns [] for query with no results", async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    vi.mocked(getQuery).mockReturnValue({ q: "xqzpwv" });
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("applies state ordering when state param provided", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "Lincoln", state: "OH" });
    const handler = await import("~/server/api/schools/high-school-search.get");
    await handler.default(mockEvent);
    expect(mockOrder).toHaveBeenCalledWith(
      expect.stringContaining("state"),
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- tests/unit/server/api/schools-high-school-search.spec.ts
```

Expected: FAIL with import errors.

- [ ] **Step 3: Implement the route**

```typescript
// server/api/schools/high-school-search.get.ts
import { defineEventHandler, getQuery, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { redis, CACHE_KEYS, TTL } from "~/server/utils/redis";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "schools/high-school-search");
  const { q, state } = getQuery(event);

  const query = String(q ?? "").trim();
  const stateParam = String(state ?? "").trim().toUpperCase();

  if (!query) return [];

  if (query.length < 2) {
    throw createError({ statusCode: 400, statusMessage: "q must be at least 2 characters" });
  }

  // Redis cache check
  const cacheKey = CACHE_KEYS.NCES_SEARCH(query, stateParam);
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return cached;
    } catch (err) {
      logger.warn("Redis cache read failed", err);
    }
  }

  const supabase = useSupabaseAdmin();
  let dbQuery = supabase
    .from("nces_schools")
    .select("nces_id, name, city, state")
    .ilike("name", `%${query}%`);

  // State bias: same-state results first, without filtering others
  if (stateParam) {
    dbQuery = dbQuery.order(`state.eq.${stateParam}`, { ascending: false }).order("name", { ascending: true });
  } else {
    dbQuery = dbQuery.order("name", { ascending: true });
  }

  const { data, error } = await dbQuery.limit(8);

  if (error) {
    logger.error("nces_schools query failed", error);
    return [];
  }

  const results = data ?? [];

  // Cache the result
  if (redis && results.length > 0) {
    try {
      await redis.set(cacheKey, results, { ex: TTL.ONE_HOUR });
    } catch (err) {
      logger.warn("Redis cache write failed", err);
    }
  }

  return results;
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- tests/unit/server/api/schools-high-school-search.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/schools/high-school-search.get.ts tests/unit/server/api/schools-high-school-search.spec.ts
git commit -m "feat: add high-school-search API route with NCES lookup and Redis caching"
```

---

## Task 5: `server/api/address/autocomplete.get.ts`

**Files:**
- Create: `server/api/address/autocomplete.get.ts`
- Create: `tests/unit/server/api/address-autocomplete.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/server/api/address-autocomplete.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getQuery: vi.fn(),
    defineEventHandler: vi.fn((handler: (event: unknown) => unknown) => handler),
  };
});

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);
vi.stubGlobal("useRuntimeConfig", () => ({ radarApiKey: "test-radar-key" }));

const mockEvent = { context: {}, node: { req: { headers: {} }, res: {} } } as never;

import { getQuery } from "h3";

const radarResponse = {
  addresses: [
    {
      formattedAddress: "1428 Elm Street, Springfield, IL 62701",
      addressLabel: "1428 Elm Street",
      city: "Springfield",
      stateCode: "IL",
      postalCode: "62701",
      latitude: 39.8,
      longitude: -89.64,
    },
  ],
};

describe("GET /api/address/autocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("useRuntimeConfig", () => ({ radarApiKey: "test-radar-key" }));
  });

  it("returns [] when q is missing", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns [] when q is shorter than 3 chars", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "El" });
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls Radar API with correct params and returns shaped results", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    mockFetch.mockResolvedValue(radarResponse);
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.radar.io/v1/autocomplete",
      expect.objectContaining({ params: expect.objectContaining({ country: "US" }) })
    );
    expect(result).toEqual([{
      label: "1428 Elm Street, Springfield, IL 62701",
      address: "1428 Elm Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      latitude: 39.8,
      longitude: -89.64,
    }]);
  });

  it("returns [] gracefully when Radar throws (401, 429, network error)", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    mockFetch.mockRejectedValue(new Error("401 Unauthorized"));
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("returns [] when radarApiKey is not configured", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ radarApiKey: "" }));
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- tests/unit/server/api/address-autocomplete.spec.ts
```

Expected: FAIL with import errors.

- [ ] **Step 3: Implement the route**

```typescript
// server/api/address/autocomplete.get.ts
import { defineEventHandler, getQuery } from "h3";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "address/autocomplete");
  const { q } = getQuery(event);
  const query = String(q ?? "").trim();

  if (query.length < 3) return [];

  const config = useRuntimeConfig();
  if (!config.radarApiKey) {
    logger.error("NUXT_RADAR_API_KEY is not configured");
    return [];
  }

  try {
    const res = await $fetch<{ addresses: RadarAddress[] }>(
      "https://api.radar.io/v1/autocomplete",
      {
        headers: { Authorization: config.radarApiKey },
        params: { query, country: "US", limit: 5 },
      }
    );

    return (res.addresses ?? []).map((a) => ({
      label: a.formattedAddress,
      address: a.addressLabel,
      city: a.city,
      state: a.stateCode,
      zip: a.postalCode,
      latitude: a.latitude,
      longitude: a.longitude,
    }));
  } catch (err) {
    logger.error("Radar.io autocomplete failed", err);
    return [];
  }
});

interface RadarAddress {
  formattedAddress: string;
  addressLabel: string;
  city: string;
  stateCode: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- tests/unit/server/api/address-autocomplete.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/address/autocomplete.get.ts tests/unit/server/api/address-autocomplete.spec.ts
git commit -m "feat: add address autocomplete API route (Radar.io proxy)"
```

---

## Task 6: `useHighSchoolSearch` composable

**Files:**
- Create: `composables/useHighSchoolSearch.ts`
- Create: `tests/unit/composables/useHighSchoolSearch.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/composables/useHighSchoolSearch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

describe("useHighSchoolSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty results initially", async () => {
    const { useHighSchoolSearch } = await import("~/composables/useHighSchoolSearch");
    const { results, loading } = useHighSchoolSearch();
    expect(results.value).toEqual([]);
    expect(loading.value).toBe(false);
  });

  it("does not search for queries shorter than 2 chars", async () => {
    const { useHighSchoolSearch } = await import("~/composables/useHighSchoolSearch");
    const { search } = useHighSchoolSearch();
    await search("L");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("searches and returns results", async () => {
    const schools = [{ nces_id: "1", name: "Lincoln High School", city: "Des Moines", state: "IA" }];
    mockFetch.mockResolvedValue(schools);
    const { useHighSchoolSearch } = await import("~/composables/useHighSchoolSearch");
    const { search, results } = useHighSchoolSearch();
    await search("Lincoln");
    expect(results.value).toEqual(schools);
  });

  it("selectSchool returns name and nces_school_id", async () => {
    const { useHighSchoolSearch } = await import("~/composables/useHighSchoolSearch");
    const { selectSchool } = useHighSchoolSearch();
    const result = selectSchool({ nces_id: "100001", name: "Lincoln High School", city: "Des Moines", state: "IA" });
    expect(result).toEqual({ name: "Lincoln High School", nces_school_id: "100001" });
  });

  it("sets loading to true during search", async () => {
    let resolveFetch!: (v: unknown) => void;
    mockFetch.mockReturnValue(new Promise((r) => { resolveFetch = r; }));
    const { useHighSchoolSearch } = await import("~/composables/useHighSchoolSearch");
    const { search, loading } = useHighSchoolSearch();
    const searchPromise = search("Lincoln");
    await nextTick();
    expect(loading.value).toBe(true);
    resolveFetch([]);
    await searchPromise;
    expect(loading.value).toBe(false);
  });

  it("clears results on empty search", async () => {
    mockFetch.mockResolvedValue([{ nces_id: "1", name: "Lincoln", city: "X", state: "IA" }]);
    const { useHighSchoolSearch } = await import("~/composables/useHighSchoolSearch");
    const { search, results } = useHighSchoolSearch();
    await search("Lincoln");
    expect(results.value).toHaveLength(1);
    await search("");
    expect(results.value).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- tests/unit/composables/useHighSchoolSearch.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the composable**

```typescript
// composables/useHighSchoolSearch.ts
import { ref } from "vue";
import { debounce } from "~/utils/debounce";

export interface NcesSchool {
  nces_id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export interface HighSchoolSelection {
  name: string;
  nces_school_id: string | null;
}

export const useHighSchoolSearch = (stateHint?: string) => {
  const results = ref<NcesSchool[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const _doSearch = async (q: string) => {
    if (!q || q.trim().length < 2) {
      results.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (stateHint) params.set("state", stateHint);
      results.value = await $fetch<NcesSchool[]>(
        `/api/schools/high-school-search?${params.toString()}`
      );
    } catch (err) {
      error.value = "School search unavailable";
      results.value = [];
    } finally {
      loading.value = false;
    }
  };

  const search = debounce(_doSearch, 300);

  const selectSchool = (school: NcesSchool): HighSchoolSelection => ({
    name: school.name,
    nces_school_id: school.nces_id,
  });

  const clearResults = () => { results.value = []; };

  return { results, loading, error, search, selectSchool, clearResults };
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- tests/unit/composables/useHighSchoolSearch.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add composables/useHighSchoolSearch.ts tests/unit/composables/useHighSchoolSearch.test.ts
git commit -m "feat: add useHighSchoolSearch composable"
```

---

## Task 7: `useAddressAutocomplete` composable

**Files:**
- Create: `composables/useAddressAutocomplete.ts`
- Create: `tests/unit/composables/useAddressAutocomplete.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/composables/useAddressAutocomplete.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

const suggestion = {
  label: "1428 Elm Street, Springfield, IL 62701",
  address: "1428 Elm Street",
  city: "Springfield",
  state: "IL",
  zip: "62701",
  latitude: 39.8,
  longitude: -89.64,
};

describe("useAddressAutocomplete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty suggestions initially", async () => {
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { suggestions } = useAddressAutocomplete();
    expect(suggestions.value).toEqual([]);
  });

  it("does not search for queries shorter than 3 chars", async () => {
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { search } = useAddressAutocomplete();
    await search("El");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches suggestions for queries of 3+ chars", async () => {
    mockFetch.mockResolvedValue([suggestion]);
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { search, suggestions } = useAddressAutocomplete();
    await search("1428");
    expect(suggestions.value).toEqual([suggestion]);
  });

  it("selectSuggestion returns full HomeLocation with lat/lng", async () => {
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { selectSuggestion } = useAddressAutocomplete();
    const loc = selectSuggestion(suggestion);
    expect(loc).toEqual({
      address: "1428 Elm Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      latitude: 39.8,
      longitude: -89.64,
    });
  });

  it("returns empty suggestions on API error (graceful fallback)", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { search, suggestions } = useAddressAutocomplete();
    await search("1428 Elm");
    expect(suggestions.value).toEqual([]);
  });

  it("clears suggestions on empty query", async () => {
    mockFetch.mockResolvedValue([suggestion]);
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { search, suggestions } = useAddressAutocomplete();
    await search("1428");
    expect(suggestions.value).toHaveLength(1);
    await search("");
    expect(suggestions.value).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- tests/unit/composables/useAddressAutocomplete.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the composable**

```typescript
// composables/useAddressAutocomplete.ts
import { ref } from "vue";
import { debounce } from "~/utils/debounce";
import type { HomeLocation } from "~/types/models";

export interface AddressSuggestion {
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
}

export const useAddressAutocomplete = () => {
  const suggestions = ref<AddressSuggestion[]>([]);
  const loading = ref(false);

  const _doSearch = async (q: string) => {
    if (!q || q.trim().length < 3) {
      suggestions.value = [];
      return;
    }
    loading.value = true;
    try {
      suggestions.value = await $fetch<AddressSuggestion[]>(
        `/api/address/autocomplete?q=${encodeURIComponent(q.trim())}`
      );
    } catch {
      suggestions.value = [];
    } finally {
      loading.value = false;
    }
  };

  const search = debounce(_doSearch, 300);

  const selectSuggestion = (s: AddressSuggestion): HomeLocation => ({
    address: s.address,
    city: s.city,
    state: s.state,
    zip: s.zip,
    latitude: s.latitude,
    longitude: s.longitude,
  });

  const clearSuggestions = () => { suggestions.value = []; };

  return { suggestions, loading, search, selectSuggestion, clearSuggestions };
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- tests/unit/composables/useAddressAutocomplete.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add composables/useAddressAutocomplete.ts tests/unit/composables/useAddressAutocomplete.test.ts
git commit -m "feat: add useAddressAutocomplete composable"
```

---

## Task 8: `HighSchoolSearchInput.vue` component

**Files:**
- Create: `components/shared/HighSchoolSearchInput.vue`

- [ ] **Step 1: Build the component**

```vue
<!-- components/shared/HighSchoolSearchInput.vue -->
<script setup lang="ts">
import { ref, watch } from "vue";
import { useHighSchoolSearch, type NcesSchool, type HighSchoolSelection } from "~/composables/useHighSchoolSearch";

const props = withDefaults(defineProps<{
  modelValue: HighSchoolSelection | null;
  stateHint?: string;
  disabled?: boolean;
  placeholder?: string;
}>(), {
  placeholder: "Search for your high school",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: HighSchoolSelection];
}>();

const { results, loading, search, selectSchool, clearResults } = useHighSchoolSearch(props.stateHint);

const inputValue = ref(props.modelValue?.name ?? "");
const showDropdown = ref(false);
const isManualMode = ref(false);

watch(() => props.modelValue, (v) => {
  inputValue.value = v?.name ?? "";
});

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  inputValue.value = val;
  showDropdown.value = true;
  search(val);
}

function onSelect(school: NcesSchool) {
  const selection = selectSchool(school);
  inputValue.value = selection.name;
  showDropdown.value = false;
  clearResults();
  emit("update:modelValue", selection);
}

function onManualBlur() {
  if (isManualMode.value) {
    emit("update:modelValue", { name: inputValue.value, nces_school_id: null });
  }
}

function enableManualMode() {
  isManualMode.value = true;
  showDropdown.value = false;
  clearResults();
}

function disableManualMode() {
  isManualMode.value = false;
  inputValue.value = "";
  emit("update:modelValue", { name: "", nces_school_id: null });
}

function onBlur() {
  // Small delay so click on dropdown item fires first
  setTimeout(() => { showDropdown.value = false; }, 150);
}
</script>

<template>
  <div class="relative">
    <div v-if="isManualMode" class="flex gap-2">
      <input
        v-model="inputValue"
        type="text"
        class="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
        :disabled="disabled"
        placeholder="Enter school name manually"
        @blur="onManualBlur"
      />
      <button
        type="button"
        class="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl"
        @click="disableManualMode"
      >
        ✕
      </button>
    </div>

    <div v-else>
      <input
        :value="inputValue"
        type="text"
        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
        :disabled="disabled"
        :placeholder="placeholder"
        @input="onInput"
        @blur="onBlur"
      />

      <!-- Dropdown -->
      <div
        v-if="showDropdown && (results.length > 0 || (!loading && inputValue.length >= 2))"
        class="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
      >
        <button
          v-for="school in results"
          :key="school.nces_id"
          type="button"
          class="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center"
          @mousedown.prevent="onSelect(school)"
        >
          <span class="text-sm font-medium text-slate-800">{{ school.name }}</span>
          <span class="text-xs text-slate-400 ml-2">{{ school.city }}, {{ school.state }}</span>
        </button>

        <div v-if="!loading && results.length === 0 && inputValue.length >= 2" class="px-4 py-3">
          <p class="text-sm text-slate-500 mb-2">No schools found.</p>
          <button
            type="button"
            class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            @mousedown.prevent="enableManualMode"
          >
            Can't find it? Enter manually →
          </button>
        </div>
      </div>

      <p v-if="loading" class="text-xs text-slate-400 mt-1">Searching...</p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify component renders correctly**

```bash
npm run dev
```

Navigate to any page and confirm no import errors in the console. (Full wiring happens in Task 10.)

- [ ] **Step 3: Commit**

```bash
git add components/shared/HighSchoolSearchInput.vue
git commit -m "feat: add HighSchoolSearchInput component with NCES autocomplete"
```

---

## Task 9: `AddressAutocompleteInput.vue` component

**Files:**
- Create: `components/shared/AddressAutocompleteInput.vue`

- [ ] **Step 1: Build the component**

```vue
<!-- components/shared/AddressAutocompleteInput.vue -->
<script setup lang="ts">
import { ref, watch } from "vue";
import { useAddressAutocomplete, type AddressSuggestion } from "~/composables/useAddressAutocomplete";
import type { HomeLocation } from "~/types/models";

const props = withDefaults(defineProps<{
  modelValue: HomeLocation;
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: HomeLocation];
}>();

const { suggestions, loading, search, selectSuggestion, clearSuggestions } = useAddressAutocomplete();

const addressInput = ref(props.modelValue.address ?? "");
const isSelected = ref(false); // true after an autocomplete selection
const showDropdown = ref(false);

watch(() => props.modelValue.address, (v) => {
  addressInput.value = v ?? "";
});

function onAddressInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  addressInput.value = val;
  isSelected.value = false;
  showDropdown.value = true;
  // Emit partial update so parent stays in sync
  emit("update:modelValue", { ...props.modelValue, address: val, latitude: undefined, longitude: undefined });
  search(val);
}

function onSelect(s: AddressSuggestion) {
  const location = selectSuggestion(s);
  addressInput.value = location.address ?? "";
  isSelected.value = true;
  showDropdown.value = false;
  clearSuggestions();
  emit("update:modelValue", location);
}

function clearSelection() {
  isSelected.value = false;
  addressInput.value = "";
  emit("update:modelValue", { address: "", city: "", state: "", zip: "", latitude: undefined, longitude: undefined });
}

function onBlur() {
  setTimeout(() => { showDropdown.value = false; }, 150);
}
</script>

<template>
  <div class="space-y-3">
    <!-- Address line with autocomplete -->
    <div class="relative">
      <label class="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
      <div class="flex gap-2">
        <input
          :value="addressInput"
          type="text"
          class="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
          :disabled="disabled"
          placeholder="Start typing your address..."
          @input="onAddressInput"
          @blur="onBlur"
        />
        <button
          v-if="isSelected"
          type="button"
          class="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl"
          title="Clear and re-enter address"
          @click="clearSelection"
        >
          ✕
        </button>
      </div>

      <!-- Suggestions dropdown -->
      <div
        v-if="showDropdown && suggestions.length > 0"
        class="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
      >
        <button
          v-for="(s, i) in suggestions"
          :key="i"
          type="button"
          class="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm text-slate-800"
          @mousedown.prevent="onSelect(s)"
        >
          {{ s.label }}
        </button>
      </div>

      <p v-if="loading" class="text-xs text-slate-400 mt-1">Looking up address...</p>
    </div>

    <!-- City / State / Zip — readonly after selection -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">City</label>
        <input
          :value="modelValue.city"
          type="text"
          :readonly="isSelected"
          class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          :class="isSelected ? 'bg-slate-100 text-slate-500 cursor-default' : ''"
          placeholder="City"
          :disabled="disabled"
          @input="emit('update:modelValue', { ...modelValue, city: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">State</label>
        <input
          :value="modelValue.state"
          type="text"
          maxlength="2"
          :readonly="isSelected"
          class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          :class="isSelected ? 'bg-slate-100 text-slate-500 cursor-default' : ''"
          placeholder="IL"
          :disabled="disabled"
          @input="emit('update:modelValue', { ...modelValue, state: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Zip Code</label>
      <input
        :value="modelValue.zip"
        type="text"
        maxlength="10"
        :readonly="isSelected"
        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
        :class="isSelected ? 'bg-slate-100 text-slate-500 cursor-default' : ''"
        placeholder="62701"
        :disabled="disabled"
        @input="emit('update:modelValue', { ...modelValue, zip: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <!-- Lat/lng confirmation (subtle, not shown if already selected) -->
    <p v-if="isSelected && modelValue.latitude" class="text-xs text-green-600">
      ✓ Location confirmed ({{ modelValue.latitude?.toFixed(4) }}, {{ modelValue.longitude?.toFixed(4) }})
    </p>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add components/shared/AddressAutocompleteInput.vue
git commit -m "feat: add AddressAutocompleteInput component"
```

---

## Task 10: Wire HighSchoolSearchInput into player-details page

**Files:**
- Modify: `pages/settings/player-details.vue`

The high school field is a free-text `<input>` bound to `form.high_school` (or `form.school_name` — check the template). Replace it with `HighSchoolSearchInput` and store the `nces_school_id` alongside.

- [ ] **Step 1: Find the high_school input in player-details.vue**

```bash
grep -n "high_school\|school_name\|High School" pages/settings/player-details.vue | head -20
```

Identify the line numbers of the current text input for the school name.

- [ ] **Step 2: Update the form model to include nces_school_id**

In the `form` reactive object (around line 705), ensure `nces_school_id` is initialised:

```typescript
// Add to form initialisation:
nces_school_id: "",
```

And in the `loadAllPreferences` block where `form.value` is spread from `playerDetails`, it will auto-pick up `nces_school_id` from the existing spread since it's in `PlayerDetails`.

- [ ] **Step 3: Replace the free-text input with HighSchoolSearchInput**

Find the existing `<input ... v-model="form.school_name">` (or `form.high_school`) and replace with:

> **Note:** The page already normalizes `high_school → school_name` on load (around line 841). The canonical save field is `form.school_name`. The `form.high_school` fallback in the binding is for backward-compat only — on save, write to `form.school_name`.

```vue
<HighSchoolSearchInput
  :model-value="{ name: form.school_name || form.high_school, nces_school_id: form.nces_school_id || null }"
  :state-hint="form.state || ''"
  :disabled="isSaving"
  @update:model-value="(v) => {
    form.school_name = v.name;
    form.high_school = v.name;
    form.nces_school_id = v.nces_school_id ?? '';
  }"
/>
```

- [ ] **Step 4: Ensure nces_school_id is saved**

In the `setPlayerDetails` call (wherever `form.value` is passed to save), verify the spread includes `nces_school_id`. Since it's in the form object and `PlayerDetails` now has the type, it should propagate automatically.

- [ ] **Step 5: Test manually**

```bash
npm run dev
```

Navigate to Settings → Player Details. Type in the high school field — confirm dropdown appears with city/state disambiguation. Select a school — confirm name fills and no error. "Can't find it?" button should appear after 0 results.

- [ ] **Step 6: Commit**

```bash
git add pages/settings/player-details.vue
git commit -m "feat: wire HighSchoolSearchInput into player details settings"
```

---

## Task 11: Wire AddressAutocompleteInput into location settings

**Files:**
- Modify: `pages/settings/location.vue`

The page currently has manual address + city + state + zip inputs plus a geocode button. Replace the whole block with `AddressAutocompleteInput`.

- [ ] **Step 1: Replace the address fields**

Remove the individual address/city/state/zip inputs and the geocode button. Replace with:

```vue
<AddressAutocompleteInput
  :model-value="localLocation"
  :disabled="isSaving"
  @update:model-value="(v) => Object.assign(localLocation, v)"
/>
```

> **Note:** `localLocation` is declared as `reactive<HomeLocation>()` (not a `ref`), so `v-model` does not work directly. Use explicit `:model-value` + `@update:model-value` with `Object.assign` to merge the incoming `HomeLocation` into the reactive object in place.

- [ ] **Step 2: Remove the manual geocode watcher**

The existing page has a watcher that auto-geocodes when address changes but lat/lng is missing. With `AddressAutocompleteInput`, lat/lng is populated on selection — remove the geocode watcher and any geocode utility imports if they are now unused.

- [ ] **Step 3: Test manually**

```bash
npm run dev
```

Navigate to Settings → Location. Type an address — dropdown appears. Select — city/state/zip/lat/lng all fill. "Clear" button resets. Confirm `setHomeLocation` is called on save and lat/lng are persisted.

- [ ] **Step 4: Commit**

```bash
git add pages/settings/location.vue
git commit -m "feat: wire AddressAutocompleteInput into location settings, remove manual geocode button"
```

---

## Task 12: Wire social handle normalization into player-details

**Files:**
- Modify: `pages/settings/player-details.vue`

- [ ] **Step 1: Import normalizeHandle**

At the top of the `<script setup>` in `pages/settings/player-details.vue`:

```typescript
import { normalizeHandle } from "~/utils/social";
```

- [ ] **Step 2: Add onBlur handler for social fields**

The social handle inputs are rendered from the `socialFields` array (around line 824). Add a `@blur` handler to each:

```vue
<!-- Find the v-for loop over socialFields and add @blur -->
@blur="(e) => {
  const field = item.key as 'twitter_handle' | 'instagram_handle' | 'tiktok_handle';
  const platform = field === 'twitter_handle' ? 'twitter'
    : field === 'instagram_handle' ? 'instagram' : 'tiktok';
  const { handle, isShortUrl } = normalizeHandle(
    (e.target as HTMLInputElement).value, platform
  );
  form[field] = handle;
  if (isShortUrl) {
    // Use existing toast utility: const { showToast } = useAppToast()
    // should already be destructured at the top of player-details.vue
    showToast("Short links can't be used as handles — enter your username directly.", "warning");
  }
}"
```

- [ ] **Step 3: Test manually**

```bash
npm run dev
```

Navigate to Settings → Player Details → Social section. Paste `https://twitter.com/CoachSmith` into the Twitter field, tab away — field should update to `CoachSmith`. Paste `vm.tiktok.com/abc123` into TikTok field, tab away — field stays as-is and a warning toast appears.

- [ ] **Step 4: Commit**

```bash
git add pages/settings/player-details.vue
git commit -m "feat: normalize social handles on blur in player details"
```

---

## Task 13: NCES Seed Script

**Files:**
- Create: `scripts/seed-nces-schools.ts`

This script parses the NCES CCD fixed-width "flat" file and bulk-upserts to Supabase. The companion file (downloaded from NCES) defines the column positions.

- [ ] **Step 1: Check the companion file for column positions**

Open the companion CSV/documentation file you downloaded. Find the byte-offset positions for:
- `NCESSCH` — school ID (12 chars)
- `SCHNAM` — school name
- `LCITY` — city
- `LSTATE` — state (2 chars)
- `LZIP` — zip (5 chars)
- `LATCOD` — latitude
- `LONCOD` — longitude
- `STATUS` — school status (1 = open)
- `GSHI` — highest grade offered

Note: The flat file is fixed-width. Each column starts at a specific character position. The companion file lists these exactly.

- [ ] **Step 2: Implement the seed script**

```typescript
// scripts/seed-nces-schools.ts
import fs from "fs";
import readline from "readline";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npx tsx scripts/seed-nces-schools.ts /path/to/ccd_file.dat");
  process.exit(1);
}

// ⚠️  UPDATE THESE POSITIONS from the companion file before running
// These are placeholder column definitions — verify against your companion file
const COLUMNS = {
  NCESSCH: { start: 0, length: 12 },
  SCHNAM:  { start: 12, length: 60 },
  LSTATE:  { start: 72, length: 2 },
  LCITY:   { start: 74, length: 30 },
  LZIP:    { start: 104, length: 5 },
  LATCOD:  { start: 190, length: 10 },
  LONCOD:  { start: 200, length: 11 },
  STATUS:  { start: 220, length: 2 },
  GSHI:    { start: 240, length: 2 },
};

function parseField(line: string, col: { start: number; length: number }): string {
  return line.substring(col.start, col.start + col.length).trim();
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function upsertBatch(rows: object[]) {
  const { error } = await supabase
    .from("nces_schools")
    .upsert(rows, { onConflict: "nces_id" });
  if (error) console.error("Batch error (continuing):", error.message);
}

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(csvPath) });
  let batch: object[] = [];
  let total = 0;
  let skipped = 0;
  let isFirstLine = true;

  // Validate required columns exist by checking header line
  for await (const line of rl) {
    if (isFirstLine) {
      // Flat files may have a header row — skip it
      isFirstLine = false;
      const header = parseField(line, COLUMNS.NCESSCH);
      if (header.toUpperCase().includes("NCESSCH")) {
        console.log("Header row detected, skipping.");
        continue;
      }
    }

    const status = parseField(line, COLUMNS.STATUS);
    const gradeHigh = parseField(line, COLUMNS.GSHI);

    if (status !== "1" || gradeHigh !== "12") {
      skipped++;
      continue;
    }

    const lat = parseFloat(parseField(line, COLUMNS.LATCOD));
    const lng = parseFloat(parseField(line, COLUMNS.LONCOD));

    batch.push({
      nces_id:   parseField(line, COLUMNS.NCESSCH),
      name:      parseField(line, COLUMNS.SCHNAM),
      city:      parseField(line, COLUMNS.LCITY),
      state:     parseField(line, COLUMNS.LSTATE),
      zip:       parseField(line, COLUMNS.LZIP),
      latitude:  isNaN(lat) ? null : lat,
      longitude: isNaN(lng) ? null : lng,
    });
    total++;

    if (batch.length >= 500) {
      await upsertBatch(batch);
      process.stdout.write(`\rInserted ${total} schools...`);
      batch = [];
    }
  }

  if (batch.length > 0) await upsertBatch(batch);
  console.log(`\nDone. Inserted: ${total}, Skipped: ${skipped}`);
  console.log(`Expected ~27,000 rows. If count is very different, verify STATUS/GSHI column positions.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Verify column positions against the companion file**

Open the companion documentation file. Find the column layout for the "DIRECTORY" dataset. Update the `COLUMNS` object in the script with the correct `start` and `length` values.

- [ ] **Step 4: Run the seed (dry run first)**

```bash
# Run with a small head of the file first to check output
head -20 /path/to/ccd_file.dat | npx tsx scripts/seed-nces-schools.ts /dev/stdin
```

Verify the parsed names look correct (real school names, not garbage). If output looks wrong, re-check column offsets.

- [ ] **Step 5: Run the full seed**

```bash
npx tsx scripts/seed-nces-schools.ts /path/to/ccd_sch_file.dat
```

Expected: `Inserted: ~27000, Skipped: ~103000`

Verify in Supabase dashboard: `SELECT COUNT(*) FROM nces_schools` should return ~27k.

- [ ] **Step 6: Test the search endpoint**

```bash
npm run dev
# In another terminal:
curl "http://localhost:3000/api/schools/high-school-search?q=Lincoln&state=IL" | jq .
```

Expected: JSON array of schools with Lincoln in the name, Illinois schools first.

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-nces-schools.ts
git commit -m "chore: add NCES seed script for nces_schools table"
```

---

## Task 14: E2E Tests

**Files:**
- Create: `tests/e2e/smart-inputs.spec.ts`

- [ ] **Step 1: Write E2E tests**

```typescript
// tests/e2e/smart-inputs.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsPlayer } from "./fixtures/auth.fixture";

test.describe("Smart Inputs — High School Search", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlayer(page);
    await page.goto("/settings/player-details");
  });

  test("shows NCES autocomplete suggestions when typing school name", async ({ page }) => {
    const schoolInput = page.locator('[placeholder="Search for your high school"]');
    await schoolInput.fill("Lincoln");
    await expect(page.locator("text=Lincoln High School")).toBeVisible({ timeout: 3000 });
  });

  test("selecting a school fills name and hides dropdown", async ({ page }) => {
    const schoolInput = page.locator('[placeholder="Search for your high school"]');
    await schoolInput.fill("Lincoln");
    const firstResult = page.locator(".dropdown-item, [role=option]").first();
    await firstResult.click();
    await expect(page.locator('[placeholder="Search for your high school"]')).not.toBeEmpty();
    await expect(page.locator("text=Lincoln High School")).not.toBeVisible();
  });

  test("shows escape hatch when no results found", async ({ page }) => {
    const schoolInput = page.locator('[placeholder="Search for your high school"]');
    await schoolInput.fill("xqzpwvnonexistent");
    await expect(page.locator("text=Can't find it")).toBeVisible({ timeout: 3000 });
  });

  test("escape hatch allows free text entry", async ({ page }) => {
    const schoolInput = page.locator('[placeholder="Search for your high school"]');
    await schoolInput.fill("xqzpwvnonexistent");
    await page.locator("text=Can't find it").click();
    const manualInput = page.locator('[placeholder="Enter school name manually"]');
    await expect(manualInput).toBeVisible();
    await manualInput.fill("Hogwarts Academy");
  });
});

test.describe("Smart Inputs — Address Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlayer(page);
    await page.goto("/settings/location");
  });

  test("shows address suggestions when typing", async ({ page }) => {
    const addressInput = page.locator('[placeholder="Start typing your address..."]');
    await addressInput.fill("1600 Penn");
    await expect(page.locator(".suggestions-dropdown, [data-testid='address-suggestions']").first()).toBeVisible({ timeout: 4000 });
  });

  test("selecting an address fills city, state, zip fields", async ({ page }) => {
    const addressInput = page.locator('[placeholder="Start typing your address..."]');
    await addressInput.fill("1600 Penn");
    await page.locator(".suggestions-dropdown button, [data-testid='address-suggestion']").first().click();
    await expect(page.locator('[placeholder="City"]')).not.toBeEmpty();
    await expect(page.locator('[placeholder="IL"]')).not.toBeEmpty();
  });

  test("clear button resets all address fields", async ({ page }) => {
    const addressInput = page.locator('[placeholder="Start typing your address..."]');
    await addressInput.fill("1600 Penn");
    await page.locator(".suggestions-dropdown button").first().click();
    await page.locator('button[title="Clear and re-enter address"]').click();
    await expect(addressInput).toBeEmpty();
  });
});

test.describe("Smart Inputs — Social Handle Normalization", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlayer(page);
    await page.goto("/settings/player-details");
  });

  test("strips full URL from Twitter handle on blur", async ({ page }) => {
    const twitterInput = page.locator('input[placeholder*="username"]').first();
    await twitterInput.fill("https://twitter.com/CoachSmith");
    await twitterInput.blur();
    await expect(twitterInput).toHaveValue("CoachSmith");
  });

  test("strips @ from Instagram handle on blur", async ({ page }) => {
    const igInput = page.locator('input[placeholder*="username"]').nth(1);
    await igInput.fill("@athlete.23");
    await igInput.blur();
    await expect(igInput).toHaveValue("athlete.23");
  });

  test("shows warning for short TikTok URL", async ({ page }) => {
    const tiktokInput = page.locator('input[placeholder*="username"]').nth(2);
    await tiktokInput.fill("vm.tiktok.com/abc123");
    await tiktokInput.blur();
    await expect(page.locator("text=short link")).toBeVisible({ timeout: 2000 });
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npm run test:e2e -- tests/e2e/smart-inputs.spec.ts
```

Fix any selectors that don't match the actual rendered HTML.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/smart-inputs.spec.ts
git commit -m "test: add E2E tests for smart inputs (school search, address autocomplete, social normalization)"
```

---

## Task 15: Final verification

- [ ] **Step 1: Run full unit test suite**

```bash
npm run test
```

Expected: All existing tests still pass. New tests pass.

- [ ] **Step 2: Type check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Smoke test the app**

```bash
npm run dev
```

- Visit Settings → Player Details: high school typeahead works, social handle normalization works on blur
- Visit Settings → Location: address autocomplete fills all 6 fields on selection, Clear button resets

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: smart input enrichment — final verification pass"
```
