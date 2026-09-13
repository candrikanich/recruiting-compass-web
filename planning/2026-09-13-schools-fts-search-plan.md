# Schools Postgres Full-Text Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `useSearchConsolidated.ts`'s ILIKE-then-Fuse.js schools search with a DB-side ranked search (`tsvector`/`ts_rank` for relevance + `pg_trgm`/`similarity()` for typo tolerance) exposed through one Postgres RPC.

**Architecture:** One migration adds a generated `search_vector tsvector` column + GIN index (relevance ranking) and a trigram GIN index on `name` (typo tolerance, reusing the `pg_trgm` extension already installed for `nces_schools`) to `schools`. A `SECURITY INVOKER` RPC `search_schools_fts` combines both signals into one ordered result set — invoker security means the existing family-model RLS SELECT policy on `schools` still governs what a caller can see, no separate scoping logic needed in the function. A new `queryRpc` wrapper in `utils/supabaseQuery.ts` (matching `querySelect`'s error/logging shape) calls it; `useSearchConsolidated.ts#searchSchools` calls that instead of `querySelect` + `applyFuzzySearch` for queries ≥3 chars, keeping the existing ILIKE path only as the <3-char fallback (`to_tsquery`/`websearch_to_tsquery` need real tokens; the current code already special-cases short queries this way in intent, this plan makes it real).

**Tech Stack:** Postgres `tsvector`/`GENERATED ALWAYS AS`/GIN index; `pg_trgm` `similarity()` + trigram GIN index (extension already present in `extensions` schema — see `claude/database.md` "2026-08-01: pg_trgm moved to extensions schema"); Supabase RPC via `supabase.rpc()`; Vitest.

**Spec:** GitHub issue #606 (`feat: Postgres full-text search for schools`) — this plan diverges from the issue's literal text in one place: `tsvector` alone does not give typo tolerance (that needs `pg_trgm`), so this plan adds trigram similarity as a second signal rather than relying on `tsvector`/`ts_rank` alone. iOS has no code path touching the `schools` table's search behavior (its "Add School" autocomplete searches a bundled local NCAA list, not Supabase — see the companion iOS issue filed for that gap) — this plan is web-only.

## Global Constraints

- No new npm dependency — `pg_trgm` is already an installed Postgres extension, `fuse.js` stays for the <3-char ILIKE fallback path and for non-schools entities (coaches/interactions/metrics), which are out of scope for this plan.
- Migration must not touch RLS policies on `schools` — the RPC is `SECURITY INVOKER` so the existing family-model SELECT policy applies unchanged.
- Do not port the existing `filters.value.schools.verified` filter into the new RPC — `schools` has no `verified` column (confirmed via `types/models.ts` and a migration grep); that filter is dead/broken in the current deprecated code path and must not be perpetuated.
- Single Supabase DB serves prod+QA (`xpxzhqghxecsjhvklsqg` per `claude/database.md`/MEMORY `prod-infra-identity` — verify this hasn't changed since 2026-09-06 before applying) — apply the migration via Supabase MCP `apply_migration`, not `npx supabase db push` (known to fail locally per `claude/database.md`).

---

## File Structure

- Create: `supabase/migrations/20260913000000_schools_fts_search.sql` — `search_vector` generated column, GIN index, trigram GIN index on `name`, `search_schools_fts` RPC.
- Modify: `utils/supabaseQuery.ts` — add `queryRpc<T>` wrapper.
- Modify: `composables/useSearchConsolidated.ts` — `searchSchools()` uses `queryRpc` for queries ≥3 chars, existing ILIKE `querySelect` path only for <3 chars, drops `applyFuzzySearch` for schools.
- Modify: `tests/unit/utils/supabaseQuery.spec.ts` — add `queryRpc` coverage.
- Modify: `tests/unit/composables/useSearchConsolidated.extended.spec.ts` — replace the schools-search ILIKE assertions with RPC assertions.

---

### Task 1: Migration — search_vector + trigram indexes + RPC

**Files:**
- Create: `supabase/migrations/20260913000000_schools_fts_search.sql`

**Interfaces:**
- Produces: RPC `public.search_schools_fts(p_search_term text, p_division text DEFAULT NULL, p_state text DEFAULT NULL, p_limit int DEFAULT 20) RETURNS SETOF schools`, callable via `supabase.rpc("search_schools_fts", { p_search_term, p_division, p_state, p_limit })`.

- [ ] **Step 1: Write the migration file**

```sql
-- 20260913000000_schools_fts_search.sql
-- Issue #606: Postgres full-text search for schools, replacing the
-- ILIKE + Fuse.js client-side fuzzy re-rank in useSearchConsolidated.ts.
--
-- Two signals, combined:
--   1. tsvector/ts_rank over name/city/state/conference — relevance ranking,
--      handles stemming ("Wildcats" ~ "Wildcat") but NOT typos.
--   2. pg_trgm similarity() on name — typo tolerance ("Michgan" ~ "Michigan").
--      pg_trgm is already installed in the `extensions` schema (see
--      claude/database.md 2026-08-01 entry), reused here, no new extension.

ALTER TABLE public.schools
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(state, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(conference, '')), 'C')
  ) STORED;

CREATE INDEX idx_schools_search_vector ON public.schools
  USING GIN (search_vector);

CREATE INDEX idx_schools_name_trgm ON public.schools
  USING GIN (name extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_schools_fts(
  p_search_term text,
  p_division text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS SETOF public.schools
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT s.*
  FROM public.schools s
  WHERE
    (
      s.search_vector @@ websearch_to_tsquery('english', p_search_term)
      OR extensions.similarity(s.name, p_search_term) > 0.3
    )
    AND (p_division IS NULL OR s.division = p_division)
    AND (p_state IS NULL OR s.state = p_state)
  ORDER BY
    ts_rank(s.search_vector, websearch_to_tsquery('english', p_search_term)) DESC,
    extensions.similarity(s.name, p_search_term) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_schools_fts(text, text, text, int) TO authenticated;

COMMENT ON FUNCTION public.search_schools_fts IS
  'Issue #606: ranked schools search combining tsvector/ts_rank relevance with pg_trgm similarity for typo tolerance. SECURITY INVOKER — relies on the existing family-model RLS SELECT policy on schools for scoping.';
```

- [ ] **Step 2: Apply via Supabase MCP**

Run `mcp__claude_ai_Supabase__apply_migration` with this file's contents against the project confirmed in Global Constraints (verify prod/QA split assumption first — `mcp__claude_ai_Supabase__get_project` or ask Chris if MEMORY's `prod-infra-identity` note looks stale).

- [ ] **Step 3: Verify live**

```sql
-- Ranking sanity check: exact match ranks above partial, typo still matches.
SELECT name, ts_rank(search_vector, websearch_to_tsquery('english', 'Michigan')) AS rank
FROM schools WHERE name ILIKE '%Michigan%' ORDER BY rank DESC LIMIT 5;

SELECT * FROM search_schools_fts('Michgan', NULL, NULL, 5); -- typo, should still return Michigan schools
```

Expected: no SQL errors, typo query returns rows, `idx_schools_search_vector` and `idx_schools_name_trgm` show `indisvalid = true` in `pg_index`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260913000000_schools_fts_search.sql
git commit -m "feat: add search_vector + trigram index + search_schools_fts RPC (#606)"
```

---

### Task 2: `queryRpc` wrapper in `utils/supabaseQuery.ts`

**Files:**
- Modify: `utils/supabaseQuery.ts`
- Test: `tests/unit/utils/supabaseQuery.spec.ts`

**Interfaces:**
- Consumes: `useSupabase()` (existing import in this file).
- Produces: `queryRpc<T>(fn: string, params: Record<string, unknown>, ctx?: QueryContext): Promise<QueryResult<T[]>>` — same `{ data, error }` shape as `querySelect`, for `useSearchConsolidated.ts` (Task 3) to consume.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/utils/supabaseQuery.spec.ts — inside describe("supabaseQuery utilities")
describe("queryRpc", () => {
  it("calls supabase.rpc with the function name and params, returns data", async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [{ id: "s1" }], error: null });

    const result = await queryRpc<{ id: string }>(
      "search_schools_fts",
      { p_search_term: "Michigan", p_limit: 20 },
      { context: "searchSchools", silent: true },
    );

    expect(mockSupabase.rpc).toHaveBeenCalledWith("search_schools_fts", {
      p_search_term: "Michigan",
      p_limit: 20,
    });
    expect(result.data).toEqual([{ id: "s1" }]);
    expect(result.error).toBeNull();
  });

  it("wraps an RPC error into QueryResult.error", async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });

    const result = await queryRpc("search_schools_fts", { p_search_term: "x" });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain("boom");
  });
});
```

Also add `rpc: vi.fn()` to the `mockSupabase` object in `beforeEach` (it's absent from the current mock, which only has `from`/`select`/etc).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/supabaseQuery.spec.ts -t queryRpc`
Expected: FAIL — `queryRpc is not a function` (not exported yet).

- [ ] **Step 3: Write minimal implementation**

Add to `utils/supabaseQuery.ts`, after `querySelect` (~line 182):

```ts
/**
 * Call a Postgres RPC function through the same error/logging wrapper as
 * querySelect. Used for queries that need DB-side ranking (e.g. ts_rank)
 * that PostgREST's query-string filters can't express.
 *
 * @example
 * const { data, error } = await queryRpc<School>(
 *   'search_schools_fts',
 *   { p_search_term: 'Michigan', p_limit: 20 },
 *   { context: 'searchSchools' }
 * )
 */
export async function queryRpc<T>(
  fn: string,
  params: Record<string, unknown>,
  ctx?: QueryContext,
): Promise<QueryResult<T[]>> {
  try {
    const supabase = useSupabase();
    const { data, error } = await supabase.rpc(fn, params);

    if (error) {
      throw new Error(`[${fn}] ${error.message}`);
    }

    if (!ctx?.silent) {
      logger.debug(
        `[queryRpc] ${fn}${ctx?.context ? ` (${ctx.context})` : ""}`,
        `returned ${Array.isArray(data) ? data.length : 0} records`,
      );
    }

    return { data: data as T[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!ctx?.silent) {
      logger.error(
        `[queryRpc] ${fn}${ctx?.context ? ` (${ctx.context})` : ""}`,
        { message: error.message, metadata: ctx?.metadata },
      );
    }
    return { data: null, error };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/supabaseQuery.spec.ts -t queryRpc`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/supabaseQuery.ts tests/unit/utils/supabaseQuery.spec.ts
git commit -m "feat: add queryRpc wrapper to supabaseQuery for RPC-backed searches (#606)"
```

---

### Task 3: `searchSchools` uses the RPC

**Files:**
- Modify: `composables/useSearchConsolidated.ts:152-201` (the `searchSchools` function)
- Test: `tests/unit/composables/useSearchConsolidated.extended.spec.ts`

**Interfaces:**
- Consumes: `queryRpc<School>` from Task 2 (`import { querySelect, queryRpc } from "~/utils/supabaseQuery"`).
- Produces: `searchSchools(searchQuery: string): Promise<void>` — same signature/side-effect (`schoolResults.value` assignment) as before, so `performSearch` (which calls it) is unaffected.

- [ ] **Step 1: Write the failing test**

In `tests/unit/composables/useSearchConsolidated.extended.spec.ts`, find the existing schools-search-flows-into-querySelect test (~line 216-229, `querySelectMock.mock.calls[0][0]` asserted `toBe("schools")`) and add a new one alongside it for the ≥3-char RPC path, plus keep a short-query ILIKE-fallback test:

```ts
import { queryRpc } from "~/utils/supabaseQuery"; // add to the existing vi.mock("~/utils/supabaseQuery", ...) factory

// inside the schools describe block:
it("uses search_schools_fts RPC for queries >= 3 chars, not querySelect", async () => {
  queryRpcMock.mockResolvedValue(ok([{ id: "s1", name: "Michigan" }]));

  await composable.searchSchools("Michgan"); // typo, 7 chars

  expect(queryRpcMock).toHaveBeenCalledWith(
    "search_schools_fts",
    expect.objectContaining({ p_search_term: "Michgan" }),
    expect.objectContaining({ context: "searchSchools" }),
  );
  expect(querySelectMock).not.toHaveBeenCalled();
  expect(composable.schoolResults.value).toEqual([{ id: "s1", name: "Michigan" }]);
});

it("falls back to the ILIKE querySelect path for queries under 3 chars", async () => {
  querySelectMock.mockResolvedValue(ok([]));

  await composable.searchSchools("mi");

  expect(querySelectMock).toHaveBeenCalled();
  expect(queryRpcMock).not.toHaveBeenCalled();
});

it("passes active division/state filters as RPC params", async () => {
  queryRpcMock.mockResolvedValue(ok([]));
  composable.applyFilter("schools", "division", "D1");
  composable.applyFilter("schools", "state", "MI");

  await composable.searchSchools("Michigan");

  expect(queryRpcMock).toHaveBeenCalledWith(
    "search_schools_fts",
    expect.objectContaining({ p_division: "D1", p_state: "MI" }),
    expect.anything(),
  );
});
```

Add the mock plumbing near the existing `querySelectMock` declaration (~line 70):

```ts
const queryRpcMock = vi.fn();
vi.mock("~/utils/supabaseQuery", () => ({
  querySelect: (...args: unknown[]) => querySelectMock(...args),
  queryRpc: (...args: unknown[]) => queryRpcMock(...args),
}));
```

and reset it alongside `querySelectMock.mockReset()` (~line 113).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useSearchConsolidated.extended.spec.ts -t "search_schools_fts"`
Expected: FAIL — `queryRpcMock` never called (searchSchools still calls `querySelect` unconditionally).

- [ ] **Step 3: Write minimal implementation**

Replace `searchSchools` in `composables/useSearchConsolidated.ts` (current body ~line 152-201):

```ts
/**
 * Search schools
 *
 * Queries >= 3 chars go through the search_schools_fts RPC (tsvector
 * relevance + pg_trgm typo tolerance, ranked DB-side — see migration
 * 20260913000000_schools_fts_search.sql). Shorter queries fall back to the
 * ILIKE path: to_tsquery/websearch_to_tsquery need real tokens and don't
 * behave usefully on 1-2 char fragments.
 */
const searchSchools = async (searchQuery: string) => {
  if (!userStore.user) return;

  const trimmed = searchQuery.trim();

  try {
    if (trimmed.length >= 3) {
      const { data, error } = await queryRpc<School>(
        "search_schools_fts",
        {
          p_search_term: trimmed,
          p_division: filters.value.schools.division || null,
          p_state: filters.value.schools.state || null,
          p_limit: 20,
        },
        { context: "searchSchools" },
      );

      if (error) throw error;
      schoolResults.value = data || [];
      return;
    }

    const filterObj: Record<string, string | number | boolean | null> = {
      user_id: userStore.user.id,
    };
    if (filters.value.schools.division) {
      filterObj.division = filters.value.schools.division;
    }
    if (filters.value.schools.state) {
      filterObj.state = filters.value.schools.state;
    }

    const { data, error } = await querySelect<School>(
      "schools",
      {
        select: "*",
        filters: filterObj,
        search: {
          columns: ["name", "address", "city", "state"],
          term: trimmed,
        },
        limit: 20,
      },
      { context: "searchSchools" },
    );

    if (error) throw error;
    schoolResults.value = data || [];
  } catch (err) {
    logError(err, { context: "searchSchools" });
    schoolResults.value = [];
  }
};
```

Also remove the now-unused `applyFuzzySearch` calls for schools specifically — `applyFuzzySearch` itself stays (still used by `searchCoaches`/`searchInteractions`/`searchMetrics`, out of scope here).

Add the import at the top of the file:

```ts
import { querySelect, queryRpc } from "~/utils/supabaseQuery";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composables/useSearchConsolidated.extended.spec.ts`
Expected: PASS, including the pre-existing schools-filter tests (division/state filters at ~line 266-287 — update their assertions to check `queryRpcMock` params instead of `querySelectMock`'s `filters` object, since those filters now flow through RPC params for ≥3-char queries).

- [ ] **Step 5: Run full unit suite**

Run: `npm test`
Expected: PASS, no new failures. (`npm run type-check` too — `School` import already typed, no new `any`.)

- [ ] **Step 6: Commit**

```bash
git add composables/useSearchConsolidated.ts tests/unit/composables/useSearchConsolidated.extended.spec.ts
git commit -m "feat: searchSchools uses search_schools_fts RPC for ranked+typo-tolerant results (#606)"
```

---

### Task 4: Manual verification against dev/QA

- [ ] **Step 1: Run dev server**

`npm run dev` → open `/schools`, trigger the search UI path that calls `useSearchConsolidated().performSearch` (check `pages/schools/index.vue` or wherever `searchType.value` includes `"schools"` is wired to a search box — grep `performSearch(` in `pages/` if not obvious from the UI).

- [ ] **Step 2: curl-equivalent / browser check**

Type a correctly-spelled school name → confirm results appear, ranked with exact/near matches first. Type a misspelled name (e.g. "Michgan") → confirm it still returns Michigan-named schools (proves the trigram path is live, not just tsvector).

- [ ] **Step 3: Confirm no console errors, no regression on division/state filters**

Apply a division filter alongside a search term → confirm results respect both.

---

## Self-Review

**Spec coverage:** Issue #606's 5 numbered items — (1) migration/tsvector column: Task 1. (2) GIN index: Task 1. (3) ranked query function: Task 1 RPC. (4) composable update: Task 3. (5) ILIKE fallback for short queries: Task 3's <3-char branch. Issue's "fuzzy matching (typos)" claim is only satisfiable by adding `pg_trgm` (not in the issue's literal list) — added in Task 1 and called out explicitly in the plan header as a deviation from the issue text, not a silent addition.

**Placeholder scan:** No TBD/TODO; every step has runnable SQL/TS/test code.

**Type consistency:** `queryRpc<T>` return shape (`QueryResult<T[]>`, i.e. `{ data: T[] | null, error: Error | null }`) matches `querySelect`'s shape exactly, so `searchSchools`'s existing `if (error) throw error; schoolResults.value = data || []` pattern needs no change in shape-handling between the two branches. RPC param names (`p_search_term`, `p_division`, `p_state`, `p_limit`) are consistent between the SQL function signature (Task 1) and every TS call site (Task 3) and test assertion (Tasks 2-3).
