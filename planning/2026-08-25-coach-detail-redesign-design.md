# Coach Detail Redesign — Design Spec

**Date:** 2026-08-25
**Branch (worktree):** `worktree-coach-detail-figma-capture`
**Figma source:** https://www.figma.com/design/A4LleRjo8wP6djA4UqADzB/Coach-Detail-%E2%80%94-Web-Capture?node-id=4-18
**Status:** Approved (design shape) — pending implementation plan

## Goal

Rebuild the Coach Detail page (`pages/coaches/[id]/index.vue`) to match the approved
two-column Figma layout, adding two net-new persisted fields (`tags`, `source`) and a set
of derived-insight UI (alert banners, stat rings, analytics ring). Web-first; iOS handoff
spec generated after web ships.

## Decisions (locked)

1. **New data = full DB + wired.** Migration adds `coaches.tags text[]` and `coaches.source text`. Editable, persisted.
2. **Web first**, iOS handoff after (via `web-to-ios-handoff` skill).
3. **Rebuild page fresh** — new composition + new presentational components; retire detail-local sub-components.
4. Tags = free-form chips; Source = free text. No enum/seed table.
5. *Coach Since* → existing `created_at`; *Last Updated* → existing `updated_at`. No new timestamp columns.

## Component reuse audit

| Component | Verdict |
|---|---|
| `CommunicationPanel` | **KEEP** — shared by coaches list, school coaches, dashboard widget. Restyle via props/wrapper only; do NOT fork. |
| `EditCoachModal` | **KEEP + extend** — detail-only. Add Tags + Source inputs. |
| `CoachHeader`, `CoachStatsGrid`, `CoachMetricsPanel`, `CoachInteractionsLog`, `CoachNotesEditor` | Detail-local → replace with new presentational components (interactions filter/table logic ported, not rewritten). |

## 1. Data / DB

Migration on `coaches` (applied live via Supabase MCP to prod DB `xpxzhqghxecsjhvklsqg`; file committed to repo):

```sql
ALTER TABLE coaches
  ADD COLUMN tags   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN source text   NULL;
```

- RLS unchanged — `coaches` already family-scoped; new columns inherit.
- `types/models.ts` `Coach` interface gains `tags: string[]` and `source: string | null`.
- Coaches store create/update actions thread `tags`, `source`.
- Zod validators for coach create/edit extend with `tags` (array of trimmed non-empty strings, cap length), `source` (optional string).

## 2. Page composition

`pages/coaches/[id]/index.vue` rebuilt. Grid `lg:grid-cols-[340px_1fr]`, stacks single-column on mobile.

New presentational components under `components/Coach/detail/`:

**Left rail**
- `CoachIdentityCard` — avatar (initials), name, email, Twitter/Instagram links.
- `CoachChannelActions` — Email / Text / Call / Twitter / Instagram + **Log Interaction** (opens existing interaction-create flow with coach prefilled).
- `CoachInternalNotes` — wraps existing notes edit behavior.
- `CoachTagsCard` — chips + "＋ Add Tag"; inline add/remove writing `tags`.
- `CoachProfileMeta` — Coach Since / Source / Last Updated.

**Right column**
- `CoachAlerts` — derived banners: *Outreach Overdue* (days-since-contact past threshold), *Channel Preference detected* (from preferred response method). No new data.
- `CoachStatCards` — Days Since Contact / Total Interactions / Preferred Channel, ring accents.
- `CommunicationPanel` (kept) — restyled to "Communication History & Analytics" card with response ring.
- Interactions filter + table — ported `CoachInteractionsLog` logic, restyled columns (CHANNEL / NOTES·SUBJECT / DATE, expandable rows).

## 3. Derived UI logic

`composables/useCoachInsights.ts` — pure, unit-testable. Inputs: interactions[], last_contact_date, now. Outputs:
- `daysSinceContact`, `isOverdue` (+ threshold), `overdueAlert`
- `preferredChannel` (mode of interaction types) + `channelPreferenceAlert`
- `totalInteractions`, `sentReceived`, `responseRate`, `avgResponseTime`

No new data — all from existing interactions + coach fields.

## 4. Edit flow

`EditCoachModal` + coach create form gain Tags input (chip editor) + Source field. Tags also inline-editable from `CoachTagsCard` (optimistic store mutation → persist).

## 5. Design tokens

Build against `docs/design/tokens.md` / `theme.css` variables and brand Tailwind utilities. No raw hex in `<style>`/inline (enforced by `npm run audit:tokens`). Exact spacing/color/radius pulled from the Figma node via `get_design_context` at implementation time (load `figma-design-to-code` skill first).

## 6. Testing

- **Unit:** `useCoachInsights` edge cases (no interactions, all inbound, tie in preferred channel, overdue boundary); coaches store tags/source mutations; Zod validators.
- **Component:** tags add/remove, alert visibility thresholds, Log Interaction prefill.
- **Migration:** RED→GREEN parity check that `tags`/`source` present + defaults correct on live `coaches`.
- Full gate: `type-check`, `lint`, `audit:tokens`, `test`; browser smoke on demo coach `453bc2a2-…` (player1@compassdemo.app).

## 7. Out of scope / deferred

- iOS implementation (handoff spec only, after web merge).
- Avatar photo upload (initials only for v1).
- Tag taxonomy / autocomplete / shared tag vocabulary (free-form chips for v1).

## Open questions

None blocking. Threshold for "Outreach Overdue" to confirm at implementation (proposal: 14 days, or reuse existing overdue logic if one exists in current metrics panel).
