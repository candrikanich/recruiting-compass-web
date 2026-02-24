# Plan: Suggestions Bootstrap Fix

**Date:** 2026-02-24
**Branch:** fix/suggestions-bootstrap
**Status:** Approved — implementing

## Problem

The `suggestion` table is empty for all users. The dashboard Action Items list shows nothing.

Two root causes:
1. No `vercel.json` → daily cron (`POST /api/cron/daily-suggestions`) is never scheduled
2. Dashboard only reads (`GET /api/suggestions`), never triggers evaluation for new/empty users

## Solution

### Task 1 — Create `vercel.json` with Vercel Cron schedule

Create `/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-suggestions",
      "schedule": "0 7 * * *"
    }
  ]
}
```

Vercel auto-injects `CRON_SECRET` env var and sends it as `Authorization: Bearer <secret>`.
The existing endpoint checks `x-cron-secret` header. Update the endpoint auth check to match
Vercel's convention (`Authorization: Bearer $CRON_SECRET`).

### Task 2 — Server-side bootstrap in `GET /api/suggestions`

In `server/api/suggestions/index.get.ts`:
- After fetching surfaced suggestions, if the array is empty:
  - Check user's role (non-blocking — don't throw, just skip bootstrap if parent)
  - If athlete (not parent): call `triggerSuggestionUpdate(supabase, user.id, "daily_refresh")`
  - Re-fetch surfaced suggestions
- Return the (now-populated) result

This is fire-and-wait: the GET blocks until evaluation completes, then returns populated suggestions.
iOS and web clients get suggestions on first load with no special client logic.

## Files Changed

- `vercel.json` — new file
- `server/api/cron/daily-suggestions.post.ts` — update auth header check
- `server/api/suggestions/index.get.ts` — add bootstrap logic

## Verification

- `npm test` passes
- `npm run type-check` passes
