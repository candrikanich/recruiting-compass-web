# k6 Load Test Findings

## 2026-09-22 — first live run, QA (xpxzhqghxecsjhvklsqg / qa.myrecruitingcompass.com)

**Profile run:** original 10 → 100 → 500 VU ramp, no sleep between iterations, single source IP.

**Result:** auth (service-role magic-link mint) worked correctly. `GET /api/schools/:id/fit-score` requests succeeded at low VU counts — p95 143–353ms, no app-level errors observed before the run was cut short.

**What actually happened:** around ~90 seconds in (VU count climbing through the 100s), Vercel's built-in system DDoS mitigation — not a custom Chris-configured rule, not Supabase, not the app — auto-denied all further requests from the test machine's single source IP. Confirmed via the project's Vercel dashboard (Firewall tab): a "System Rule" Deny action against that IP, 36K+ requests, scheduled to self-expire ~15 minutes after it started. The block was IP-scoped, not site-wide; other real traffic was very likely unaffected, though this wasn't independently confirmed in the moment. Site returned to HTTP 200 for that IP once the block's scheduled end time passed, with no manual intervention needed.

**Bottleneck identified:** Vercel's edge-level anti-abuse system, triggered by the sheer request rate from one IP — not the Nitro server, not Supabase, not the fit-score computation itself. We got zero real signal about app/DB capacity from this run; the infra layer intervened first.

**Fix applied:** ramp capped at 5 → 20 → 50 VUs + a 1s `sleep()` per iteration (bounds throughput to ≤50 req/s from one IP regardless of VU count). Not yet re-run at this new profile — do that next, watching the Vercel Firewall dashboard live, and step the ramp up gradually from here rather than jumping straight back to hundreds of VUs.

**Open question:** what's the actual req/s ceiling before Vercel's mitigation engages? Not determined — the fix backed off proactively rather than finding the exact threshold. Worth probing in a future run if useful (e.g. slowly increasing sustained req/s until a Deny rule appears), but low priority since the goal is app/DB signal, not mapping Vercel's own limits.
