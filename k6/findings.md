# k6 Load Test Findings

## Correction (2026-09-22, after the two runs below)

Both runs below targeted `GET /api/schools/:id/fit-score`, which turned out to be **dead/orphaned code** — it hardcodes `fitScore: null` and nothing in the frontend calls it anymore (the app now computes fit signals client-side via `composables/useFitScore.ts`; the old `POST /api/schools/[id]/fit-score` sibling already self-documents as deprecated, returning 410). Neither run measured real fit-score capacity, because there was never any real work happening server-side to measure. The rate-limiter finding in the second run below is still valid (that's middleware-level, applies regardless of endpoint), but the "endpoint capacity" framing in both entries is not.

`api-load.js` now targets `GET /api/schools/recommendations` instead — a real, currently-used, query-weighted endpoint. Dead-code cleanup for `fit-score.get.ts` filed as [#972](https://github.com/candrikanich/recruiting-compass-web/issues/972).

## 2026-09-22 — first live run, QA (xpxzhqghxecsjhvklsqg / qa.myrecruitingcompass.com)

**Profile run:** original 10 → 100 → 500 VU ramp, no sleep between iterations, single source IP.

**Result:** auth (service-role magic-link mint) worked correctly. `GET /api/schools/:id/fit-score` requests succeeded at low VU counts — p95 143–353ms, no app-level errors observed before the run was cut short.

**What actually happened:** around ~90 seconds in (VU count climbing through the 100s), Vercel's built-in system DDoS mitigation — not a custom Chris-configured rule, not Supabase, not the app — auto-denied all further requests from the test machine's single source IP. Confirmed via the project's Vercel dashboard (Firewall tab): a "System Rule" Deny action against that IP, 36K+ requests, scheduled to self-expire ~15 minutes after it started. The block was IP-scoped, not site-wide; other real traffic was very likely unaffected, though this wasn't independently confirmed in the moment. Site returned to HTTP 200 for that IP once the block's scheduled end time passed, with no manual intervention needed.

**Bottleneck identified:** Vercel's edge-level anti-abuse system, triggered by the sheer request rate from one IP — not the Nitro server, not Supabase, not the fit-score computation itself. We got zero real signal about app/DB capacity from this run; the infra layer intervened first.

**Fix applied:** ramp capped at 5 → 20 → 50 VUs + a 1s `sleep()` per iteration (bounds throughput to ≤50 req/s from one IP regardless of VU count). Not yet re-run at this new profile — do that next, watching the Vercel Firewall dashboard live, and step the ramp up gradually from here rather than jumping straight back to hundreds of VUs.

**Open question:** what's the actual req/s ceiling before Vercel's mitigation engages? Not determined — the fix backed off proactively rather than finding the exact threshold. Worth probing in a future run if useful (e.g. slowly increasing sustained req/s until a Deny rule appears), but low priority since the goal is app/DB signal, not mapping Vercel's own limits.

## 2026-09-22 — second run, corrected 5→20→50 VU profile

**Profile run:** the fixed ramp (5 → 20 → 50 VUs, 1s sleep/iteration) from the fix above. Ran to completion, full 6 minutes, no Vercel mitigation triggered this time.

**Result:** `checks_failed: 94.40%` (6400/6779 fit-score requests failed). `http_req_duration` stayed low and flat throughout (avg 73ms, p95 185ms) — failures were fast, not timeouts or crashes, which ruled out a real server-side capacity problem.

**Root cause found: this test methodology can't measure fit-score capacity as written.** `server/middleware/rate-limit.ts` enforces 60 requests/minute per `(user token, path)` key whenever `NODE_ENV === "production"` — true for QA/Preview deploys. `setup()` mints exactly **one** token, shared by all 50 VUs, so every VU hammers the identical rate-limit key. 379 successes over 6 minutes ≈ 63/min — matches the 60/min limit almost exactly. The other 6400 requests were legitimate `429`s: the app correctly rate-limiting what looks like a single abusive user, not the endpoint failing under load.

**What this run actually validated (accidentally):** the per-user rate limiter works as designed in a real QA deploy. That's a legitimate, useful confirmation, just not the fit-score load-capacity signal the test was built to produce.

**Follow-up filed:** [#970](https://github.com/candrikanich/recruiting-compass-web/issues/970) — seed a pool of distinct test accounts (separate tokens spread across separate rate-limit keys) so a future run measures real endpoint/DB capacity instead of the rate limiter's own ceiling.
