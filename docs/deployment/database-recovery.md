# Database Recovery & Environment Separation

Operational runbook for the Supabase Postgres database backing The Recruiting Compass.

## Environment Separation Policy

We run **three independent Supabase projects** — never share a project across environments.

| Environment | Branch         | Supabase Project   | Purpose                                     |
|-------------|----------------|--------------------|---------------------------------------------|
| Development | local / any    | `rc-dev`           | Local dev, ad-hoc testing, schema drafting  |
| Staging     | `develop`      | `rc-staging`       | QA preview deploys, pre-prod migrations     |
| Production  | `main`         | `rc-prod`          | Live customer data                          |

### Why separate projects (not schemas or branches)

- A bad migration on a shared project blocks every environment.
- Row Level Security (RLS) policies must be exercised against representative seed data; staging and production seed sets diverge.
- Service role keys leak blast radius — a compromised dev key must never grant access to prod.

### Per-environment secrets

Each environment gets its own values for:

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Set in:

- **Local**: `.env.local` (never committed)
- **Vercel staging**: project → Settings → Environment Variables → `Preview` (scoped to `develop`)
- **Vercel production**: project → Settings → Environment Variables → `Production`

Verify Vercel has the right project pointed at the right environment:

```bash
vercel env ls
```

## Backups

Supabase Pro tier runs **daily automated backups** with 7-day retention. Point-in-time recovery (PITR) is available on Team tier (2-minute granularity, 7-day window).

Confirm backup status:

1. Supabase dashboard → project → Database → Backups
2. Verify the most recent backup timestamp is within 24 hours
3. Confirm storage size is non-zero and growing in line with table growth

If the latest backup is missing or stale, **page the on-call engineer immediately** and do not run any destructive migrations until backups resume.

## Restore Drill

Run quarterly. The drill validates that a backup actually restores — an untested backup is a hope, not a recovery plan.

### Procedure

1. **Create a fresh Supabase project** named `rc-restore-drill-YYYY-MM-DD` in the same org.
2. **Trigger restore** from the most recent `rc-prod` daily backup:
   - Supabase dashboard → `rc-prod` → Database → Backups → select backup → Restore to new project → choose `rc-restore-drill-YYYY-MM-DD`
3. **Wait for restore to complete** (typically 5–30 minutes depending on DB size).
4. **Validate schema integrity**:
   ```bash
   # From local machine, point Supabase CLI at the restored project
   export SUPABASE_DB_URL='postgresql://postgres:[restore-password]@db.[restore-ref].supabase.co:5432/postgres'
   npx supabase db diff --linked  # should produce no output if schemas match
   ```
5. **Validate row counts** for critical tables:
   ```sql
   select count(*) from family_units;
   select count(*) from family_members;
   select count(*) from school;
   select count(*) from coach;
   select count(*) from interaction;
   select count(*) from task;
   ```
   Compare against production counts from the same snapshot timestamp. They must match exactly.
6. **Validate RLS policies fired**:
   ```sql
   select schemaname, tablename, policyname from pg_policies order by tablename;
   ```
   Should match the policy list from production.
7. **Smoke-test reads** by pointing a local dev server at the restored project for 5 minutes:
   ```bash
   NUXT_PUBLIC_SUPABASE_URL='https://[restore-ref].supabase.co' \
   NUXT_PUBLIC_SUPABASE_ANON_KEY='[restore-anon-key]' \
   SUPABASE_SERVICE_ROLE_KEY='[restore-service-key]' \
   npm run dev
   ```
   Log in with a known test account, verify dashboard loads with expected data.
8. **Document the drill** by appending to `planning/restore-drill-log.md`:
   - Date, operator, backup snapshot timestamp
   - Restore duration
   - Row count diffs (expect 0)
   - Any anomalies encountered
9. **Pause or delete** the restore-drill project to avoid Supabase charges. Pause first — keep around 24 hours in case anything looks suspicious in the log.

### What "passing" looks like

- Restore completes within 30 minutes
- Row counts match production at the snapshot timestamp
- RLS policies and schema diff are clean
- A real user can log in and see their data on the restored project

### What to do if the drill fails

1. **Stop**. Do not delete the failed restore project.
2. File an incident: `planning/incidents/YYYY-MM-DD-restore-drill-failure.md`.
3. Open a ticket with Supabase support, attach project ref + restore attempt timestamp.
4. Trigger a second restore from the next-newest backup; confirm whether the failure is point-in-time or systemic.
5. If two consecutive backups fail to restore, escalate to engineering leadership — production data is at risk.

## Disaster Recovery (Production Down)

When production needs to roll back:

1. **Communicate**: post in `#incidents` Slack with severity and ETA.
2. **Snapshot the broken state** before doing anything destructive — Supabase dashboard → Database → Backups → "Create on-demand backup". You may need this for forensics.
3. **Restore in place** if the corruption is recent and contained:
   - Supabase dashboard → `rc-prod` → Database → Backups → Restore to current project → select the last-known-good backup
   - **This overwrites production data.** Triple-check the backup timestamp.
4. **Or restore to a side project** and migrate traffic only after validation:
   - Restore to `rc-prod-recovery-YYYY-MM-DD` per the drill procedure above.
   - Once validated, swap Vercel env vars to point at the recovery project.
   - This path is safer but involves DNS-level cutover delay.
5. **Post-incident**: write a postmortem within 48 hours in `planning/incidents/`. Include timeline, root cause, recovery steps, and prevention items.

## Migration Safety

Every migration under `supabase/migrations/` runs against staging first via the `develop` branch CI before reaching production. Before merging to `main`:

- [ ] Migration tested against staging without errors
- [ ] Migration is idempotent or has a documented rollback path
- [ ] If the migration adds a NOT NULL column to a populated table, it ships in two steps: nullable add → backfill → constraint add
- [ ] Any column added is indexed in the same file if used in `.eq()`, `.order()`, `.match()`
- [ ] The most recent backup is fresh (last 24 hours) before applying to production

## On-Call Quick Reference

| Symptom                              | First action                                              |
|--------------------------------------|-----------------------------------------------------------|
| Dashboard returns 500s globally      | Supabase dashboard → check project status + DB CPU        |
| Specific table empty/wrong data      | Compare against latest backup before doing anything       |
| Migration broke production           | Restore in place from pre-migration backup                |
| Service role key leaked              | Rotate immediately in Supabase dashboard, redeploy Vercel |
| Restore drill failed                 | Do not delete drill project; file incident; escalate      |
