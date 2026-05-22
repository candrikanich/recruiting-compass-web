# Offers / Schools — Archive Feature & Soft-Warn Threshold (Follow-up)

**Origin:** Deferred from the offers architecture redesign (see `2026-05-22-offers-architecture-redesign.md`). The store rollout shipped the soft-warn card without an archive action; this issue tracks the remaining work.

## Scope

1. **Add `archived` status to offers**
   - Migration: extend the offers `status` CHECK constraint from `pending|accepted|declined|expired` to also include `archived`.
   - Update `types/models.ts` Offer status union, `utils/validation/schemas.ts` `offerSchema`, and any UI status maps (badges, filters, labels).
   - Default offers list view filters out `archived`. Surface them behind a filter chip / checkbox.

2. **Archive UI on offers**
   - Wire an "Archive" action link into the existing soft-warn card on `/offers` (the `offers-soft-warn` test-id).
   - Bulk action: from the selection checkboxes already present in `pages/offers/index.vue`, allow setting selected offers to `archived` in one call.
   - Single-offer archive action on the detail page (`pages/offers/[id].vue`) alongside the existing Edit/Delete.

3. **Schools soft-warn threshold + archive parity**
   - Bump the existing schools warning in `pages/schools/index.vue` from `>= 30` to `>= 80` (variable name: `shouldShowSchoolWarning`). Update copy to match the offers card tone.
   - Add `archived` status to schools too (separate migration). The schools warning card should get the same "Archive inactive ones" action once the schools archive flow exists.

4. **Store layer**
   - Add `archiveOffer(id)` action to `stores/offers.ts` (and `archiveSchool(id)` to `stores/schools.ts`). These can be thin wrappers over `updateOffer` / `updateStatus` setting `status: "archived"`.
   - Add `archivedOffers` / `archivedSchools` computed getters for the filter chip.
   - Default `fetchOffers` / `fetchSchools` may want to filter out `archived` at the query level OR fetch all and filter client-side via a new `visibleOffers` getter. Recommend client-side: keeps total count accurate for the soft-warn threshold.

## Out of scope

- Realtime sync of archive state across tabs (Supabase Realtime). Deferred per the original redesign.
- Cascade-archive (e.g., archiving a school auto-archives related offers). Treat as separate manual action.
- Hard caps. Still off the table.

## Acceptance

- New migration tested locally; `status_check` constraint accepts `archived`.
- Offers list default view excludes `archived`; filter chip toggles them on.
- Soft-warn card on `/offers` has a working "Archive inactive ones" action that opens the bulk-archive flow.
- Schools warning fires at 80 instead of 30; copy matches the offers card.
- `npm run type-check`, `npm run test`, and the offers + schools atomic E2E specs pass.

## Notes for the implementing agent

- The original redesign plan (`planning/2026-05-22-offers-architecture-redesign.md`) is the prerequisite. The store and call sites already live in `stores/offers.ts` / `stores/schools.ts`.
- `OFFERS_SOFT_WARN_THRESHOLD` constant lives in `stores/offers.ts` — extract a `SCHOOLS_SOFT_WARN_THRESHOLD` to `stores/schools.ts` for symmetry.
- Don't bypass the store for archive — mutate via an action so totalCount and computed getters stay in sync.
