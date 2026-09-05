# Staging Project Inventory — 2026-09-05

Captured against project `xpxzhqghxecsjhvklsqg` (current staging, pre-rename).

## Migrations

Repo has 93 files in `supabase/migrations/`. Staging's `list_migrations`
returns ~106 entries with several duplicate names under different version
stamps (known drift: MCP-applied vs CLI-filename recording — see
`schema_migrations dual-recording drift` in project memory). This is
expected, not a defect. Duplicated names observed: `family_unit_id_columns_trigger_backfill`,
`family_policies_additive`, `cutover_interactions_schools_delete`,
`cutover_deferral_a_drop_legacy`, `drop_coaches_availability`,
`minor_requires_family_invite`, `cron_runs`, `school_recommendations`.
Real correctness check is schema parity (Task 3 Step 4), not row-count
parity against this table.

## Storage Buckets

| id | name | public | created_at |
|---|---|---|---|
| documents | documents | true | 2025-12-11 18:57:02+00 |
| profile-banners | profile-banners | true | 2026-08-26 02:27:26+00 |
| profile-photos | profile-photos | true | 2026-02-16 18:24:42+00 |

No `exports` bucket exists (disproves an assumption in issue #118 and an
earlier draft of the design spec).

`profile-banners` already has a checked-in migration
(`20260908000000_profile_banners_bucket.sql`). `documents` and
`profile-photos` do not — closed by
`20260906000000_documents_profile_photos_buckets.sql` (Task 2).

## Storage Policies (`storage.objects`)

**documents** (2 policies):
| policyname | cmd | roles | qual | with_check |
|---|---|---|---|---|
| Allow users to download their own files flreew_0 | SELECT | authenticated | `(bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])` | — |
| Allow users to upload their own files flreew_0 | INSERT | authenticated | — | `(bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])` |

**profile-photos** (7 policies):
| policyname | cmd | roles | qual | with_check |
|---|---|---|---|---|
| Family can delete athlete profile photos | DELETE | authenticated | `(bucket_id = 'profile-photos' AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' AND can_access_family_player_prefs(((storage.foldername(name))[1])::uuid))` | — |
| Family can update athlete profile photos | UPDATE | authenticated | same as above | — |
| Family can upload athlete profile photos | INSERT | authenticated | — | same predicate as above |
| Public profile photos are viewable by everyone | SELECT | public | `(bucket_id = 'profile-photos')` | — |
| Users can delete their own profile photos | DELETE | public | `(bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1])` | — |
| Users can update their own profile photos | UPDATE | public | same as above | — |
| Users can upload their own profile photos | INSERT | public | — | same predicate as above |

**profile-banners** (4 policies, already covered by existing migration —
listed here for completeness only, not touched by Task 2):
owner delete/update/write (authenticated, folder-owner check), public read
(public role).

## Extensions

Non-default/installed extensions on staging: `index_advisor` (extensions
schema), `pg_trgm` (extensions schema), `hypopg` (extensions schema),
`supabase_vault` (vault schema), `uuid-ossp` (extensions schema), `plpgsql`
(pg_catalog, always on), `pgsodium`-adjacent defaults, `pg_net` (extensions
schema), `pg_cron` (pg_catalog schema), `pgcrypto` (extensions schema),
`pg_stat_statements` (extensions schema). These are Supabase-project
defaults enabled on every new project by the platform, not something Task 3
needs to explicitly `create extension` for — confirmed no unusual
non-default extension is in use beyond Supabase's standard set.

## Auth Config

**Not yet captured — Chris to provide** (Supabase Dashboard has no MCP read
path for Auth settings): Site URL, Redirect URLs, SMTP host/port/sender,
customized email template subjects. Needed before Task 4.

## Vercel Env Vars

**Not yet captured — Chris to provide** (`vercel env ls` output, key names
only). Needed before Task 5.

## Prod Project

Created 2026-09-05: `lrzsenidegcqhwzwncve` (`recruiting-compass-prod`,
org `mhumwplsikjuxdquwsri`, region `us-east-2`, Postgres 17). Org upgraded
to Pro plan (from free-tier 2-project limit hit on first attempt) — actual
cost $10/mo, not the originally-quoted $0/mo free-tier estimate.
