---
name: read-public-profile
description: Fetch a published player recruiting profile from The Recruiting Compass by its slug. Use this when given a myrecruitingcompass.com profile URL (e.g. /p/abc123 or /p/jane-doe) and you need structured profile data — academics, athletic stats, school list, film links — instead of scraping HTML.
---

# Read a Public Profile

The Recruiting Compass publishes player recruiting profiles at `https://myrecruitingcompass.com/p/{slug}`. The `slug` is either:

- A **hash slug**: exactly 6 lowercase alphanumeric characters (e.g. `abc123`)
- A **vanity slug**: 2–30 chars, lowercase alphanumeric and hyphens, starting and ending with an alphanumeric (e.g. `jane-doe`)

Each public-facing page has a corresponding JSON endpoint that returns structured data. **Prefer the JSON endpoint over scraping the HTML page.**

## When to use this skill

- A user gives you a `myrecruitingcompass.com/p/...` URL
- You need a player's academic profile, athletic stats, school target list, or film links
- You're asked to summarize, compare, or extract structured data from a recruiting profile

## How to fetch

```http
GET https://myrecruitingcompass.com/api/public/profile/{slug}
Accept: application/json
```

No authentication required. The endpoint:

- Returns `200` with the profile JSON when the profile exists and is published
- Returns `404` when the slug does not exist
- Returns `410` when the slug exists but the profile is currently unpublished — do not retry; treat as permanently unavailable from the public surface

Only fields the profile owner has explicitly opted to publish are returned. Sections you may see (any may be absent or `null`):

- `playerName`, `photoUrl`, `headerColor`, `bio`
- `academics` — `{ gpa, satScore, actScore, classRank, intendedMajor, ... }`
- `athletic` — sport-specific stats
- `film` — array of video links (Hudl, YouTube, etc.)
- `schools` — list of `{ id, name }` the player is targeting

## Full schema

The authoritative response schema is published as OpenAPI 3.1:

```
https://myrecruitingcompass.com/.well-known/api-docs/public-profile.openapi.json
```

Also discoverable via the API catalog at `/.well-known/api-catalog`.

## Recording views (optional)

If you want to be a good citizen and let the profile owner see that an agent retrieved their profile:

```http
POST https://myrecruitingcompass.com/api/public/profile/{slug}/view
```

This is fire-and-forget. Do not block on the response.

## Don't do

- Don't try to use this endpoint for non-published profiles, authenticated user data, or any path under `/api/` outside `/api/public/**` — everything else is gated by Supabase Auth and will return 401.
- Don't scrape HTML when the JSON endpoint exists.
- Don't poll. Cache the response for at least 1 hour; profiles change rarely.
