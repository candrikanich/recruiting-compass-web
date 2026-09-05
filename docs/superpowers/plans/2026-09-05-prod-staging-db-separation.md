# Prod/Staging Database Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single shared Supabase project into a dedicated prod
project and a renamed staging project, with a gated CI migration-promotion
pipeline, before public launch.

**Architecture:** New empty Supabase project receives every migration in
`supabase/migrations/` in order, plus one new migration closing a storage
bucket gap. Current project is renamed and becomes the permanent staging
target for `develop`/previews/local dev. A GitHub Actions workflow gated by
a manual-approval Environment pushes future migrations to prod on merge to
`main`. Chris's real family data is extracted from staging and copied
(UUID-preserving) into prod as the last step before Vercel's Production env
vars are flipped.

**Tech Stack:** Supabase (Postgres, Auth, Storage), Supabase CLI, GitHub
Actions, Vercel, Supabase MCP tools, Vercel MCP tools.

**Spec:** `docs/superpowers/specs/2026-09-05-prod-staging-db-separation-design.md`

## Global Constraints

- No fully automatic prod migration push — every prod `db push` pauses for
  manual approval (GitHub Environment protection rule).
- Never share secrets between prod and staging (`CRON_SECRET`,
  `NUXT_ADMIN_TOKEN_SECRET`, service role keys all distinct per project).
- Data migration (Task 7) is copy-only — never delete or mutate rows in
  staging.
- Preserve UUIDs on every copied row — never regenerate primary keys.
- The `ahpethltxopkjxxzwmmb` E2E project is out of scope — no task touches
  it.
- Every SQL script this plan produces must be idempotent (safe to re-run)
  since staging's current bucket/policy state was never captured in a
  migration and may already partially exist.

---

## File Structure

- Create: `docs/superpowers/plans/artifacts/2026-09-05-staging-inventory.md`
  — Task 1's audit output; read by Tasks 2-6.
- Create: `supabase/migrations/20260906000000_documents_exports_buckets.sql`
  — closes the bucket-history gap identified in the spec.
- Create: `.github/workflows/migrate-prod.yml` — gated prod migration CI.
- Create: `scripts/db/migrate-family-data.ts` — Task 7's data-migration
  script (dry-run + apply modes).
- Modify: `claude/database.md` — new topology documented.
- Modify (outside repo): `~/.claude/projects/.../memory/prod-infra-identity.md`
  and `MEMORY.md` pointer — superseded by Task 10.

---

### Task 1: Inventory current staging project

**Files:**
- Create: `docs/superpowers/plans/artifacts/2026-09-05-staging-inventory.md`

**Interfaces:**
- Produces: a markdown doc with sections `## Migrations`, `## Storage
  Buckets`, `## Storage Policies`, `## Extensions`, `## Auth Config`,
  `## Vercel Env Vars` — Tasks 2, 3, 4, 5, 6 read specific sections by name.

- [ ] **Step 1: Confirm migration count/order matches the repo**

Run MCP `list_migrations` against the staging project
(`xpxzhqghxecsjhvklsqg`). Compare the returned list against
`ls supabase/migrations/*.sql | sort`. Expected: identical count (93) and
identical timestamps/names, in order. Any mismatch is a blocker — stop and
report before continuing.

- [ ] **Step 2: Capture current storage buckets**

Run MCP `execute_sql` against staging:

```sql
select id, name, public, created_at
from storage.buckets
order by id;
```

Expected result includes at least `documents`, `exports`, `profile_banners`.
Paste the full result into the inventory doc under `## Storage Buckets`.

- [ ] **Step 3: Capture current storage RLS policies**

Run MCP `execute_sql` against staging:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

Paste the full result into the inventory doc under `## Storage Policies`.
This is the exact input Task 2 needs to reconstruct bucket policies as SQL.

- [ ] **Step 4: Capture extensions**

Run MCP `list_extensions` against staging. Paste enabled (non-default)
extensions into `## Extensions` — prod must enable the same ones before
Task 3's migrations run (some migrations may depend on e.g. `pgcrypto`).

- [ ] **Step 5: Capture auth config (Chris provides)**

Ask Chris to paste, from the staging project's Supabase Dashboard →
Authentication → URL Configuration and → Email Templates:
- Site URL
- Redirect URLs (full list)
- SMTP host/port/sender address (not password)
- Any customized email template subject lines (default vs customized)

Record verbatim under `## Auth Config`. No MCP path reads Auth config
settings, so this step cannot be automated.

- [ ] **Step 6: Capture current Vercel env var keys (Chris provides)**

Ask Chris to run `vercel env ls` in the repo root (or check the Vercel
dashboard → Project Settings → Environment Variables) and paste which keys
exist for Production vs Preview (key names only, not secret values).
Record under `## Vercel Env Vars`.

- [ ] **Step 7: Commit the inventory doc**

```bash
git add docs/superpowers/plans/artifacts/2026-09-05-staging-inventory.md
git commit -m "docs: capture staging project inventory before prod split"
```

---

### Task 2: Write the documents/exports bucket migration

**Files:**
- Create: `supabase/migrations/20260906000000_documents_exports_buckets.sql`

**Interfaces:**
- Consumes: Task 1's `## Storage Buckets` and `## Storage Policies`
  sections (exact bucket flags and policy definitions to encode).
- Produces: a migration file that Task 3 includes when replaying
  `supabase/migrations/` onto the new prod project.

- [ ] **Step 1: Write the idempotent bucket-creation SQL**

Using the `public` flag captured in Task 1 Step 2 for `documents` and
`exports` (substitute the actual captured value for `<DOCS_PUBLIC>` /
`<EXPORTS_PUBLIC>` below — do not guess):

```sql
-- supabase/migrations/20260906000000_documents_exports_buckets.sql
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', <DOCS_PUBLIC>),
  ('exports', 'exports', <EXPORTS_PUBLIC>)
on conflict (id) do nothing;
```

- [ ] **Step 2: Encode each captured policy as idempotent SQL**

For every row captured in Task 1 Step 3 whose `qual`/`with_check` reference
`bucket_id = 'documents'` or `bucket_id = 'exports'`, add a
`drop policy if exists ... ; create policy ...` pair reproducing it
exactly, e.g. (shape only — substitute the real `policyname`/`cmd`/`qual`
captured in Task 1):

```sql
drop policy if exists "<captured policyname>" on storage.objects;
create policy "<captured policyname>"
  on storage.objects for <captured cmd>
  to <captured roles>
  using (<captured qual>)
  with check (<captured with_check>);
```

Append these pairs to the same migration file, after the bucket inserts.

- [ ] **Step 3: Verify the migration is a no-op on staging**

Run MCP `apply_migration` with this file's content against staging. Then
re-run Task 1 Step 2 and Step 3's queries — results must be byte-identical
to before (proves idempotency: staging already had these buckets/policies,
this migration only documents them going forward).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260906000000_documents_exports_buckets.sql
git commit -m "fix: check in documents/exports storage bucket + RLS migration

Buckets were created outside migration history; this closes the gap so
new environments (prod) get them via the standard migration replay."
```

---

### Task 3: Create the prod Supabase project and replay all migrations

**Files:**
- None (infra-only; no repo files change)

**Interfaces:**
- Consumes: `supabase/migrations/*.sql` (94 files after Task 2), Task 1's
  `## Extensions` list.
- Produces: a live prod project ref (`$PROD_PROJECT_REF`) — every later
  task references this value.

- [ ] **Step 1: Create the project**

Run MCP `create_project` with name `recruiting-compass-prod`, same region
as staging (check via MCP `get_project` on staging first). Record the
returned project ref as `$PROD_PROJECT_REF` — write it into
`docs/superpowers/plans/artifacts/2026-09-05-staging-inventory.md` under a
new `## Prod Project` section so later tasks/subagents can find it.

- [ ] **Step 2: Enable required extensions**

For each extension in Task 1's `## Extensions` list, run MCP `execute_sql`
against the new prod project: `create extension if not exists "<name>";`

- [ ] **Step 3: Replay every migration in order**

For each file in `ls supabase/migrations/*.sql | sort`, run MCP
`apply_migration` against `$PROD_PROJECT_REF` with that file's content, in
filename order (baseline first). Stop immediately and report if any
migration fails — do not skip or reorder.

- [ ] **Step 4: Verify schema parity with staging**

Run MCP `list_tables` against both staging and `$PROD_PROJECT_REF`. Diff
the table lists — must be identical. Then run MCP
`generate_typescript_types` against both and diff the output — must be
identical (confirms columns/types match, not just table names).

- [ ] **Step 5: Verify storage buckets landed**

Re-run Task 1 Step 2's query against `$PROD_PROJECT_REF` — must return
`documents`, `exports`, `profile_banners` with matching `public` flags.

- [ ] **Step 6: Commit the recorded project ref**

```bash
git add docs/superpowers/plans/artifacts/2026-09-05-staging-inventory.md
git commit -m "docs: record new prod Supabase project ref"
```

---

### Task 4: Auth config parity handoff (Chris executes)

**Files:**
- Create: `docs/superpowers/plans/artifacts/2026-09-05-prod-auth-config.md`

**Interfaces:**
- Consumes: Task 1's `## Auth Config` section.
- Produces: a checklist doc Chris works through manually in the Supabase
  Dashboard for `$PROD_PROJECT_REF`.

- [ ] **Step 1: Write the exact-value checklist**

Copy every value from Task 1's `## Auth Config` section into a numbered
checklist: Site URL, each Redirect URL, SMTP host/port/sender, and which
email templates need customizing (subject lines only — bodies stay
Supabase defaults unless Task 1 captured a customized body).

- [ ] **Step 2: Hand off to Chris**

Message Chris with the doc path and: "Paste these into
Supabase Dashboard → `$PROD_PROJECT_REF` → Authentication → URL
Configuration and → Email Templates. Confirm when done." No MCP write path
exists for these settings — this step cannot be automated.

- [ ] **Step 3: Verify once Chris confirms**

Ask Chris to trigger a password-reset email against the new prod project
(via a test account MCP creates with `execute_sql` insert into `auth.users`
is NOT viable — instead, Chris uses the Supabase Dashboard's "Send test
email" if available, or this step is folded into Task 8's live verify).
Mark this step's real verification as deferred to Task 8, Step 2 — record
that explicitly rather than skipping silently.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/artifacts/2026-09-05-prod-auth-config.md
git commit -m "docs: prod auth config handoff checklist"
```

---

### Task 5: Generate prod secrets + Vercel env var table (Chris applies later)

**Files:**
- Create: `docs/superpowers/plans/artifacts/2026-09-05-prod-env-vars.md`
  (git-ignored — contains secret values, never committed)

**Interfaces:**
- Consumes: `$PROD_PROJECT_REF` (Task 3), MCP `get_project_url` +
  `get_publishable_keys` against `$PROD_PROJECT_REF`.
- Produces: the exact key/value table Task 8 applies during cutover.

- [ ] **Step 1: Add the artifact path to `.gitignore`**

```bash
echo "docs/superpowers/plans/artifacts/2026-09-05-prod-env-vars.md" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore prod secrets handoff doc"
```

- [ ] **Step 2: Generate distinct secrets**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run twice — once for `CRON_SECRET`, once for `NUXT_ADMIN_TOKEN_SECRET`.
Never reuse staging's current values (Task 1 confirmed key names exist;
these are new values for prod only).

- [ ] **Step 3: Fetch prod Supabase connection values**

Run MCP `get_project_url` and `get_publishable_keys` against
`$PROD_PROJECT_REF`. Fetch the service role key from the Supabase
Dashboard → `$PROD_PROJECT_REF` → Project Settings → API (no MCP tool
returns the service role key — dashboard only, Chris copies it).

- [ ] **Step 4: Write the handoff table**

```markdown
| Key | Environment | Value |
|---|---|---|
| NUXT_PUBLIC_SUPABASE_URL | Production | <prod project URL> |
| NUXT_PUBLIC_SUPABASE_ANON_KEY | Production | <prod anon key> |
| SUPABASE_SERVICE_ROLE_KEY | Production | <Chris pastes from dashboard> |
| CRON_SECRET | Production | <generated value 1> |
| NUXT_ADMIN_TOKEN_SECRET | Production | <generated value 2> |
```

Do not apply these to Vercel yet — that's Task 8 (cutover), done last.

---

### Task 6: CI migration-push pipeline

**Files:**
- Create: `.github/workflows/migrate-prod.yml`

**Interfaces:**
- Consumes: repo secrets `SUPABASE_ACCESS_TOKEN`, `PROD_PROJECT_REF`,
  `PROD_DB_PASSWORD` (Chris adds via GitHub repo settings — no MCP path to
  set GitHub Actions secrets).
- Produces: on merge to `main` touching `supabase/migrations/**`, a gated
  job that runs `supabase db push` against prod after manual approval.

- [ ] **Step 1: Write the workflow file**

```yaml
name: Migrate Prod Database
on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Push migrations to prod
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.PROD_DB_PASSWORD }}
        run: |
          supabase link --project-ref ${{ secrets.PROD_PROJECT_REF }}
          supabase db push
```

- [ ] **Step 2: Hand off the GitHub Environment protection rule (Chris)**

Message Chris: "In GitHub repo Settings → Environments, create an
environment named `production`. Add yourself as a required reviewer under
'Deployment protection rules'. This makes every run of
`migrate-prod.yml` pause for your approval before it touches the prod DB."
No API/MCP path configures this — GitHub Environment protection rules are
dashboard-only.

- [ ] **Step 3: Hand off the three repo secrets (Chris)**

Message Chris the three secret names needed (`SUPABASE_ACCESS_TOKEN` —
generate at Supabase Dashboard → Account → Access Tokens;
`PROD_PROJECT_REF` — value from Task 3 Step 1; `PROD_DB_PASSWORD` — set
when Task 3's project was created, Chris retrieves from Supabase Dashboard
→ `$PROD_PROJECT_REF` → Project Settings → Database). Ask Chris to add
them under repo Settings → Environments → `production` → secrets.

- [ ] **Step 4: Verify with a harmless migration**

Once Chris confirms the environment + secrets exist, create a throwaway
migration (e.g. a comment-only `select 1;` in a new timestamped file),
push a branch, PR to `main`. On merge, confirm the Action run appears and
pauses at the approval gate (do not approve yet — just confirm the gate
fires). Then close the PR without merging further, delete the throwaway
migration file.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/migrate-prod.yml
git commit -m "ci: add gated prod migration push workflow"
```

---

### Task 7: Data migration script (Chris's family account, staging → prod)

**Files:**
- Create: `scripts/db/migrate-family-data.ts`

**Interfaces:**
- Consumes: a `family_unit_id` argument (Chris's own, looked up via
  `select id from family_units where ...` against staging — ask Chris for
  the identifying email if the ID isn't already known).
- Produces: exit code 0 + a printed row-count summary; `--dry-run` prints
  without writing, no flag writes via Supabase MCP `execute_sql` against
  `$PROD_PROJECT_REF`.

- [ ] **Step 1: Enumerate FK-linked tables**

Run MCP `execute_sql` against staging:

```sql
select
  tc.table_name, kcu.column_name, ccu.table_name as foreign_table_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and (ccu.table_name = 'family_units' or ccu.table_name = 'users');
```

Use this result to build the full dependency-ordered table list (e.g.
`family_units` → `users` → `players` → `schools`/`coaches` →
`documents`/`interactions`/... ) — insert order must satisfy FKs parent
first.

- [ ] **Step 2: Write the script**

```typescript
// scripts/db/migrate-family-data.ts
import { createClient } from '@supabase/supabase-js'

const STAGING_URL = process.env.STAGING_SUPABASE_URL!
const STAGING_KEY = process.env.STAGING_SERVICE_ROLE_KEY!
const PROD_URL = process.env.PROD_SUPABASE_URL!
const PROD_KEY = process.env.PROD_SERVICE_ROLE_KEY!

// Ordered parent-first per Step 1's FK dependency query.
const TABLES_IN_ORDER = [
  'family_units',
  'users',
  'players',
  'schools',
  'coaches',
  'documents',
  'interactions',
  // extend with every table Step 1 identified as FK-linked to family_units
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const familyUnitId = process.argv[2]
  if (!familyUnitId) {
    console.error('Usage: migrate-family-data.ts <family_unit_id> [--dry-run]')
    process.exit(1)
  }

  const staging = createClient(STAGING_URL, STAGING_KEY)
  const prod = createClient(PROD_URL, PROD_KEY)

  for (const table of TABLES_IN_ORDER) {
    const filterColumn = table === 'family_units' ? 'id' : 'family_unit_id'
    const { data, error } = await staging
      .from(table)
      .select('*')
      .eq(filterColumn, familyUnitId)

    if (error) throw error
    console.log(`${table}: ${data.length} rows`)

    if (!dryRun && data.length > 0) {
      const { error: insertError } = await prod.from(table).insert(data)
      if (insertError) throw insertError
    }
  }

  console.log(dryRun ? 'Dry run complete, no writes made.' : 'Migration complete.')
}

main()
```

- [ ] **Step 3: Dry-run against real data**

```bash
STAGING_SUPABASE_URL=... STAGING_SERVICE_ROLE_KEY=... \
PROD_SUPABASE_URL=... PROD_SERVICE_ROLE_KEY=... \
npx tsx scripts/db/migrate-family-data.ts <chris-family-unit-id> --dry-run
```

Expected: non-zero row counts printed for `family_units`, `users`,
`players`, plus every table where Chris actually has data (schools,
coaches, documents, etc.). Zero counts for tables Chris hasn't used are
fine. Confirm the counts look right with Chris before Step 4.

- [ ] **Step 4: Real run (only immediately before Task 8's cutover)**

Same command without `--dry-run`. Confirm no errors. Re-run Step 3's
dry-run command against **prod** now (pointing `STAGING_SUPABASE_URL` env
vars at prod instead) to confirm row counts in prod match what was printed
in Step 3.

- [ ] **Step 5: Commit the script (not the data)**

```bash
git add scripts/db/migrate-family-data.ts
git commit -m "feat: add staging-to-prod family data migration script"
```

---

### Task 8: Cutover (Chris executes, Claude verifies)

**Files:**
- None (Vercel dashboard action)

**Interfaces:**
- Consumes: Task 5's env var table.

- [ ] **Step 1: Confirm freeze window with Chris**

Message Chris: "Ready to cut over — please stop using the app now until I
confirm verification passed (should be a few minutes)." Do not proceed to
Step 2 until Chris confirms.

- [ ] **Step 2: Chris applies Task 5's table in Vercel**

Chris pastes each row from Task 5's handoff doc into Vercel Dashboard →
Project Settings → Environment Variables, scoped to **Production** only
(Preview stays untouched, still pointing at staging).

- [ ] **Step 3: Trigger a fresh Production deploy**

Run MCP `deploy_to_vercel` (or ask Chris to push an empty commit to `main`
if the MCP tool requires a git trigger) to force a rebuild — `NUXT_PUBLIC_*`
vars are baked at build time, so the env var change alone does not update a
prior build.

- [ ] **Step 4: Confirm Chris can resume normal use**

Once Task 9 (next) passes, message Chris the freeze is over.

---

### Task 9: Verify

**Files:**
- None

**Interfaces:**
- Consumes: the fresh Production deployment from Task 8.

- [ ] **Step 1: Confirm the bundle points at prod**

Run MCP `get_deployment` on the new Production deployment, then load the
live URL and check `window.__NUXT__.public.supabaseUrl` (or the equivalent
runtime config key) equals the prod project URL from Task 5, not staging's.

- [ ] **Step 2: Live auth flow test**

Chris (or Claude via browser automation) performs a signup and a
password-reset against the live prod URL. Confirm the email arrives with
prod's configured SMTP/templates from Task 4.

- [ ] **Step 3: Confirm cron writes land in prod**

Wait for (or manually trigger, if an admin-triggerable cron exists) the
next scheduled cron run. Run MCP `execute_sql` against `$PROD_PROJECT_REF`:
`select * from cron_runs order by created_at desc limit 5;` — confirm a
fresh row appears.

- [ ] **Step 4: Confirm Chris's data is present and correct**

Run MCP `execute_sql` against `$PROD_PROJECT_REF` to spot-check row counts
per table match Task 7 Step 4's dry-run output. Chris logs into prod and
visually confirms his family/players/schools/data appear correctly.

- [ ] **Step 5: Confirm `develop` preview is unaffected**

Trigger (or check the most recent) `develop` preview deployment. Confirm
`window.__NUXT__` there still shows the **staging** project URL.

- [ ] **Step 6: Report pass/fail**

If any check fails, execute the Task 8 rollback (flip Vercel Production env
vars back to staging values, redeploy) and report the failure before
retrying.

---

### Task 10: Docs and memory update

**Files:**
- Modify: `claude/database.md`
- Modify: `~/.claude/projects/-Volumes-AlphabetSoup-TheRecruitingCompass-code-recruiting-compass-web/memory/prod-infra-identity.md`
- Modify: same directory's `MEMORY.md`

- [ ] **Step 1: Update `claude/database.md`**

Add a section documenting the new topology (prod / staging / e2e, which
project each Vercel branch/env targets, and that prod migrations now go
through `.github/workflows/migrate-prod.yml` instead of ad hoc MCP calls).

- [ ] **Step 2: Rewrite the `prod-infra-identity` memory**

Replace its claim that one DB serves prod+QA with the new topology,
linking to this plan and the spec. Keep the file name (other memories
link to `[[prod-infra-identity]]`).

- [ ] **Step 3: Update `MEMORY.md`'s pointer line for this memory**

Keep the one-line summary in sync with the rewritten file.

- [ ] **Step 4: Commit the repo doc change**

```bash
git add claude/database.md
git commit -m "docs: document prod/staging Supabase topology and migration workflow"
```

---

## Self-Review Notes

- **Spec coverage:** All 9 spec phases map to tasks 1-10 (Phase 2's bucket
  gap became its own Task 2, discovered during plan-writing — folded back
  into the spec already). Rollback plan from the spec is realized in Task 9
  Step 6. Out-of-scope items (E2E project, local Supabase stack, non-Chris
  data, auto-push) are not touched by any task.
- **Placeholder scan:** Task 2 and Task 4 contain bracketed values
  (`<DOCS_PUBLIC>`, `<captured policyname>`, etc.) by necessity — these are
  not vague TODOs, they're exact values captured by Task 1's queries at
  execution time, unknowable at plan-writing time. Each is tied to a named,
  concrete prior step's output, not left to judgment.
- **Type/name consistency:** `$PROD_PROJECT_REF` introduced in Task 3 Step 1
  is used identically in Tasks 4, 5, 6, 7, 9. `family_unit_id` filter
  column name matches the schema convention used elsewhere in this
  codebase (per `claude/database.md`'s existing RLS notes referencing
  `family_unit_id`-scoped tables).
