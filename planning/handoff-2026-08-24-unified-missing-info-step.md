# Handoff: Unified Missing-Info Compose Step (web/iOS parity)

**Date:** 2026-08-24
**Branch:** `feat/unified-missing-info-step` (10 commits ahead of develop, **pushed**, **PR #459 open → develop**)
**Status:** COMPLETE — final review clean, PR open. Two gated follow-ups remain (see Next Steps).

## What this is
Ports iOS's unified "Complete your info" step to the web coach-outreach composer:
staged flow **compose → info (auto-skipped when nothing's missing) → preview + send**.
Built via subagent-driven-development from `planning/2026-08-23-unified-missing-info-step-{design,plan}.md`.

## Completed This Session (all committed + pushed)
- Spec + plan — `73e4e558`, `7dd77938`
- Task 1: pure `utils/communication/missingInfo.ts` (`deriveMissingInfoFields`, 8 tests) — `030df9aa`, fix `429fd309` (fitReason `editableByParent` is static `false`)
- Task 2: `supabase/migrations/20260905000000_intended_major_template_var.sql` (registry var + `intro-standard` body clause) — **migration file only, NOT applied to any DB** — `8905bf71`
- Task 3: `useQuickCommunication` wiring — `missingInfoFields`/`hasMissingInfo`/`commitMissingInfo`, `varLabels`, registry `label` select — `a9ba2685`
- Task 4: `components/Communication/MissingInfoStep.vue` (7 tests) — `7c28f245`
- Task 5: staged `MessageComposer.vue`; removed questionnaire prompt + add-metric CTA; **deleted `TemplateVariablesPanel.vue`**; exposed `canEditProfile`/`athleteName` — `ee50891e`
- Task 6: live E2E in `tests/e2e/tier1-critical/coaches-detail.spec.ts` (**passed live, chromium**) — `7519ac09`
- Final-review Critical fix: data-loss guard on the intended-major persist + dead `showAddMetricCta` removed — `ae598154`

## In Progress (Uncommitted)
None. Working tree clean.

## Known Issues / Gated Items
1. **Migration NOT applied (blocks intendedMajor parity, safe until then).** Apply
   `supabase/migrations/20260905000000_intended_major_template_var.sql` via Supabase MCP
   `apply_migration` (repo note: `npx supabase db push` drifts). It (a) inserts the `intendedMajor`
   `template_variables` row and (b) patches the live `intro-standard` template body. Until applied,
   the intended-major step row simply never appears — every other row works, no errors. Also
   patch the live template row if the seed migration's body-UPDATE doesn't cover the live DB.
   Required before the intendedMajor E2E path and before prod.
2. **Data-safety (FIXED, worth knowing):** intended-major persist uses `loadAllPreferences()` then,
   only if `getPlayerDetails()` is non-null, `setPlayerDetails({intended_major})`. `loadAllPreferences`
   swallows fetch failures → empty store; the guard prevents a full-replace that would wipe the
   athlete's player prefs. Test: `useQuickCommunication.missingInfo.spec.ts` "does NOT save … failed to load".
3. **Deferred minors (non-blocking):** T2 migration comment overstates the `ncaaId` precedent
   (design-doc only, not shipped); T3 spec double-stubs `useContactWindow`; `canEditProfile` is an
   unused reserved param in `MissingInfoInput`; Back-from-preview always lands on compose (defensible).
4. **Parity follow-up (own spec):** inline quick-add-metric — the metric row navigates to `/performance`
   (loses draft) for now, matching iOS intent; option (b) inline add was deferred.

## Test Status (this session, on `ae598154`)
- Unit: **PASS** — full suite 7998 passed / 63 skipped (26 new across derivation/wiring/component/staging)
- Type check: **PASS**
- Lint: **PASS**; audit:tokens **PASS**
- E2E: staged compose→(info)→preview→send **PASS** live (chromium)

## SDD workspace (ledger + task reports)
`.superpowers/sdd/2026-08-23-unified-missing-info-step-plan/` — `progress.md` ledger + per-task
reports/review packages. Not deleted (delete after PR #459 merges).

## Resume Command
> "Unified missing-info step is done — PR #459 on develop. Apply the gated migration
> `supabase/migrations/20260905000000_intended_major_template_var.sql` (Supabase MCP apply_migration),
> then confirm the intendedMajor row shows in the composer and merge #459."

## Next Steps (in order)
1. **Review + merge PR #459** into develop (QA).
2. **Apply the intendedMajor migration** to the DB (registry row + `intro-standard` body); verify the
   `intendedMajor` step row appears when composing a template that references `{{intendedMajor}}`.
3. Promote develop → main when ready (standard release flow); migration must be applied to prod DB too.
4. Delete the SDD workspace `.superpowers/sdd/2026-08-23-unified-missing-info-step-plan/` after merge.
5. (Optional) inline quick-add-metric follow-up spec.
