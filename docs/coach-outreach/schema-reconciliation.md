# Coach Outreach seed → real schema reconciliation

Inspected live DB `xpxzhqghxecsjhvklsqg` (single prod+nonprod DB). Every place `template-library-seed.sql` and `HANDOFF.md` assume a table/column that doesn't match reality. **No migration written yet.**

> **⚠️ Read §9 + §10 first.** After reviewing the live code + data, two findings override big parts of §2–§4 below: (a) the feature already ships as `communication_templates` with a working resolver + unlock engine, and (b) most "missing" athlete fields already exist in a `user_preferences` jsonb blob. §2's "18 missing columns" framing is partly wrong — see §9.

---

## 1. Tables the seed depends on — existence check

| Seed assumes | Exists? | Reality |
|---|---|---|
| `template_variables` | ❌ | Must be created. New. |
| `message_template` | ❌ | Must be created — **but** `communication_templates` (5 live rows) already covers this space. See §7. |
| `athlete_messages` (dedupe log) | ❌ | Must be created. New. |
| `athletes` | ❌ | Athlete identity lives in **`users`** (386 rows) + **`player_profiles`** (public-profile display only). |
| `programs` | ❌ | Real table is **`schools`** (94 rows). |
| `athlete_events` | ❌ | Real table is **`events`** (school-scoped). |
| `athlete_metrics` (HANDOFF build step 1) | ❌ | Real table is **`performance_metrics`** — and its shape conflicts, see §4. |

Family model is real: `family_units` + `family_members` + `account_links`. Parents **are separate auth users**. This resolves the HANDOFF open question — the sketched `athletes.user_id` RLS assumption is wrong; policies need a family-unit join. All feature tables should carry `family_unit_id` like every other domain table.

---

## 2. Athlete identity: `athletes.*` → `users.*`

| Var | Seed source_path | Real | Note |
|---|---|---|---|
| playerName | athletes.full_name | `users.full_name` | ✓ |
| playerFirstName | athletes.first_name | ❌ none | users has only `full_name`. No first_name split anywhere except `coaches`. |
| gradYear | athletes.grad_year | `users.graduation_year` (int) | rename |
| sport | athletes.sport | `users.primary_sport_id` → `sports.name` | FK join, not a text col |
| position | athletes.position | `users.primary_position_id` → `positions.name`, else `primary_position_custom` | coalesce join |
| positionSecondary | athletes.position_secondary | `users.secondary_position_id` / `secondary_position_custom` | join |
| gpaUnweighted | athletes.gpa_unweighted | `users.gpa` (numeric) | ✓ single GPA — matches "no weighted GPA" rule |
| playerPhone | athletes.player_phone | `users.phone` | ✓ |
| playerEmail | athletes.player_email | `users.email` | ✓ |

### testLabel / testScore — conflict
Seed models one labeled pair (`test_label`, `test_score`). `users` stores **both** `sat_score` (int) and `act_score` (int) as separate columns. Resolver must pick/emit one, or the two vars become computed from whichever is present.

### Absent on `users` — no home anywhere (verified against whole schema)
`jersey_number`, `height`, `weight`, `dominant_side`, `high_school`, `club_team`, `hometown_city`, `hometown_state`, `intended_major`, `class_rank`, `ncaa_id`, `academic_honors`, `season_stat_line`, `awards`, `team_accomplishment`, `transcript_link`, `video_link`, `profile_link`.

These back **auto-fill** vars (`source_type=column`), so they can't just be authored. Each needs a real column added, OR the var is dropped/reclassified. `height`/`weight` are already `computed` in the seed but have no underlying stored value to compute from. This is the largest gap — ~18 profile columns don't exist.

- `profileLink` → derive from `player_profiles.hash_slug` / `vanity_slug` (not a stored URL).
- `transcriptLink` / `videoLink` → these map to the **`documents`** table (`type` enum, `file_url`, `school_id`, `shared_with_schools`), not a `users` column. HANDOFF build step 1 ("add `video_link` column") should reconsider — film may already belong in `documents`.

---

## 3. Contacts — mostly absent

`hsCoachName/Phone/Email`, `clubCoachName/Phone/Email`: **none exist.** The `coaches` table is **college** coaches (`school_id` FK, the recruiting targets), not the athlete's own HS/club coaches. Storing the athlete's own coaches needs new columns on `users` or a new table. Six contact vars have no backing.

---

## 4. Metrics — load-bearing product-rule violation ⚠️

`performance_metrics` real shape: `metric_type` (text), **`value` (numeric)**, `unit` (text), `recorded_date` (date), `verified` (bool), `notes` (text), `event_id`.

- **`value` is `numeric`.** Product rule #2 (HANDOFF) demands **text** to hold `1:52.4`, `.948`, `6'2"`, `92.1 mph`. Direct conflict, and it's called out as non-negotiable. Options: add `numeric_value` inverse of what the rule suggests, or add a `text_value`/store display string — but the existing numeric column + 3 live rows + downstream code make an in-place type change risky. **Decision needed before any resolver work.**
- **No `source` column** (e.g. "HitTrax"). Product rule #3 requires provenance on every rendered metric (`92.1 mph (HitTrax, Jun 2026)`). `verified` bool ≠ source. `notes` is the only free-text candidate.
- **No `is_primary` flag.** `carryingTool` (the single best number leading the subject line) has nothing to select on.
- Mappable: `metric_type`→label, `recorded_date`→measured_on, `verified`→is_verified, `unit` exists.

HANDOFF's `athlete_metrics {label,value,source,measured_on,is_verified,is_primary}` ≈ `performance_metrics` + `source` + `is_primary` + a text value path. Either extend `performance_metrics` or the new table shadows it (bad — two metric stores).

---

## 5. Program: `programs.*` → `schools.*`

| Var | Seed | Real | Note |
|---|---|---|---|
| coachFirstName | coaches.first_name | `coaches.first_name` | ✓ |
| coachLastName | coaches.last_name | `coaches.last_name` | ✓ |
| coachTitle | coaches.title | `coaches.role` enum (`head`\|`assistant`\|`recruiting`) | **no `title` col**; enum, not free text |
| schoolName | programs.school_name | `schools.name` | rename |
| division | programs.division | `schools.division` (enum) | ✓ |
| conference | programs.conference | `schools.conference` | ✓ |
| schoolCity | programs.city | `schools.city` | ✓ |
| schoolState | programs.state | `schools.state` | ✓ |
| schoolTwitter | programs.twitter_handle | `schools.twitter_handle` | ✓ |
| schoolShortName | programs.short_name | ❌ none | absent |
| programMascot | programs.mascot | ❌ none | absent |

Note: `coaches`/`schools` are **user-scoped saved records** (`user_id`, `family_unit_id`), not a global directory — fine for the feature, but recipient selection reads from the athlete's own saved schools/coaches.

---

## 6. Event: `athlete_events.*` → `events.*`

| Var | Seed | Real | Note |
|---|---|---|---|
| eventName | athlete_events.name | `events.name` | ✓ |
| eventLocation | athlete_events.location | `events.location` (+ address/city/state) | ✓ |
| eventDates | computed | `events.start_date` / `end_date` | ✓ |
| visitDate | athlete_events.starts_on | `events.start_date` | **`start_date`**, not `starts_on` |
| teamAtEvent | athlete_events.team_name | ❌ none | absent |
| roleNote | athlete_events.role_note | ❌ none | `events` has `performance_notes`/`description` |
| rosterLink | athlete_events.roster_link | ❌ none | `events.url` is the closest |

**Event slots** (HANDOFF: per-slot opponent/field/heat rows powering `eventSchedule`) — no such table. `events` is one flat row. The multi-slot schedule renderer has no data model yet.

---

## 7. Existing overlap: `communication_templates` (5 live rows) 🔶

Already exists, already a shipped feature: `name`, `description`, `type`, `subject`, `body`, `tags[]`, `unlock_conditions` (jsonb), `is_predefined`, `is_favorite`, `use_count`, `user_id`.

The seed's `message_template` duplicates this space (slug/channel/stage/subject_template/body_template/required_variables/contact_window). **Decision before migration:** extend `communication_templates` (add `slug`, `channel`, `contact_window`, `required_variables`, `stage`, template-variable syntax) vs. stand up a parallel `message_template`. Two template tables is a smell; `unlock_conditions` may already model part of `contact_window`.

---

## 8. `managed_by_parent` — product rule #8

No such column (verified whole schema). The parent-sent-warning driver doesn't exist. It's derivable from the family model: sender's `family_members.role` / `users.role` vs. the profile owner. Rule #8 needs re-specced against `family_units`/`family_members`, not a boolean flag.

---

## Summary of decisions blocking a correct migration

1. **`performance_metrics.value` numeric vs. required text** — the one that breaks a stated non-negotiable. (§4)
2. **~18 missing athlete profile columns** — add to `users`, or drop/reclassify the vars. (§2)
3. **HS/club coach contacts** — new storage or drop 6 vars. (§3)
4. **`message_template` vs. extend `communication_templates`.** (§7)
5. **Event slots table** — needed for `eventSchedule`, doesn't exist. (§6)
6. **RLS shape** — family-unit join, parents are separate users. (§1)
7. Mechanical renames (gradYear, schoolName, coachTitle→role, start_date, sport/position joins) — cheap, do in bulk once 1–6 decided.

---

## 9. CORRECTION — most "missing" fields exist in `user_preferences` jsonb

`user_preferences` is a generic EAV: `(user_id, category, data jsonb)`. Category **`player`** holds the athlete profile blob. Live keys observed:

`graduation_year, gpa, sat_score, act_score, primary_sport, primary_position, positions, height_inches, weight_lbs, high_school, club_team, travel_team_name, travel_team_coach, travel_team_year, bats, throws, ncaa_id, video_links, twitter_handle, instagram_handle, tiktok_handle, facebook_url, school_city, school_state, prep_baseball_id, perfect_game_id, nces_school_id, core_courses, cost_sensitivity, campus_size_preference, allow_share_phone, allow_share_email, ninth/tenth/eleventh/twelfth_grade_coach, ninth/tenth/eleventh/twelfth_grade_team`

Impact on §2/§3:

- **Have a home (jsonb):** height (`height_inches`), weight (`weight_lbs`), `high_school`, `club_team`, dominant_side (`bats`/`throws`), `ncaa_id`, videoLink (`video_links`), school social handles, **HS/club coach contacts** (grade-specific + travel). §3's "6 contact vars have no backing" is **wrong** — they exist as `*_grade_coach` / `travel_team_coach`.
- **Duplicated (jsonb AND `users` column):** `graduation_year`, `gpa`, `sat_score`, `act_score`, sport, position. Drift risk; canonical source undecided.
- **Still genuinely absent everywhere:** `jersey_number`, `intended_major`, `class_rank`, `academic_honors`, `season_stat_line`, `awards`, `team_accomplishment`.
- **Caveats:** jsonb is sparse (fill counts n=1–8 of ~22 populated rows), untyped, unvalidated. `school_city`/`school_state` likely = the athlete's HS location, not a clean hometown (§2 `hometownCity/State` maps here ambiguously).

**This reopens Decision #2 (new fields).** It's no longer "add 18 columns." It's: for each var, does the resolver **read the existing `player` jsonb**, or do we **promote fields to typed `users` columns** (validated, no drift) and backfill from jsonb? Recommendation: promote the handful the templates lean on hardest + validate; read the long tail from jsonb; add only the ~7 truly-absent ones.

---

## 10. CORRECTION — feature already ships; resolver is ad-hoc, not registry-driven

`communication_templates` is a live, shipped feature. Wiring (verified in code):

- **Resolver:** regex `{{key}}` replace over a hand-built `Record<string,string>`, **duplicated 3×** — `composables/useCommunicationTemplates.ts:301` (`renderTemplate`), `components/CommunicationPanel.vue:447`, `components/TemplateSendModal.vue:177`. Values assembled per-call-site from component props, **not** from a DB registry.
- **Variable catalog:** static TS array `utils/templateVariables.ts:13` — 11 vars, no source-column mapping, no `gpa`/authored/computed types. The seed's 77-var DB registry with `source_path` is **unwired design only**.
- **Unlock engine (reuse this):** `useCommunicationTemplates.ts:363-520` — extensible `switch` over `profile_field | document_exists | task_completed | school_count`, AND/OR groups, progress %. This is the real analog of `contact_window` + `required_variables`.
- **Sending:** **no `server/api` endpoint.** Client-side `mailto:` / `window.open` (`CommunicationPanel.vue:513,543`) or `emit('send')` to parent. Texts/social = copy-only. **Nothing logs a send today** → `programNote` dedupe (rule #6) has no backing; `athlete_messages` is net-new and can only log optimistically at button-press.
- **Types:** `types/models.ts:638` `CommunicationTemplate`; generated `types/database.ts:394`.
- **Tests:** `tests/unit/composables/useCommunicationTemplates*.spec.ts`, `utils/templateVariables.spec.ts`, `components/TemplateEditor.spec.ts`, `pages/coaches-id-communications.spec.ts`.

**Engineering reality:** making 77 vars data-driven means **building the central resolver** (registry read + `source_path` → value mapping across users/jsonb/schools/coaches/events/computed) and collapsing the 3 duplicate interpolators into it. That's the core work — bigger than the seed migration.
