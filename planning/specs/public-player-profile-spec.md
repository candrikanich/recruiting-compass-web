# Public Player Profile Pages — Feature Spec

**Status:** Draft
**Date:** 2026-03-16
**Author:** Chris (via interview)

---

## Overview

A publicly accessible, shareable profile page players create inside TRC and send to coaches via email or social media. It acts as a **digital recruiting card** — clean, professional, always showing live data. Coaches click a link (no account required) and see exactly what the player chose to share.

---

## Goals

- Give players a single shareable URL representing their recruiting identity
- Let players control what data coaches see (toggles, not version locks)
- Track which coaches viewed the profile, tied to coach records in the app
- No new infrastructure: same domain, Nuxt public route

---

## URL Architecture

| Type | Format | Notes |
|---|---|---|
| Primary | `/p/k7x9m2` | Random 6-char hash, unguessable, generated at creation |
| Optional vanity | `/p/jsmith2026` | Player-chosen, free-form, changeable (old URL breaks, no redirect) |

Both resolve to the same profile. Domain: `recruitingcompass.com`. No subdomain or short domain needed for V1.

---

## Profile Content

All sections are **individually toggleable** (on/off) by the player. Data is always pulled live from the app — no snapshots or versioning.

| Section | Data shown |
|---|---|
| **Bio / Statement** | Free-text personal statement written by the player (~300 chars max) |
| **Academic Profile** | GPA, SAT/ACT scores, graduation year, school name, core courses |
| **Athletic Profile** | Sport, position, height, weight |
| **Film & Video** | Highlight reel and game film links from the app |
| **Target Schools** | Schools the player is actively considering |

> **Coach interaction log is NOT shown.** Too sensitive for V1.

---

## Coach Experience (The Public Page)

- Fully **read-only**. No forms, no accounts required.
- Contact links (email, phone if toggled) are plain **clickable `mailto:` / `tel:` links** — no in-app contact form.
- If a player's profile is unpublished or their subscription is inactive, the URL shows a **friendly "not available" message** (not a 404).

---

## Player Setup — Entry Point in App

Located inside the **player profile section** (where profile data already lives). A new "Public Profile" subsection with:

1. **Published / Unpublished toggle** — instantly goes live or offline
2. **Section visibility toggles** — per section listed above
3. **Bio text field** — free-form statement
4. **Hash URL display** — permanent, system-generated, copyable
5. **Optional vanity slug field** — player sets their own (uniqueness validated live)
6. **Live preview panel** — split-pane or toggle: settings left, preview right (exactly what a coach sees)

---

## Coach Tracking

Coaches will not have TRC accounts. Tracking is handled via **per-coach tracking links**.

### How It Works

1. Player opens a coach's detail page in the app
2. A **"Send Profile"** button generates a unique tracking URL for that coach:
   `recruitingcompass.com/p/k7x9m2?ref=abc123`
3. Player copies the link and sends it manually (email, text, etc.)
4. When the coach clicks the link, the view is logged against that coach record
5. Coach's detail page shows: view count + last viewed timestamp

### What the Player Sees

- On each **coach detail page**: view history (count, timestamps) for that coach's link
- No aggregate dashboard in V1 — analytics are coach-scoped, not profile-scoped

> **Note:** If a player shares the raw profile URL (without `?ref=`), those views are logged as anonymous/untracked. This is acceptable.

---

## Profile Lifecycle

| State | URL behavior | Data preserved? |
|---|---|---|
| **Published** | Live and accessible | — |
| **Unpublished** | Friendly "not available" message | Yes — all settings + tracking links |
| **Subscription cancelled** | Friendly "not available" message (immediately) | N/A |
| **Vanity slug changed** | Old vanity URL breaks (no redirect) | Hash URL always works |

No auto-pause on inactivity.

---

## Design Direction

- **Clean and professional** — resume card style, not sports-card flashy
- **Mobile-first** — coaches often click email links on their phone
- **TRC brand-consistent** but not a clone of the app UI
- Big name header, stat highlights grouped cleanly, film links prominent
- No login walls, no popups, no cookie banners blocking content

---

## Technical Architecture

### Database

**`player_profiles`**
```sql
id              uuid PK
player_id       uuid FK → players.id
family_unit_id  uuid FK → family_units.id  -- access control
hash_slug       text UNIQUE NOT NULL       -- system-generated, e.g. 'k7x9m2'
vanity_slug     text UNIQUE NULLABLE       -- player-chosen
is_published    boolean DEFAULT false
bio             text NULLABLE
show_academics  boolean DEFAULT true
show_athletic   boolean DEFAULT true
show_film       boolean DEFAULT true
show_schools    boolean DEFAULT true
created_at      timestamptz
updated_at      timestamptz
```

**`profile_tracking_links`**
```sql
id              uuid PK
profile_id      uuid FK → player_profiles.id
coach_id        uuid FK → coaches.id
ref_token       text UNIQUE NOT NULL       -- random token for ?ref= param
view_count      int DEFAULT 0
last_viewed_at  timestamptz NULLABLE
created_at      timestamptz
```

**`profile_views`** *(detailed analytics log)*
```sql
id                  uuid PK
profile_id          uuid FK → player_profiles.id
tracking_link_id    uuid FK NULLABLE → profile_tracking_links.id
viewed_at           timestamptz
user_agent          text NULLABLE
```

### Nuxt Routes

| File | Purpose |
|---|---|
| `pages/p/[slug].vue` | Public profile page — no auth middleware |
| Player profile settings section | Embed profile setup UI as a subsection |

### API Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/public/profile/[slug]` | None | Returns public profile data |
| `POST` | `/api/public/profile/[slug]/view` | None | Logs a view (with optional `ref` token) |
| `PUT` | `/api/player/profile` | Required | Update profile settings (visibility toggles, bio, slug) |
| `POST` | `/api/player/profile/tracking-links` | Required | Generate tracking link for a coach |
| `GET` | `/api/player/profile/tracking-links/[coachId]` | Required | Fetch link + view stats for a specific coach |

### Slug Resolution

The `[slug]` on the public route resolves as follows:
1. Try `player_profiles.hash_slug = slug`
2. If not found, try `player_profiles.vanity_slug = slug`
3. If still not found → 404 with friendly message

---

## Out of Scope — V1

- OG image / social preview card (nice to have; can be added with Vercel OG later)
- Sharing directly from the app (player copies link manually for now)
- Aggregate view dashboard across all coaches
- Coach-facing features (save player, follow, contact form)
- Profile expiration or auto-pause on inactivity
- Redirect from old vanity slug after change

---

## Resolved Decisions

- **Hash generation**: `nanoid` 6-char alphanumeric (e.g. `k7x9m2`). Low collision risk at this scale.
- **Vanity slug format**: Lowercase alphanumeric + hyphens only, max 30 chars. Reserved paths (`p`, `api`, `auth`, etc.) blocked at validation.
- **Tracking link per coach**: Idempotent — one link per coach, generated once, reused on subsequent sends. Keeps analytics clean and prevents duplicate link clutter on the coach detail page.
- [ ] Should `profile_views` rows be written async (fire-and-forget) or inline with the page load?
