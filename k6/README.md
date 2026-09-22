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

Picked because they're the most query-heavy paths found in the codebase (union queries across `interactions`/`athlete_messages`/`events`/`video_links`/`offers` for admin growth stats, per-school fit-score computation):
- `GET /api/schools`
- `GET /api/schools/:id/fit-score`
- `POST /api/athlete/phase/advance`
- `GET /api/admin/growth` (admin-gated — only include if test account has admin role)

## Output

After a run, add a dated entry to `k6/findings.md`: VU count reached before p95 degraded, first bottleneck observed, any errors.
