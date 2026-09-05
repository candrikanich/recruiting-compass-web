# Prod/Staging Database Separation — Design Spec

**Issue:** [#118](https://github.com/candrikanich/recruiting-compass-web/issues/118) — Infrastructure: Create production Supabase project, demote current DB to staging
**Status:** Design approved, ready for implementation plan
**Author:** Chris Andrikanich + Claude, brainstorming session 2026-09-05

## Problem

One Supabase project (`xpxzhqghxecsjhvklsqg`) currently serves every environment:
local dev, Vercel Preview (`develop` branch + PR previews), and Vercel Production
(`main` branch). Consequences:

- No isolation between QA/test activity and anything meant to be "real."
- Chris has been using this shared project for his own family account(s) —
  real usage data lives in what will become the staging project.
- Migrations are applied ad hoc via Supabase MCP directly against the live
  project, with no promotion gate.
- Storage bucket RLS, auth config, and secrets (`CRON_SECRET`,
  `NUXT_ADMIN_TOKEN_SECRET`) are shared across environments that should be
  independent.

A third project already exists and is out of scope here: `ahpethltxopkjxxzwmmb`,
dedicated to CI E2E runs. This plan does not touch it.

## Target Topology

```
recruiting-compass-prod       (NEW)      ← main branch, Vercel Production env
recruiting-compass-staging    (renamed, current xpxzhqghxecsjhvklsqg)
                                          ← develop branch + previews, Vercel Preview env
                                          ← local dev (npm run dev) points here too
recruiting-compass-e2e (ahpethltxopkjxxzwmmb) ← unchanged, CI E2E only
```

Local dev intentionally targets the staging project rather than a local
Supabase stack (`supabase start`) — avoids Docker/local-stack overhead,
matches current developer experience.

## Role Split

Claude executes via Supabase MCP + Vercel MCP wherever those tools reach:
project creation, migration application, schema verification, SQL-scriptable
storage bucket/RLS setup, data extraction/restore.

Chris handles anything with no MCP write surface: Supabase Auth dashboard
config (redirect URLs, email templates, SMTP), Vercel env var scoping per
environment (Production vs Preview), and any org-billing approval for a new
paid project. Claude hands over exact values/steps for each of these rather
than describing them vaguely.

## Execution Phases

### Phase 0 — Inventory (read-only)
Audit current state before touching anything: all 19 migrations, storage
buckets (`documents`, `exports`) + their RLS policies, current auth config
(redirect URLs, email templates, SMTP provider), all secrets in use
(`CRON_SECRET`, `NUXT_ADMIN_TOKEN_SECRET`, service role keys), current Vercel
env var values per environment.

### Phase 1 — Create prod project + apply schema
MCP `create_project` → new empty prod project. Apply all 19 migrations in
order via MCP `apply_migration`. Verify schema matches staging exactly via
`list_tables` / `generate_typescript_types` diff.

### Phase 2 — Storage buckets + RLS on prod
Bucket creation (`storage.buckets` insert) and RLS policies are plain SQL —
scriptable as part of the Phase 1 migration set, not manual dashboard work.

### Phase 3 — Auth config on prod (manual, Chris)
Redirect URLs, email templates, SMTP provider copied from staging's current
config — no full MCP write surface for Supabase Auth settings. Claude
provides the exact values pulled from Phase 0's audit.

### Phase 4 — Secrets + Vercel env vars
Generate distinct `CRON_SECRET` / `NUXT_ADMIN_TOKEN_SECRET` for prod (never
shared with staging). Vercel env var scoping (which project/environment gets
which Supabase URL/keys) is dashboard-only — no env-var-set call in the
available Vercel MCP surface. Claude hands Chris the exact key/value table;
**not yet applied** — this is prep only, applying is Phase 7 (cutover).

### Phase 5 — CI migration-push pipeline
New `.github/workflows/migrate-prod.yml`: triggers on push to `main` when
`supabase/migrations/**` changed. Job targets a GitHub Environment named
`production` with a manual-approval protection rule (configured in repo
settings) — merge triggers the job, it pauses for human approval before
running `supabase db push` against the prod project. Needs
`SUPABASE_ACCESS_TOKEN`, `PROD_PROJECT_REF`, and likely `PROD_DB_PASSWORD` as
secrets. Safety property: by the time a migration reaches this gate it has
already run clean on staging via the normal PR-to-develop flow — prod never
sees an untested migration.

### Phase 6 — Data migration (last possible moment before cutover)
Targeted extraction, not a full database copy: Chris's `family_unit_id` +
every FK-linked row (users, players, schools, coaches, documents,
interactions, etc.) queried from staging via Supabase MCP `execute_sql`,
inserted into prod via `execute_sql` on the prod project, **preserving
UUIDs** (not regenerated — keeps FK integrity, no re-linking work needed).
Staging's test/demo accounts stay behind; only Chris's real data crosses
over. Dry-run first (SELECT + row counts only, no writes) to verify scope
before any INSERT. Source rows in staging are never deleted — this is a
copy, fully retryable without data loss.

Done as the *last* step before cutover (not earlier) so the snapshot is as
fresh as possible — anything Chris does in staging between Phase 0 and this
point is naturally included. Chris should pause active use of the app
between this phase and Phase 7 (a short freeze, minutes not hours) so
nothing new lands in staging after the snapshot.

### Phase 7 — Cutover
Vercel Production environment env vars flipped from staging project
creds to prod project creds (Chris, dashboard). `main` redeploys with the
new bundle. `NUXT_PUBLIC_*` vars are baked at build time — a fresh build is
required, not just an env var change.

### Phase 8 — Verify
- `window.__NUXT__` in a production page load shows the prod Supabase URL.
- Live signup + password-reset flow works against prod.
- A cron run lands a row in prod's `cron_runs` table (confirms crons hit the
  right DB via env vars, no code change needed).
- A fresh `develop` preview deploy still resolves to staging, unaffected.
- Chris's migrated family data is visible and correct when logged into
  prod.

### Phase 9 — Docs/memory update
Update `claude/database.md` with the new topology. Supersede the
`prod-infra-identity` memory (currently states one DB serves prod+QA — this
plan flips that to be false going forward).

## Rollback

- **Phases 0–5:** zero risk to staging — everything is additive against a
  new project. Abort at any point, nothing is touched or lost.
- **Phase 6:** dry-run before any write; staging source rows are never
  deleted, so the migration is retryable without data loss if something
  looks wrong before Phase 7.
- **Phase 7:** reversible by flipping Vercel Production env vars back to the
  staging project ref and redeploying. Minutes, non-destructive.
- **Phase 8:** verification gate — a failure here triggers the Phase 7
  rollback path rather than proceeding.

## Explicitly Out of Scope

- Any change to the `ahpethltxopkjxxzwmmb` E2E project.
- A local Supabase (`supabase start`) dev workflow.
- Migrating any data other than Chris's own family account(s) — staging
  keeps its existing test/demo data as-is.
- Fully automatic (non-gated) prod migration pushes.

## Acceptance Criteria

- [ ] New prod Supabase project exists with all 19 migrations + storage
      bucket/RLS setup applied cleanly.
- [ ] Auth configured on prod: redirect URLs, email templates, SMTP.
- [ ] Vercel env vars scoped correctly: Production → prod project,
      Preview → staging project (unchanged).
- [ ] Cron jobs confirmed writing to prod `cron_runs` after cutover.
- [ ] Prod secrets (`CRON_SECRET`, `NUXT_ADMIN_TOKEN_SECRET`) unique, not
      shared with staging.
- [ ] Existing project renamed to `recruiting-compass-staging`.
- [ ] `migrate-prod.yml` workflow exists, gated by a `production` GitHub
      Environment manual-approval rule.
- [ ] Chris's family account data present and correct in prod post-cutover.
- [ ] `develop` preview deploys confirmed still on staging post-cutover.
- [ ] `claude/database.md` + `prod-infra-identity` memory updated.
