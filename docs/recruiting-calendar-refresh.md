# NCAA Recruiting Calendar — Annual Refresh Procedure

The sport recruiting calendars in `utils/recruitingCalendar/` are **hand-transcribed** from the official NCAA Division I recruiting-calendar PDFs for a single season (the `SEASON` constant there — currently `2026-27`). NCAA publishes each next season's PDFs to the same S3 bucket, usually in **spring/summer**. When that happens the data must be re-transcribed and `SEASON` bumped. This is deliberate — the PDFs are graphical grids and the dates are compliance-sensitive, so we do **not** auto-parse them.

## The checker

`scripts/check-ncaa-calendar-cycle.mjs` HEAD-checks whether the next season's PDFs are live yet.

```bash
node scripts/check-ncaa-calendar-cycle.mjs           # checks NEXT_SEASON (default)
node scripts/check-ncaa-calendar-cycle.mjs 2026-27   # sanity-check the current cycle
```

It prints a per-code ✓/✗ table and a machine-readable `RESULT: {json}` last line (`cycleAvailable`, `foundCodes`, `urls`). Exit code is always 0 — it's a checker, not a gate.

## The quarterly routine

A scheduled Claude Code routine runs the checker quarterly. When `cycleAvailable` is true (next-season PDFs exist), it opens a GitHub issue pre-filled with the live PDF URLs so a human can re-transcribe. It never edits calendar data itself.

## When the next cycle drops — re-transcription steps

1. Run the checker for the new season; confirm the PDFs are live.
2. For each calendar, download the PDF and read it via a **render/vision** path (plain text extraction returns nothing from these graphical PDFs). Transcribe every dead/quiet/contact/evaluation/recruiting_shutdown window + signing milestones into `utils/recruitingCalendar/calendarData.ts`, preserving `type`/`start`/`end`/`description`/`confidence` and each calendar's `source` URL + `verifiedOn`.
3. Cross-check each window against the PDF's own day-grid (internal redundancy) and the prior-year same-sport PDF (structural). No independent second source exists at release time — most dates will be single-authoritative-source (MEDIUM confidence); anchors/holidays are HIGH.
4. Bump `SEASON` / `SEASON_END` (and `CURRENT_SEASON`/`NEXT_SEASON` in the checker script).
5. The integrity + plausibility tests (`tests/unit/utils/recruitingCalendar/calendarData.spec.ts`) will catch fat-finger errors — fix the datum, never weaken the test.
6. Port the identical values to the iOS `Core/Utilities/RecruitingCalendar*.swift` (byte-identical parity; the per-key period-count parity test guards it).
7. `.github/CODEOWNERS` gates `utils/recruitingCalendar/**` — the change goes through PR review.

**Accuracy note:** the runtime compliance disclaimer + the link to the official NCAA PDF are load-bearing given single-source data. Keep them.
