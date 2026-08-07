# Coach Outreach — migration & build plan

Ordered plan to wire `template-library-seed.corrected.sql` into the **existing** `communication_templates` feature. Nothing here is applied yet. Live DB `xpxzhqghxecsjhvklsqg` (single prod+nonprod — every apply is a prod write; use Supabase MCP `apply_migration`, not `db push`, per known drift).

Decisions driving this plan (locked 2026-08-07): extend `communication_templates` (not a new table) · metric values support text + `source` + `is_primary` · promote hot athlete fields to typed `users` columns, jsonb fallback for the tail · keep `mailto:` send + log optimistically · build one registry-driven resolver. See `schema-reconciliation.md` §9/§10.

---

## `source_path` convention (resolver contract)

`template_variables.source_path` uses a typed prefix so one resolver can dispatch:

| Prefix | Meaning | Example |
|---|---|---|
| `column:` | direct SQL column on a resolved entity | `column:users.full_name`, `column:schools.name`, `column:coaches.role` |
| `pref:` | `user_preferences` row `category='player'`, key in `data` jsonb | `pref:player.height_inches` |
| `computed` | assembled by resolver (source_type=`computed`, path null) | metrics block, salutation, schedule |
| `authored` | athlete writes at compose (source_type=`authored`) | `programNote` |
| `system` | generated at render | `todayDate` |

Entities resolved per compose: **athlete** = the profile owner (`users` + `user_preferences.player`), **program** = selected `schools` row, **coach** = selected `coaches` row, **event** = selected `events` row.

Where a field exists in **both** `users` and `pref:player` (graduation_year, gpa, sat_score, act_score, sport, position): **`users` is canonical**, resolver reads column first, jsonb fallback only if column null. Promotion migrations (Phase 1) backfill users from jsonb so the column is authoritative.

---

## Phase 0 — extend `communication_templates` (no new template table)

Per `claude/database.md`: enums as **CHECK constraints, not PG enums**; add columns **nullable**; **index every filter/order column** in the same migration; regen `types/database.ts` after.

```sql
alter table communication_templates
  add column if not exists slug              text,
  add column if not exists stage             text,
  add column if not exists contact_window    text not null default 'any',
  add column if not exists required_variables jsonb not null default '[]'::jsonb,  -- authored keys gating SEND
  add column if not exists send_timing_note  text,
  add column if not exists length_target     text,
  add column if not exists sort_order        integer not null default 0;

alter table communication_templates
  add constraint communication_templates_contact_window_chk
    check (contact_window in ('pre','post','any')) not valid,
  add constraint communication_templates_stage_chk
    check (stage is null or stage in
      ('intro','update','event','post_event','thanks','nudge','reply','visit','status','decision','social')) not valid;
-- validate after the seed loads clean rows:
--   alter table communication_templates validate constraint communication_templates_contact_window_chk;
--   alter table communication_templates validate constraint communication_templates_stage_chk;

-- slug arbiter for the seed upsert (partial: legacy 5 rows have no slug)
create unique index if not exists communication_templates_slug_key
  on communication_templates (slug) where slug is not null;
-- filter/order columns used by the picker:
create index if not exists communication_templates_stage_window_idx
  on communication_templates (stage, contact_window);
create index if not exists communication_templates_sort_idx
  on communication_templates (sort_order);
```

Mapping seed→existing columns: `title`→`name`, `channel`→`type` (reuse; do **not** add `channel`), `subject_template`→`subject`, `body_template`→`body`. `is_predefined=true` for all 33. The seed upserts with `on conflict (slug) where slug is not null` — matches the partial index arbiter.

**`type` domain (verified live):** existing CHECK = `email | message | phone_script`. So email→`email`, texts→`message`, and `social` is a **new value** — extend the constraint before the seed loads:

```sql
alter table communication_templates drop constraint communication_templates_type_check;
alter table communication_templates add constraint communication_templates_type_check
  check (type in ('email','message','phone_script','social'));
```

**Legacy 5 rows (decided):** retire the 4 the 33 replace; keep the 1 with no replacement. Run **after** the 33 are seeded + verified:

```sql
delete from communication_templates
where is_predefined = true and slug is null
  and name in ('Introductory Email','Follow-Up Email','Event Recap Email','Performance Update Email');
-- KEEP 'Strong Interest Expression' — no equivalent in the 33 (pre-offer "top choice"; status-check is a different intent).
-- Give it a slug so it lives in the new schema alongside the 33:
update communication_templates set slug = 'strong-interest', stage = 'status', contact_window = 'post'
where name = 'Strong Interest Expression' and slug is null;
```

Its variables (`{{schoolName}}`, `{{coachLastName}}`, `{{playerName}}`) already resolve under the new registry. Don't `NOT NULL` slug — legacy user-created templates may still lack one.

**Variable registry table** (seed Section 1 upserts into this — create it here):

```sql
create table if not exists template_variables (
  key                 text primary key,
  label               text not null,
  description         text,
  category            text not null,   -- player|academics|metrics|contacts|program|event|authored|system
  source_type         text not null,   -- column|computed|authored|system
  source_path         text,            -- see source_path convention above; null for computed/authored/system
  is_required_default boolean not null default false,
  example             text,
  sort_order          integer not null default 0,
  constraint template_variables_source_type_chk
    check (source_type in ('column','computed','authored','system'))
);
create index if not exists template_variables_category_idx on template_variables (category);
```

Global reference data (no `user_id`/`family_unit_id`): RLS = read-all for authenticated, writes service-role only.

**Deviation flagged (honesty):** the decision said "fold `required_variables` into `unlock_conditions`." Kept as a **separate column** instead, because they are two different gates at two different moments: `unlock_conditions` = template **visibility** (profile completeness / docs / school count — existing engine, untouched); `required_variables` = **send-button** gate on authored fields at compose time. Merging them would overload the visibility engine with compose-state it can't see. `contact_window` similarly stays a column (selection logic, not a lock). Net: still one table, existing engine reused for what it's good at.

Verify before apply: current `type` values + any check constraint (seed adds `text`, `social` alongside `email`).

---

## Phase 1 — promote hot athlete fields to typed `users` columns

Add + backfill from `user_preferences.player` jsonb. Users becomes canonical; resolver keeps jsonb fallback for the long tail.

```sql
alter table users
  add column if not exists jersey_number   text,
  add column if not exists height_inches   integer,
  add column if not exists weight_lbs      integer,
  add column if not exists high_school     text,
  add column if not exists club_team       text,
  add column if not exists dominant_side   text,   -- "R/R", bats/throws, stroke side, stance
  add column if not exists hometown_city   text,
  add column if not exists hometown_state  text;
-- backfill (idempotent) from pref jsonb; dominant_side composed from bats/throws
update users u set
  height_inches  = coalesce(u.height_inches, (p.data->>'height_inches')::int),
  weight_lbs     = coalesce(u.weight_lbs,    (p.data->>'weight_lbs')::int),
  high_school    = coalesce(u.high_school,    p.data->>'high_school'),
  club_team      = coalesce(u.club_team, p.data->>'club_team', p.data->>'travel_team_name'),
  dominant_side  = coalesce(u.dominant_side,
                     nullif(concat_ws('/', p.data->>'bats', p.data->>'throws'), ''))
from user_preferences p
where p.user_id = u.id and p.category = 'player';
```

**Read from jsonb, no promotion** (long tail / low value / sparse): `ncaa_id`, `video_links`, social handles, grade-specific HS coach contacts (`*_grade_coach`/`_team`, `travel_team_coach`), external IDs. Resolver reads `pref:player.<key>`.

**Truly absent — decide add-column vs authored-at-compose** (all sparse-benefit): `intended_major`, `class_rank`, `academic_honors`, `season_stat_line`, `awards`, `team_accomplishment`. Recommend authored-at-compose initially (they're episodic, not stable profile) → they move to `source_type='authored'` in the registry, no column. `jersey_number` promoted (stable).

`gpa`/`graduation_year`/`sat_score`/`act_score`: already `users` columns — Phase 1 just backfills any jsonb-only values, then treat users as canonical (kills the drift).

---

## Phase 2 — metrics: text value + provenance on `performance_metrics`

Honor product rule #2 without breaking the existing numeric column or its 3 rows.

```sql
alter table performance_metrics
  add column if not exists display_value text,     -- "1:52.4", "6'2\"", "92.1 mph" — render source of truth
  add column if not exists source        text,     -- "HitTrax", "Perfect Game" (rule #3 provenance)
  add column if not exists is_primary    boolean not null default false;  -- carrying tool = subject-line number
alter table performance_metrics alter column value drop not null;  -- text-only metrics have no numeric
-- backfill display_value from existing numeric+unit
update performance_metrics
  set display_value = coalesce(display_value, trim(concat(value::text, ' ', unit)))
  where display_value is null;
```

- `value` (numeric) stays for math/division-fit; `display_value` (text) is what templates render. New non-numeric metrics store `display_value` only.
- Resolver `renderMetrics`: pick `is_primary` for `carryingTool`; cap rendered block at 4 (product rule #4, enforce in resolver); format `display_value (source, recorded_date)`; drop unverified from prominence per rule #3.
- Enforce **one** `is_primary=true` per athlete (partial unique index or app guard).

---

## Phase 3 — central registry-driven resolver (the core engineering)

Replace the 3 ad-hoc interpolators (`useCommunicationTemplates.ts:301`, `CommunicationPanel.vue:447`, `TemplateSendModal.vue:177`) with one resolver.

1. Load `template_variables` registry (cache).
2. `resolveVariables(athleteId, { schoolId, coachId, eventId })` → `Record<key,string>` by dispatching on `source_path` prefix (column/pref/computed/authored/system).
3. Computed handlers: `renderMetrics`, `carryingTool`, `metricsAsOf`, `coachSalutation` (Coach + last_name default), `renderSchedule` (Phase 6), `height`/`weight` formatters, `seasonLabel`, `contactWindowDate`, `daysSinceContact`.
4. `renderTemplate(body, resolved)` = existing regex, now fed centrally. Delete duplicates; keep one exported fn.
5. Extend `utils/templateVariables.ts` to hydrate from the DB registry instead of the static 11-entry array (or replace it).
6. Validation (blocking): any surviving `{{unresolved}}`; empty `required_variables`; >1 recipient program. (Warnings: managed-by-parent, >4 metrics, recent-contact, 3rd nudge.)

Tests: extend `useCommunicationTemplates*.spec.ts`, `templateVariables.spec.ts`; cover resolver source dispatch + cap-at-4 + salutation default.

---

## Phase 4 — `athlete_messages` send log + `programNote` dedupe

Net-new. Powers rule #6 (highest-value guardrail) + follow-up timing. Logged optimistically on the `mailto:` click (send decision: keep mailto).

```sql
create table if not exists athlete_messages (
  id uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  family_unit_id uuid references family_units(id),
  school_id      uuid references schools(id),
  coach_id       uuid references coaches(id),
  template_slug  text,
  channel        text,
  program_note   text,       -- for cross-program dedupe (rule #6)
  update_hook    text,
  subject        text,
  body           text,
  sent_at        timestamptz not null default now(),
  created_by     uuid,
  created_at     timestamptz not null default now()
);
-- family-scoped RLS like every domain table; index for dedupe + timing lookups
create index if not exists athlete_messages_user_school_idx on athlete_messages (user_id, school_id, sent_at desc);
```

Blocking check: `programNote` matches a prior `athlete_messages.program_note` for a **different** `school_id` → block (BCC tell). Warning: follow-up to a program contacted < 7 days; 3rd unanswered nudge → suggest "add more programs".

RLS: family-unit membership (parents are separate auth users — `family_members`), not `athletes.user_id`. `managed_by_parent` warning (rule #8) derived from sender's `family_members.role` vs profile owner.

---

## Phase 5 — per-sport contact-window config

Drives `intro-pre-window` vs `intro-standard` auto-swap. **Config table, never hardcoded dates** (they move yearly — verify at ncaa.org before launch).

```sql
create table if not exists contact_window_rules (
  id uuid primary key default gen_random_uuid(),
  sport        text not null,
  division     text not null,       -- 'D1','D2','D3','NAIA','NJCAA'
  rule_kind    text not null,       -- 'date_before_grade' | 'unrestricted' | 'date_after_grade'
  reference    text,                -- e.g. 'junior' | 'sophomore'
  window_date  text,                -- e.g. 'Aug 1' — display; computed to real date per athlete gradYear
  notes        text,
  unique (sport, division)
);
```

Seed (baseball-first, the app's primary sport):
- Baseball / D1 → Aug 1 **before** junior year.
- Softball / D1 → Sept 1 junior year.
- Football / D1 → Sept 1 junior (materials Jun 15 after soph).
- Default D1 (other) → Jun 15 after sophomore (text/email/social).
- D2 → electronic ~unrestricted.
- D3 / NAIA / NJCAA → unrestricted (no NCAA rule).

Selection: `division + sport + gradYear` → if coach can't reply yet, show `contact_window='pre'` template. Athlete never learns the rule exists.

---

## Phase 6 — event schedule slots (last; only unblocks `eventSchedule`)

`events` is one flat row; missing `team_name`, `role_note`, `roster_link`, and any per-slot breakdown (opponent/field/heat). Add a child `event_slots` table (or JSON on events) for the multi-row `renderSchedule`. Lowest priority — every template except the schedule-heavy ones works without it. Defer unless schedule rendering is needed for launch.

---

## Sequencing

Phases **0–3 are the launch-critical path** (templates render from real data). 4 adds the guardrails. 5 adds the pre-window intelligence. 6 is optional polish. Apply one phase per migration via Supabase MCP; RED→GREEN an integration test per schema phase before the next.
