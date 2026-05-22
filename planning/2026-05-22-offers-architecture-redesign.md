# Offers Architecture Redesign — Plan for Agent Implementation

**Status:** Ready for implementation
**Origin:** Discovered while writing E2E atomic tests; partial fix landed in commit `c9ff56dd` (direct-by-ID query on detail page). This plan covers the remaining structural work.

---

## Context

The atomic E2E test for offers exposed three connected issues in how the app fetches and caches offer data. The first was patched as a tactical fix; the rest are deferred to this redesign.

**Constraints to design around (from product):**
- Realistic per-player offer count: 1–12. Outliers (D1 blue-chip recruits): up to ~30.
- Realistic per-player school count: target 40–60. Power users (over-researching parents): up to ~150.
- The 1000+ counts seen in dev were **test-data pollution**, not a real user scenario.
- **No hard caps.** Soft warnings are acceptable; walls are not.

## Problems

### 1. Per-instance composable cache (already mitigated, not fixed)

`useOffers()` returns a local `ref<Offer[]>([])`. Each page that calls `useOffers()` gets its own `offers.value` — they don't share state. The detail page's "is this offer in the list?" check (`offers.value.find(...)`) silently fails when the list page and detail page mount independently.

**Tactical patch already shipped (c9ff56dd):** detail page now calls `getOffer(id)` directly. Falls back to cache only if the direct fetch returns null.

**What's still wrong:** every page that needs offer data re-fetches the full list (or a subset). No invalidation when offers are created/updated/deleted on another tab or via a notification. State drift is possible.

### 2. No pagination on `fetchOffers`

`fetchOffers()` is `supabase.from("offers").select("*").eq("family_unit_id").order("offer_date", desc)`. No `.range()`, no `.limit()`. Supabase silently caps at 1000 rows. For realistic users this never bites; for any future scenario (export historical data, archive views, multi-athlete families) it will.

### 3. No invalidation strategy

When `createOffer` succeeds, it pushes to local `offers.value`. Other open tabs / other components using `useOffers()` don't see the change. There's no broadcast.

## Proposed architecture

### Move offers state to a Pinia store

```ts
// stores/offers.ts
export const useOffersStore = defineStore("offers", () => {
  const offers = ref<Offer[]>([]);
  const isFetched = ref(false);
  const loading = ref(false);

  async function fetchOffers(familyId: string, force = false) {
    if (isFetched.value && !force) return;
    // ... existing fetch with .range(0, 99) for first page
  }

  async function getOffer(id: string): Promise<Offer | null> {
    // Direct query, also seeds offers[] cache
  }

  async function createOffer(data) {
    const created = await /* insert */;
    offers.value.unshift(created);
    return created;
  }

  // updateOffer, deleteOffer — patch the local list after API success
  return { offers, fetchOffers, getOffer, createOffer, updateOffer, deleteOffer, loading };
});
```

**Why Pinia:** shared state across pages (list ↔ detail), single source of truth for cache invalidation, devtools visibility, and matches the existing pattern (`stores/schools.ts`, `stores/user.ts`).

### Soft-warn at thresholds (no hard caps)

On `/offers` and `/schools` list pages, when count exceeds a threshold, render a non-blocking advisory card:

| Entity   | Soft-warn threshold | Message                                                                                                  |
|----------|---------------------|----------------------------------------------------------------------------------------------------------|
| Schools  | 80                  | "You're tracking 80+ schools. Most successful recruits focus on 40–60. [Archive inactive ones →]"        |
| Offers   | 25                  | "You have 25+ offers logged. If some are from prior cycles, consider archiving for a clearer view."      |

**No backend enforcement.** The 1000-row Supabase default would never be hit by a real user; pagination (below) handles it cleanly if anyone ever does.

### Paginate `fetchOffers`

```ts
async function fetchOffers(familyId: string, page = 0, pageSize = 100) {
  const from = page * pageSize;
  const { data, count } = await supabase
    .from("offers")
    .select("*", { count: "exact" })
    .eq("family_unit_id", familyId)
    .order("offer_date", { ascending: false })
    .range(from, from + pageSize - 1);
  // ...
}
```

First page (most recent 100) covers ~98% of real users. UI shows "Showing 100 of N — load more" if `count > 100`. No infinite scroll yet; manual "load more" button is fine and avoids accidental fetch storms.

### Archive status (deferred)

Currently the only statuses are `pending / accepted / declined / expired`. Add `archived` as a fifth status. Soft-warn card has an "Archive" action that bulk-sets selected offers to `archived`. Default list view filters out `archived`; a checkbox or filter chip surfaces them.

This is a follow-up — gating now would block the architecture rollout. File a separate issue.

## Implementation order (for the next agent)

1. **Create `stores/offers.ts`** mirroring `stores/schools.ts` shape. Move state and actions out of `useOffers()`.
2. **Refactor `useOffers()`** to thin wrapper that calls the store (preserves existing import paths in the 20+ files that use it). Or do a codemod / find-replace to inline calls — agent's choice.
3. **Update `pages/offers/index.vue` and `pages/offers/[id].vue`** to use store directly. Remove the local `directOffer` workaround introduced in c9ff56dd.
4. **Add pagination to `fetchOffers`** — default `pageSize = 100`, expose `loadMore()`.
5. **Add soft-warn cards** at 25 offers and 80 schools.
6. **Verify with atomic E2E** (`tests/e2e/tier1-critical/offers-crud-atomic.spec.ts`) — should continue to pass.
7. **File follow-up issue** for the `archived` status, archive UI, and the "schools soft-warn" matching change in `stores/schools.ts`.

## Out of scope for this redesign

- **Hard caps.** Don't add them.
- **Multi-tab realtime sync.** Supabase Realtime subscriptions are overkill for offers (low write frequency, low concurrency). Skip.
- **Optimistic UI for create/update.** Existing flow is fine — sub-second response time is good enough.
- **Server-side aggregation.** No, the list is small.

## Notes for the implementing agent

- Look at `stores/schools.ts` (`fetchSchools` guard pattern, `getSchool` placeholder if not present) — that's the shape to mirror.
- Don't break the test data — `scripts/e2e-cleanup.ts` deletes accumulated test offers via FK cascade on schools, so as long as schools cleanup runs, offers come along.
- The atomic E2E test (`offers-crud-atomic.spec.ts`) is the canonical smoke check. If it passes, the rollout is safe.
- Don't add a hard limit. If you find yourself reaching for one, re-read the "Constraints to design around" section.
- Keep `useOffers()` exported and functional during the migration — too many call sites to flip in one PR.

## Acceptance

- `tests/e2e/tier1-critical/offers-crud-atomic.spec.ts` passes.
- `npm run type-check` clean.
- Existing unit tests (`tests/unit/composables/useOffers*.spec.ts`) pass (may need updating if the composable interface shifts).
- A user with 30+ offers sees the soft-warn card.
- A user with 200+ offers sees the soft-warn + a paginated list that loads correctly past the first 100.
