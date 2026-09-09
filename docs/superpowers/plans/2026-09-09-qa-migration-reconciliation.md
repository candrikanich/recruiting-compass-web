# QA Migration History Reconciliation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the QA Supabase project's (`xpxzhqghxecsjhvklsqg`) migration-tracking table (`supabase_migrations.schema_migrations`) with the repo's `supabase/migrations/*.sql` files, so `supabase db push` — and the new `migrate-qa-e2e.yml` CI workflow — can run cleanly against QA without erroring on history mismatch.

**Architecture:** This is metadata-only reconciliation, not a schema change. QA's history diverged from the repo because migrations were historically applied via Supabase MCP `apply_migration` (which stamps the *apply time* as the version) while the repo's `supabase/migrations/` files were later renamed/retimed (collision avoidance, cleanup passes — see `claude/database.md`). The actual schema on QA is correct and live; only the *tracking table*, which the CLI uses to decide what still needs pushing, is out of sync. Fix by: (a) telling the tracking table "this repo file's version IS this already-applied migration" for confirmed renames (`migration repair --status applied`), (b) dropping tracking rows for confirmed dead/superseded duplicate applies (`migration repair --status reverted`), and (c) only running a real `db push` for migrations that are genuinely never-applied.

**Tech Stack:** Supabase CLI (`migration repair`, `db push`), Supabase MCP (`list_migrations`, `execute_sql` for read-only verification — the account driving this doesn't need the DB password since MCP auth is separate from the CI secrets), the repo's `supabase/migrations/` directory as source of truth for file content.

**Spec:** No separate spec doc — this plan **is** the spec, based on today's live diff between QA's `list_migrations` output and the repo's migration filenames (recruiting-compass-web, `develop` branch, 2026-09-09).

## Global Constraints

- **Never run `db push` against QA blind.** Every migration pushed for real must first be confirmed genuinely unapplied (Task 3/4), not assumed.
- **Every `migration repair` action is metadata-only** — it edits `supabase_migrations.schema_migrations`, never the schema itself. Confirm this understanding before running one (see Task 1/2 procedure).
- **e2e project (`ahpethltxopkjxxzwmmb`) is explicitly OUT of scope for this plan.** It has its own, likely-different drift and needs its own diff + plan. Do not touch it here.
- Use the Supabase MCP tools (`mcp__claude_ai_Supabase__list_migrations`, `execute_sql`, `apply_migration`) for all read-only verification and metadata repair in this plan — not the CLI — since the executing session has MCP access but not the CI job's DB password.
- Record every repair action taken in `claude/database.md` under a new dated entry, same convention as prior migration work in that file (`claude/database.md:148-204`).

---

## Background: the full diff (as of 2026-09-09)

Ran `list_migrations` (project `xpxzhqghxecsjhvklsqg`) against the repo's 112 `supabase/migrations/*.sql` filenames. **Revision note:** the first version of this plan matched on version number alone in one place, which silently mispaired one entry (see Task 0 below). This section reflects the corrected, script-verified diff (a straight `version -> name` dict comparison, not hand-matching).

- **35 entries** match exactly (same version, same name) on both sides — no action needed, not covered by this plan.
- **4 entries** are version *collisions*: the same version number exists both sides but names differ — the version number is not a valid identity key for these, each needs individual resolution — **Task 0**.
- **6 entries** are remote-only versions whose *name* has an exact canonical match elsewhere in both sides (i.e., a confirmed-dead superseded duplicate apply) — **Task 1**.
- **57 entries** are remote-only versions that pair 1:1 by unique name with a local-only version (a confirmed rename — same migration, different timestamp) — **Task 2**. (One of these, `drop_coaches_availability`, has *two* remote-only versions mapping to the same one local file; the extra one is reverted as part of Task 2 itself, once its pair exists — see Task 2's note.)
- **11 remote-only + 16 local-only entries** don't pair cleanly (near-name matches, or no match at all) — **Task 3**, needs real verification before any action. (`coach_tags_source`, `20260825151841`, moved here from the original plan's Task 1 — it is not actually superseded, see Task 0.)

## Task 0: Resolve the 4 version collisions

**Files:** None in the repo — read-only investigation, decisions recorded in `claude/database.md`.

**Interfaces:**
- Consumes: nothing from other tasks. Do this first — Tasks 1/2 depend on trusting `clean` (version+name agreeing) as a safe no-op set, and these 4 versions looked clean under version-only matching in the first plan draft.
- Produces: a resolution decision per collision, recorded before Task 1 proceeds.

| Version | Repo file says | QA tracking table says |
|---|---|---|
| `20260315000001` | `remove_private_notes` | `add_device_tokens` |
| `20260315000002` | `remove_responsiveness_score_from_coaches` | `add_notification_preferences` |
| `20260315000003` | `remove_fit_score_from_schools` | `add_push_trigger` |
| `20260825000000` | `coach_tags_source` | `cron_runs` |

Same version, same day, completely unrelated content — these are two different migrations that happened to land on the same timestamp far enough apart in the repo's history that no one caught the collision at the time (the repo file is presumably now the canonical/renamed one and the remote name is what was actually run under that stamp — but that must be confirmed, not assumed, since the CLI/tracking table only ever sees one name per version).

- [ ] **Step 1: For each collision, confirm which content is actually live on QA**

  The `remote` name is what's actually recorded as applied. Check whether the object(s) it implies exist:

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: SELECT column_name FROM information_schema.columns
           WHERE table_name = 'device_tokens' AND column_name IS NOT NULL
           LIMIT 5;
  ```

  (Adjust per row — `add_notification_preferences`/`add_push_trigger` similarly via `information_schema.columns`/`pg_trigger`; `cron_runs` via `to_regclass('public.cron_runs')`.) Then check whether the *repo's* version of that same migration was also, separately, actually applied under a **different** version number (i.e., is `coach_tags_source`'s effect — a `tags`/`source` column on `coaches` — already live under some other timestamp, meaning this collision is otherwise harmless because the real content landed correctly elsewhere)?

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: SELECT column_name FROM information_schema.columns
           WHERE table_name = 'coaches' AND column_name IN ('source', 'tags');
  ```

- [ ] **Step 2: Record the resolution**

  For each of the 4, write one line in `claude/database.md`: which content is live, whether the repo-side migration ever actually ran (under this or another version), and whether any action is needed (likely none — these look like historical version-number coincidences where both migrations' real effects already landed correctly under their own separate applied versions; this step is confirming that, not fixing anything).

## Task 1: Revert confirmed-dead superseded duplicates

**Files:** None in the repo — this is a live-DB metadata operation via MCP, recorded afterward in `claude/database.md`.

**Interfaces:**
- Consumes: Task 0 resolved first (confirms `clean`/collision set is trustworthy).
- Produces: 6 rows removed from QA's `supabase_migrations.schema_migrations`. (`coach_tags_source` at `20260825151841` was in the original draft of this table — removed, see Task 3; it is a collision-adjacent case, not a confirmed supersede. `drop_coaches_availability`'s duplicate at `20260813212642` was also in the original draft — moved to Task 2, since its canonical target `20260824000000` doesn't exist on QA until Task 2 creates it.)

These 6 versions are remote-only, and their **name** has an exact `version|name` match already present on both QA and the repo (i.e., the migration was re-applied later under the correct, now-canonical timestamp — these are leftover dead rows from an earlier, superseded attempt). Verified live on QA today (2026-09-09) via `list_migrations`:

| Dead remote version | Name | Canonical version (confirmed present on QA today) |
|---|---|---|
| `20260801210413` | `family_unit_id_columns_trigger_backfill` | `20260805000000` |
| `20260801210433` | `family_policies_additive` | `20260808000000` |
| `20260802142113` | `cutover_interactions_schools_delete` | `20260812000000` |
| `20260802143749` | `cutover_deferral_a_drop_legacy` | `20260815000000` |
| `20260816190054` | `minor_requires_family_invite` | `20260822000000` |
| `20260828145925` | `school_recommendations` | `20260912000000` |

- [ ] **Step 1: Verify each dead version's canonical counterpart is really present on QA**

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: SELECT version, name FROM supabase_migrations.schema_migrations
           WHERE version IN (
             '20260805000000','20260808000000','20260812000000','20260815000000',
             '20260822000000','20260912000000'
           )
           ORDER BY version;
  ```

  Expected: all 6 rows returned, names matching the table above. If any is missing or misnamed, STOP — do not revert its dead pair below; that name needs Task 3-style investigation instead.

- [ ] **Step 2: Delete the 6 dead tracking rows**

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: DELETE FROM supabase_migrations.schema_migrations
           WHERE version IN (
             '20260801210413','20260801210433','20260802142113','20260802143749',
             '20260816190054','20260828145925'
           );
  ```

  This is what `supabase migration repair --status reverted <version>` does under the hood — a plain metadata delete, no schema impact.

- [ ] **Step 3: Verify**

  ```
  mcp__claude_ai_Supabase__list_migrations
    project_id: xpxzhqghxecsjhvklsqg
  ```

  Expected: none of the 6 dead versions appear in the result; the 6 canonical versions still do.

- [ ] **Step 4: Record in claude/database.md**

  Add a dated entry (`### QA migration history reconciliation — 2026-09-09`) listing the 6 reverted dead versions and why, following the existing convention in that file.

## Task 2: Repair confirmed renames (mark local version as applied)

**Files:** None in the repo — live-DB metadata via MCP.

**Interfaces:**
- Consumes: Task 1 complete (confirms the dead-row-removal pattern is safe).
- Produces: 57 new rows in QA's `supabase_migrations.schema_migrations`, one per local-only version below, each tagged with the corresponding repo file's name; plus 1 additional dead-row delete (`20260813212642`, `drop_coaches_availability`'s duplicate remote apply — its canonical pair `20260813203944 -> 20260824000000` is in the list below; this extra row can only be safely reverted *after* `20260824000000` exists, i.e. after this task's Step 2, so it's folded into this task's Step 3 rather than Task 1).

Full list (`remote-only version -> local-only version (name)`) — these are the same migration, same content, applied on QA under the left-hand timestamp, present in the repo under the right-hand timestamp:

```
20260730193858 -> 20260730000000  (security_advisor_warn_hardening)
20260807163249 -> 20260816000000  (coach_outreach_phase0_1)
20260807164130 -> 20260817000000  (coach_outreach_phase2_metrics)
20260808150439 -> 20260818000000  (drop_users_phone)
20260808151514 -> 20260819000000  (create_athlete_messages)
20260808160320 -> 20260820000000  (contact_window_rules)
20260809180932 -> 20260821000010  (family_shared_player_prefs_rls)
20260809180956 -> 20260821000100  (reconcile_parent_player_owned_prefs)
20260809183945 -> 20260821000200  (family_shared_profile_photo)
20260809223921 -> 20260819000200  (video_links_table)
20260809223934 -> 20260819000300  (video_links_backfill)
20260810143510 -> 20260821000020  (video_links_platform_other)
20260812193101 -> 20260822000020  (schools_phone)
20260813190030 -> 20260823000000  (schools_athletics_url)
20260813203944 -> 20260824000000  (drop_coaches_availability)
20260814193258 -> 20260814000000  (drop_social_media_posts)
20260816175930 -> 20260907182429  (notify_offer_inbound_event)
20260816180754 -> 20260821000000  (enforce_minimum_age)
20260816193735 -> 20260825000010  (cron_runs)
20260817141559 -> 20260829000000  (admin_audit_log)
20260817142318 -> 20260826000000  (allow_family_members_create_interactions)
20260817143529 -> 20260826000001  (allow_linked_parents_write_athlete_tasks)
20260818235600 -> 20260827000000  (add_school_outreach_notes)
20260819215004 -> 20260827000001  (school_questionnaire_completion)
20260820185627 -> 20260828000000  (family_invitations_invited_by_cascade)
20260821185108 -> 20260828000001  (advance_school_status_on_interaction)
20260821185957 -> 20260828000002  (advance_from_interested)
20260821190741 -> 20260828000003  (add_visiting_status)
20260821190754 -> 20260828000004  (reconcile_school_status_pipeline)
20260821204205 -> 20260828000005  (reactivate_school_rpc)
20260822191653 -> 20260822000010  (prep_baseball_link_variable)
20260822195554 -> 20260822120000  (fix_sport_registry_parity)
20260822224955 -> 20260903000000  (schools_unique_family_name)
20260823012601 -> 20260822140000  (debaseball_seed_content)
20260824114318 -> 20260905000000  (intended_major_template_var)
20260824173828 -> 20260906000010  (family_shared_communication_templates)
20260825183540 -> 20260906000020  (stamp_coach_last_contact_on_interaction)
20260825214856 -> 20260907000000  (public_profile_phase1)
20260826022726 -> 20260908000000  (profile_banners_bucket)
20260826150923 -> 20260909000000  (profile_contacts)
20260827175030 -> 20260910000000  (interaction_type_add_interest)
20260827175034 -> 20260911000000  (profile_contacts_status)
20260828150408 -> 20260913000000  (cache_snapshots)
20260831193518 -> 20260914000000  (nux_progress)
20260831193526 -> 20260915000000  (college_programs)
20260902155839 -> 20260902000000  (family_shared_user_deadlines)
20260903183614 -> 20260916000000  (family_subscriptions)
20260903183622 -> 20260917000000  (correct_family_can_write_comment)
20260903183732 -> 20260918000000  (lock_down_entitlement_function_grants)
20260905220548 -> 20260905000010  (documents_profile_photos_buckets)
20260905224538 -> 20260906000000  (family_inbound_token)
20260905224553 -> 20260906000001  (inbound_email_tables)
20260905230951 -> 20260923120000  (school_mascot_colors_scholarship_limits)
20260906002239 -> 20260918000010  (device_tokens_environment_and_set_primary_metric)
20260906192437 -> 20260923000000  (email_events)
20260906195357 -> 20260924000002  (seed_scholarship_limits)
20260906202346 -> 20260924000000  (inbound_email_attachments)
```

- [ ] **Step 1: Spot-check 5 pairs for content sanity before bulk-applying**

  Don't trust the name-match alone for the whole batch — read the repo file for a handful of pairs spanning the date range and confirm the DDL matches what's plausible for something already live (e.g., `CREATE TABLE IF NOT EXISTS`, not a `DROP`/destructive statement that would be dangerous to silently mark "already applied" if it *hadn't* actually run). Check at minimum:
  - `supabase/migrations/20260816000000_coach_outreach_phase0_1.sql` (early pair)
  - `supabase/migrations/20260828000005_reactivate_school_rpc.sql` (mid)
  - `supabase/migrations/20260924000000_inbound_email_attachments.sql` (latest pair)

  For each, confirm the objects it creates/alters already exist on QA:

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: SELECT to_regclass('public.athlete_messages') AS athlete_messages,
                  to_regclass('public.email_events') AS email_events;
  ```

  Adjust the table/function names per file. Expected: non-null (object exists) for every one checked — confirming the content really is already live, not just name-coincidence.

- [ ] **Step 2: Insert the 57 tracking rows**

  This is what `supabase migration repair --status applied <version>` does under the hood: insert a row recording that version as applied, without running its SQL. Do this as one batched insert (values list generated from the table above — the **local** version + name in each row, since that's the version the repo/CI will look for going forward):

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: INSERT INTO supabase_migrations.schema_migrations (version, name)
           VALUES
             ('20260730000000','security_advisor_warn_hardening'),
             ('20260816000000','coach_outreach_phase0_1'),
             ('20260817000000','coach_outreach_phase2_metrics'),
             ('20260818000000','drop_users_phone'),
             ('20260819000000','create_athlete_messages'),
             ('20260820000000','contact_window_rules'),
             ('20260821000010','family_shared_player_prefs_rls'),
             ('20260821000100','reconcile_parent_player_owned_prefs'),
             ('20260821000200','family_shared_profile_photo'),
             ('20260819000200','video_links_table'),
             ('20260819000300','video_links_backfill'),
             ('20260821000020','video_links_platform_other'),
             ('20260822000020','schools_phone'),
             ('20260823000000','schools_athletics_url'),
             ('20260824000000','drop_coaches_availability'),
             ('20260814000000','drop_social_media_posts'),
             ('20260907182429','notify_offer_inbound_event'),
             ('20260821000000','enforce_minimum_age'),
             ('20260825000010','cron_runs'),
             ('20260829000000','admin_audit_log'),
             ('20260826000000','allow_family_members_create_interactions'),
             ('20260826000001','allow_linked_parents_write_athlete_tasks'),
             ('20260827000000','add_school_outreach_notes'),
             ('20260827000001','school_questionnaire_completion'),
             ('20260828000000','family_invitations_invited_by_cascade'),
             ('20260828000001','advance_school_status_on_interaction'),
             ('20260828000002','advance_from_interested'),
             ('20260828000003','add_visiting_status'),
             ('20260828000004','reconcile_school_status_pipeline'),
             ('20260828000005','reactivate_school_rpc'),
             ('20260822000010','prep_baseball_link_variable'),
             ('20260822120000','fix_sport_registry_parity'),
             ('20260903000000','schools_unique_family_name'),
             ('20260822140000','debaseball_seed_content'),
             ('20260905000000','intended_major_template_var'),
             ('20260906000010','family_shared_communication_templates'),
             ('20260906000020','stamp_coach_last_contact_on_interaction'),
             ('20260907000000','public_profile_phase1'),
             ('20260908000000','profile_banners_bucket'),
             ('20260909000000','profile_contacts'),
             ('20260910000000','interaction_type_add_interest'),
             ('20260911000000','profile_contacts_status'),
             ('20260913000000','cache_snapshots'),
             ('20260914000000','nux_progress'),
             ('20260915000000','college_programs'),
             ('20260902000000','family_shared_user_deadlines'),
             ('20260916000000','family_subscriptions'),
             ('20260917000000','correct_family_can_write_comment'),
             ('20260918000000','lock_down_entitlement_function_grants'),
             ('20260905000010','documents_profile_photos_buckets'),
             ('20260906000000','family_inbound_token'),
             ('20260906000001','inbound_email_tables'),
             ('20260923120000','school_mascot_colors_scholarship_limits'),
             ('20260918000010','device_tokens_environment_and_set_primary_metric'),
             ('20260923000000','email_events'),
             ('20260924000002','seed_scholarship_limits'),
             ('20260924000000','inbound_email_attachments')
           ON CONFLICT (version) DO NOTHING;
  ```

  Then remove the now-redundant old rows (the left-hand/remote-only versions from the pairing table — the row that's genuinely superseded by the newly-inserted one):

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: DELETE FROM supabase_migrations.schema_migrations
           WHERE version IN (
             '20260730193858','20260807163249','20260807164130','20260808150439',
             '20260808151514','20260808160320','20260809180932','20260809180956',
             '20260809183945','20260809223921','20260809223934','20260810143510',
             '20260812193101','20260813190030','20260813203944','20260814193258',
             '20260816175930','20260816180754','20260816193735','20260817141559',
             '20260817142318','20260817143529','20260818235600','20260819215004',
             '20260820185627','20260821185108','20260821185957','20260821190741',
             '20260821190754','20260821204205','20260822191653','20260822195554',
             '20260822224955','20260823012601','20260824114318','20260824173828',
             '20260825183540','20260825214856','20260826022726','20260826150923',
             '20260827175030','20260827175034','20260828150408','20260831193518',
             '20260831193526','20260902155839','20260903183614','20260903183622',
             '20260903183732','20260905220548','20260905224538','20260905224553',
             '20260905230951','20260906002239','20260906192437','20260906195357',
             '20260906202346',
             '20260813212642'
           );
  ```

  The last version in that list, `20260813212642`, isn't one of the 57 pairing rows above — it's `drop_coaches_availability`'s duplicate remote apply (see this task's Interfaces note). It's only safe to delete now, after the `INSERT` above has created its pair `20260824000000`.

- [ ] **Step 3: Verify**

  ```
  mcp__claude_ai_Supabase__list_migrations
    project_id: xpxzhqghxecsjhvklsqg
  ```

  Expected: all 57 local versions from the pairing table now present; none of the 57 old remote-only versions remain.

- [ ] **Step 4: Record in claude/database.md**

  Add the 57 repairs to the same dated entry from Task 1.

## Task 3: Investigate the unresolved cluster (11 remote-only + 16 local-only)

These don't pair cleanly — some are likely renames with a name change big enough to break exact-match pairing, some are genuinely retired, some are genuinely new. **Do not resolve any of these by pattern-matching name similarity alone** — each needs an actual check.

**Remote-only, unresolved (11):**
```
20260730193943|security_advisor_warn_hardening_public_grant_fix
20260801191053|move_pg_trgm_to_extensions_schema
20260807163731|coach_outreach_seed_data
20260807163756|coach_outreach_retire_legacy_templates
20260809184748|family_shared_profile_photo_allow_self
20260816171744|fix_push_trigger_add_auth_header
20260819214145|add_set_primary_metric_function
20260823143136|drop_positions_table_and_position_fks
20260825151841|coach_tags_source
20260827144403|add_device_tokens_environment
20260827150843|prune_invalid_device_tokens
```

`coach_tags_source` (`20260825151841`) moved here from the original draft's Task 1 (it was wrongly bucketed as safely superseded by `20260825000000` — but `20260825000000` is actually a different migration, `cron_runs`; see Task 0). Resolve this one only after Task 0 has established what's really live at `coach_tags_source`'s canonical slot, if any.

**Local-only, unresolved (16):**
```
20260801000000|move_pg_trgm_to_extensions
20260830000000|reconcile_auth_and_notify_triggers
20260831000000|ensure_pg_net
20260901000000|fix_handle_new_user_role_enum
20260902000010|seed_sports_and_positions
20260904000000|drop_positions_table
20260907182444|fix_push_trigger_auth
20260907182459|notification_cron_auth_and_event_schedule
20260907211105|activate_notification_cron_jobs
20260919000000|realtime_coaches_interactions
20260920000000|realtime_schools
20260921000000|realtime_athlete_task
20260922000000|realtime_documents
20260924000001|scholarship_limits_unique_constraint_repair
20260925000000|email_sends
20260925000010|noop_verify_qa_e2e_pipeline
```

Three near-name pairs jump out and are the most likely renames — verify these first:
- `move_pg_trgm_to_extensions_schema` (remote) vs `move_pg_trgm_to_extensions` (local)
- `fix_push_trigger_add_auth_header` (remote) vs `fix_push_trigger_auth` (local)
- `drop_positions_table_and_position_fks` (remote) vs `drop_positions_table` (local)

- [ ] **Step 1: For each of the 3 near-name candidates, diff content and check live state**

  Read both repo files in the pair (e.g. `supabase/migrations/20260801191053*` doesn't exist locally — read the closest actual file `supabase/migrations/20260801000000_move_pg_trgm_to_extensions.sql`) and compare against what the remote name implies. Then check the actual live state the migration would produce:

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: SELECT extname, extnamespace::regnamespace FROM pg_extension WHERE extname = 'pg_trgm';
  ```

  If `pg_trgm` is already in the `extensions` schema, the migration's effect is already live — pair it via Task 2's `--status applied` pattern (add to that reconciliation, don't re-run). Repeat the analogous check for the other two pairs (query `information_schema.columns`/`routines` for the specific objects each migration touches — read the file first to know what to check for).

- [ ] **Step 2: For each of the remaining 7 remote-only entries with no local pair at all, determine if truly retired**

  These names don't appear anywhere in the current repo — meaning either the feature was squashed into a later combined migration, or the repo file was deleted outright (both legitimate). For each, check whether its described object still exists live:

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: SELECT to_regclass('public.athlete_messages'); -- adjust per migration's actual target
  ```

  If the object exists (feature is live, just consolidated elsewhere in repo history) → revert this tracking row via Task-1-style delete (metadata only, schema unaffected either way). If the object does NOT exist → STOP, this is a real discrepancy (something QA never actually got) and needs a human decision, not an automated one.

- [ ] **Step 3: For each of the remaining 13 local-only entries with no remote pair, confirm genuinely pending**

  These are very likely real, never-applied-to-QA migrations (post-Sept-6 dates mostly — `realtime_*`, `notification_cron_*`, `email_sends`, etc.). Confirm each one's target object does NOT yet exist on QA:

  ```
  mcp__claude_ai_Supabase__execute_sql
    project_id: xpxzhqghxecsjhvklsqg
    query: SELECT to_regclass('public.email_sends'); -- adjust per file
  ```

  If it doesn't exist, it's genuinely pending — leave it for Task 4's real `db push`. If it unexpectedly does exist, treat as Task 2 (repair `--status applied`, don't re-push).

- [ ] **Step 4: Record findings + any additional repairs in claude/database.md**

## Task 4: Real push for confirmed-pending migrations + CI verification

**Files:** None new — this exercises the existing `.github/workflows/migrate-qa-e2e.yml`.

**Interfaces:**
- Consumes: Tasks 1–3 complete, QA's tracking table now matches the repo except for genuinely-never-applied migrations.

- [ ] **Step 1: Trigger the workflow**

  Push any commit touching `supabase/migrations/**` on `develop` (the existing no-op `20260909120000_noop_verify_qa_e2e_pipeline.sql` from earlier today already qualifies — re-run `migrate-qa-e2e.yml` run `34348747049`, or push a new trivial commit).

- [ ] **Step 2: Verify green**

  ```
  gh run view <run-id> -R candrikanich/recruiting-compass-web
  ```

  Expected: both `Push migrations to QA` and (once its own plan exists) e2e jobs succeed, pushing only the genuinely-pending migrations identified in Task 3.

- [ ] **Step 3: Confirm QA history now matches repo exactly**

  ```
  mcp__claude_ai_Supabase__list_migrations
    project_id: xpxzhqghxecsjhvklsqg
  ```

  Expected: every version present matches a `supabase/migrations/*.sql` filename in the repo, 1:1, no orphans either direction.

---

## Self-Review

- **Coverage:** Task 0 (4 collisions), Task 1 (6 dead duplicates), Task 2 (57 renames + 1 folded-in duplicate revert), Task 3 (11+16 unresolved), Task 4 (real push + CI verify) account for all 75 remote-only + 73 local-only + 35 exact-match + 4 collision entries identified in the corrected diff (114 total remote entries: 35+4+6+57+11 = 113 — the 114th is the pre-existing `baseline` row at version `00000000000000`, exact match, no action). e2e is explicitly deferred to its own future plan.
- **Placeholders:** none — every version/name pair is the actual data from today's `list_migrations` call and repo `ls`, cross-checked with a script (not hand-matched — see revision note in Background).
- **Risk containment:** Task 0 is read-only investigation; Tasks 1 and 2 only touch the tracking table (verified metadata-only, and Task 1's list was independently re-verified live against QA before this revision); Task 3 requires an actual live-state check before any action; Task 4 only pushes what Task 3 confirms is genuinely new.
- **Correction history:** the first version of this plan (merged as PR #716) had two data errors caught during Task 1 Step 1's own safety check, before any write: (1) it listed `20260813212642` as already safe to revert when its canonical pair doesn't exist until Task 2 runs, and (2) it bucketed `coach_tags_source` (`20260825151841`) as safely superseded by `20260825000000`, but that version is actually a different migration (`cron_runs`) — a version collision the original hand-matching missed entirely. This revision fixes both and adds Task 0 to cover the collisions the original diff never surfaced.
