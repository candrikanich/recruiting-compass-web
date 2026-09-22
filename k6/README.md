# Load Testing (k6)

Phase 3 of `planning/testing-strategy-2026-09-22.md`. Not wired into CI — manual trigger only, run before major launches or when suspecting a bottleneck.

## ⚠️ Before running

**Confirm target with Chris first.** These scripts point at the QA/test Supabase project (`ahpethltxopkjxxzwmmb` / `xpxzhqghxecsjhvklsqg` — verify which is current test project, see `planning/CLAUDE.local.md` `prod-infra-identity`). That project is shared with the E2E suite. Running load while E2E is mid-run will cause cross-contamination and false E2E failures. **Never point `BASE_URL`/`SUPABASE_URL` at prod.**

**⚠️ Vercel's system DDoS mitigation trips well below app capacity.** A 2026-09-22 run at 500 VUs with no pacing got the test machine's IP auto-denied by Vercel within ~90s (self-expired ~15min later) — see `k6/findings.md`. The current profile is capped at 50 VUs + 1s sleep per iteration specifically to stay under that ceiling. If you raise it, watch the project's Vercel dashboard → Firewall tab live and stop immediately if "Persistent Actions" shows a new Deny rule against your IP.

## Install

k6 is a standalone binary, not an npm package:
```bash
brew install k6
```

## Setup

No separate env file — this reuses the repo's single root `.env`, which already has `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Add just two new lines to it (a throwaway test account's email and the QA deploy host — k6-specific, nothing else needs these):
```
BASE_URL=https://<qa-deploy-host>
TEST_EMAIL=k6-load-test@example.com
```

**No password needed.** QA's Supabase project has Turnstile captcha on the public password-grant login endpoint (correct — it protects real signup/login there, not disabled just for this script). `setup()` instead uses `SUPABASE_SERVICE_ROLE_KEY` to admin-generate a magic link for the test account and redeems it via `/auth/v1/verify`, which isn't captcha-gated.

**`SUPABASE_SERVICE_ROLE_KEY` grants full database access bypassing RLS** — it's already treated as a secret in the root `.env` (gitignored); nothing new to handle here, just don't paste its value into chat/logs/PRs.

## Run

k6 has no built-in `.env` loader — export the root `.env` into the shell first, then run:
```bash
set -a && source .env && set +a && k6 run k6/api-load.js
```

Ramp profile: 5 → 20 → 50 VUs over 5 minutes, 1s sleep per iteration (see `stages` in `api-load.js`). Watch:
- p95 latency per endpoint (k6 summary)
- Supabase dashboard: connection pool usage, slow query log
- Nitro server logs for 5xx spikes
- **Vercel dashboard → Firewall tab**, live — this is what actually failed first last time, not the app

## Endpoints covered

Currently implemented in `api-load.js`:
- `GET /api/schools/recommendations` — real query weight (`assembleSchoolRecommendations`), no side effects, currently wired into the schools-page empty state. **Redis-cached per athlete for 2 minutes** — repeated calls from the same test account within that window hit cache, not real DB work; keep this in mind reading results.

Originally targeted `GET /api/schools/:id/fit-score` — discovered 2026-09-22 to be dead/orphaned code (hardcodes `fitScore: null`, no remaining frontend caller). See `k6/findings.md` and the linked dead-code cleanup issue.

**Not yet implemented** — planned, do not assume these are exercised by running `k6 run`:
- `POST /api/athlete/phase/advance` — mutates account state, needs disposable per-user test data or a safe reset strategy before it's safe to load-test
- `GET /api/admin/growth` — the union-query path across `interactions`/`athlete_messages`/`events`/`video_links`/`offers` most likely to bottleneck first; needs a scenario gated on an explicitly-configured admin test account

## Output

After a run, add a dated entry to `k6/findings.md`: VU count reached before p95 degraded, first bottleneck observed, any errors.
