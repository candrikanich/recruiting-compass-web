# Load Testing (k6)

Phase 3 of `planning/testing-strategy-2026-09-22.md`. Not wired into CI — manual trigger only, run before major launches or when suspecting a bottleneck.

## ⚠️ Before running

**Confirm target with Chris first.** These scripts point at the QA/test Supabase project (`ahpethltxopkjxxzwmmb` / `xpxzhqghxecsjhvklsqg` — verify which is current test project, see `planning/CLAUDE.local.md` `prod-infra-identity`). That project is shared with the E2E suite. Running 500 VUs while E2E is mid-run will cause cross-contamination and false E2E failures. **Never point `BASE_URL`/`SUPABASE_URL` at prod.**

## Install

k6 is a standalone binary, not an npm package:
```bash
brew install k6
```

## Setup

Create `k6/.env` (gitignored) with a throwaway test account's credentials:
```
BASE_URL=https://<qa-deploy>.vercel.app
SUPABASE_URL=https://<test-project>.supabase.co
SUPABASE_ANON_KEY=<anon key>
TEST_EMAIL=k6-load-test@example.com
TEST_PASSWORD=<password>
```

## Run

```bash
k6 run --env-file k6/.env k6/api-load.js
```

Ramp profile: 10 → 100 → 500 VUs over 5 minutes (see `stages` in `api-load.js`). Watch:
- p95 latency per endpoint (k6 summary)
- Supabase dashboard: connection pool usage, slow query log
- Nitro server logs for 5xx spikes

## Endpoints covered

Currently implemented in `api-load.js`:
- `GET /api/schools/:id/fit-score` — the test account's own school id is resolved once in `setup()` via a direct, RLS-scoped Supabase REST read (no `GET /api/schools` collection route exists server-side; school lists are fetched client-side straight from Supabase)

**Not yet implemented** — planned, do not assume these are exercised by running `k6 run`:
- `POST /api/athlete/phase/advance` — mutates account state, needs disposable per-user test data or a safe reset strategy before it's safe to load-test
- `GET /api/admin/growth` — the union-query path across `interactions`/`athlete_messages`/`events`/`video_links`/`offers` most likely to bottleneck first; needs a scenario gated on an explicitly-configured admin test account

## Output

After a run, add a dated entry to `k6/findings.md`: VU count reached before p95 degraded, first bottleneck observed, any errors.
