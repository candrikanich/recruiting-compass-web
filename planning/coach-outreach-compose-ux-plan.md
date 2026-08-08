# Coach Outreach — compose UX plan (Slice 5)

Make the seeded templates usable: every variable visible with its value, editable where it's the athlete's own data, computed values editable-or-linked, a live preview with unresolved vars bolded, and a send gate that blocks half-templated email reaching a coach.

Builds on: `utils/templateResolver.ts` (resolve + `findUnresolved`), `composables/useTemplateResolver.ts` (registry + athlete context), `template_variables` registry, Phase-1 typed users columns. Live in `components/CommunicationPanel.vue`.

Agreed UX (Chris, 2026-08-07):
1. **Live preview pane** — rendered message under the editable body; unresolved `{{…}}` shown **bold** (textarea can't style inline, so preview carries the highlight + is "what the coach sees").
2. **Inline edit where possible**, with a **link to the entry section** as backup.
3. **Computed values** — allow editing the underlying field(s) inline where a single source exists, else **link to where it's entered**.

---

## Variable edit-behavior model (the crux)

Derived from `source_type` + `source_path`, plus one new registry column for computed vars.

| Kind | Detect | Compose behavior | Write target |
|---|---|---|---|
| Profile column | `column:users.*` | inline edit | PATCH `users.<col>` |
| Profile pref | `pref:player.*` | inline edit | PATCH `user_preferences(player).data.<key>` |
| Authored | `source_type=authored` | inline fill (this message only) | none (compose state) |
| Computed w/ single source | `source_type=computed` + new `edit_path` | inline edit of the underlying field | PATCH per `edit_path` |
| Computed w/ no single source | `source_type=computed` + new `edit_link` | **link** to the profile section | — (navigate) |
| Coach/school/event/system | rest | read-only | — |

**Schema add (Phase-0-style migration):**
```sql
alter table template_variables
  add column if not exists edit_path text,   -- underlying writable source for a computed var, e.g. 'column:users.height_inches'
  add column if not exists edit_link text;    -- route to where it's entered, e.g. '/profile#athletics'
```
Seed values (examples): `height`→edit_path `column:users.height_inches`; `weight`→`column:users.weight_lbs`; `testScore`→edit_path users.act_score||sat_score (pick), `sport`/`position`→edit_link `/profile#athletic` (FK pickers, not free-text); `metrics`/`carryingTool`/`metricsAsOf`→edit_link `/profile#metrics` (sub-editor); `hsCoachName`→edit_link profile; `profileLink`/`schoolShortName`/`playerFirstName`/system→read-only.

---

## Write-back (reverse resolver)

New `composables/useProfileFieldWrite.ts`: `writeField(sourcePath, value, athleteUserId)` dispatching on prefix —
- `column:users.<col>` → `update users set <col>=value where id=athleteUserId`
- `pref:player.<key>` → upsert `user_preferences(category='player')`, set `data.<key>` (the Phase-1 trigger then syncs to the typed column automatically).
After write: re-run `buildAthleteContext` (or patch ctx locally) → re-resolve → preview updates.

**OPEN — family write perms.** Athlete-role editing own row = fine. **Parent composing for a child** writing the child's `users`/prefs — needs the RLS UPDATE policy to allow it (users UPDATE is family-model? verify). If not allowed yet, gate inline-edit to athlete-role, parents get the link-to-section fallback. Decide before 5c.

---

## Slices (tracer order)

- **5a — Variables panel (read).** Replace the broken 4-prop box with the full registry: grouped `{{key}} = value`, empties flagged. Uses `loadRegistry` + resolved `values`. No edit yet. *(fastest visible win)*
- **5b — Live preview + send gate (A).** Preview pane renders body; `findUnresolved` → bold the gaps; block `sendEmail`/`sendText` when any remain, listing them.
- **5c — Inline edit: profile column/pref.** Edit affordance on `column:users.*` / `pref:player.*` vars → `useProfileFieldWrite` → re-resolve. Gated by family-write decision above.
- **5d — Computed edit-or-link + authored fill.** `edit_path` → inline edit underlying; `edit_link` → navigate; authored → message-only fill. Needs the registry `edit_path`/`edit_link` migration + seed.
- **5e — Polish.** Persist authored `programNote` etc. only into the message/`athlete_messages` (Phase 4), never profile.

Ship 5a+5b first (whole thing becomes legible + safe-to-send) — they need no schema change and no write perms. 5c–5d add editing.

---

## Open questions
1. Parent-composing-for-child: can a parent write the child's profile fields? (RLS `users` UPDATE + `user_preferences` UPDATE policy check.) Fallback = link-only for parents.
2. `metrics` editing — full sub-editor is out of scope for compose; link to the metrics section. Confirm.
3. `testScore`/`testLabel` — user has both sat_score+act_score; inline edit which? Likely edit both via a small two-field control, or link to academics.
