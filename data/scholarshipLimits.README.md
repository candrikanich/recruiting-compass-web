# `scholarshipLimits.json` — sourcing & caveats

NCAA/NAIA scholarship limits, keyed by `{sport}_{division}` (lowercase
snake_case, informational). Each entry also carries explicit `sport` and
`division` fields for unambiguous seeding: `sport` is one of the app's 19
canonical `AppSport` values (`utils/recruitingCalendar/types.ts`, matching
`primary_sport`/`SPORT_METRICS` keys exactly, case-sensitive content though
matching is done case-insensitively) and `division` matches
`schools.division` (`D1`/`D2`/`D3`/`NAIA`/`JUCO`).

## No sex/gender distinction

`AppSport` (and `scholarship_limits`) track sport only, not athlete sex —
there's nowhere in the schema to store a men's-vs-women's split. Where NCAA
limits genuinely differ by sex (basketball, soccer, volleyball, track &
field, swimming, golf, tennis, lacrosse, water polo, gymnastics — often
substantially), each row picks one representative figure and documents the
other in `notes`. Convention used: the women's figure, except football
(men's-only) and wrestling (used the traditional men's figure — women's
wrestling is a fast-growing, separately-funded emerging sport with no
established single figure yet). This is a real limitation, not an oversight
— fixing it would need a schema change (a sex/gender column) which is out
of scope here.

## The 2025-26 House v. NCAA settlement

D1 numbers here are the **traditional pre-2025 scholarship-count limits**
(`equivalency` = fractional total split across a roster, `headCount` =
whole-number individual scholarships) — these remain the commonly-cited
recruiting reference figures.

As of 2025-26, the House v. NCAA settlement replaced D1 per-sport
scholarship **caps** with per-sport **roster limits** (schools may now fund
scholarships up to the roster limit, budget/Title IX permitting). Each D1
row's `notes` field carries the new roster-limit ceiling for context — that
number is **not** a scholarship count and is intentionally not stored in
`total`/`headCount`/`equivalency`, which model scholarship counts.

`schools.division` has no FBS/FCS distinction, so `football_D1` uses the FBS
figure (85) with FCS (historically ~63, equivalency) noted separately.

D2, D3, and NAIA are unaffected by the settlement.

## JUCO / NJCAA

NJCAA publishes no reliable numeric per-sport table — funding is by NJCAA
Division tier (D1 full-ride, D2 tuition/fees/books only, D3 none), not a
fixed per-sport count. JUCO rows are notes-only (`null` numbers) pending
better data rather than fabricated figures.

## Confidence

- **D1** (old limits) and **D2**: sourced directly from NCAA.org / a
  cross-checked scholarshipstats.com table — solid.
- **D1 2025-26 roster limits**: sourced from businessofcollegesports.com's
  post-settlement table, spot-checked against reporting on specific
  programs — solid but very new (first full year is 2025-26).
- **D3**: trivially correct — no athletic scholarships are permitted in any
  sport.
- **NAIA**: secondary-sourced (2aDays), not cross-confirmed against a
  primary NAIA document — flagged per-row, verify before treating as
  authoritative.
- **JUCO**: not found with confidence — rows are placeholders.

Researched 2026-09-06 for issue #578.
