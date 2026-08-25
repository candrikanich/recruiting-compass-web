# Public Player Profile — Design Spec

**Date:** 2026-08-25
**Branch:** `feat/public-player-profile`
**Source:** Figma "Player Public Profile — Web Capture" (public page node 5-5, coach-interaction flow node 8-4)
**Status:** Approved design, phased build

## Summary

Redesign and extend the existing public player profile into a shareable recruiting page, add an owner-facing setup/editor, and add two inbound coach-interaction flows (Contact Player, Express Interest). Coaches never authenticate — the public page is shared by the player, and recruiting contacts submit lightweight forms that match-or-create a coach record in the player's CRM and notify the player.

A public profile already exists end-to-end (`pages/p/[slug].vue`, gated `server/api/public/profile/[slug].get.ts`, `player_profiles` table, per-coach `ref_token` tracking links, view tracking). This effort redesigns the page to the Figma layout, exposes data already captured but not shown (performance metrics, team history), and builds the setup + interaction subsystems.

## Locked decisions

- **Coach identity:** none. Inbound lead-capture only. A contact form matches an existing followed coach (school/name/email) or creates a new coach contact under the selected school for the player to follow. No coach login, portal, or account.
- **Delivery:** in-app `notifications` inbox + Resend email. No device push (future phase).
- **Anti-abuse:** Cloudflare Turnstile + per-IP/per-slug rate limiting + honeypot on all unauthenticated write endpoints.
- **Section visibility:** migrate the 4 existing `show_*` bools into an ordered `section_config` jsonb; keep the bools written in sync for back-compat; read from `section_config` going forward.
- **Commitment status:** `Uncommitted | Committed` + optional `committed_school_id`.
- **"Verified Coach Access" pill / .edu verify:** soft badge only (email domain matches selected school domain), never a gate.
- **Player PII:** the player's private email/phone is never returned by any public endpoint and never shown to a coach. Delivery is server-side (notification + email to the player).
- **Parity:** iOS is a follow-up handoff spec (web = source of truth). Out of scope for these 4 phases.

## What already exists (reuse, do not rebuild)

| Piece | Location |
|---|---|
| Public page | `pages/p/[slug].vue` (no auth; 404/410 handling) |
| Public API (gated) | `server/api/public/profile/[slug].get.ts` (service-role, `is_published` + `show_*`) |
| Profile card UI | `components/profile/PublicProfileCard.vue` |
| Profile record | `player_profiles` → `PlayerProfile` (`types/models.ts:449`): `hash_slug`, `vanity_slug`, `is_published`, `bio`, `header_color`, `show_academics/athletic/film/schools` |
| Player details (jsonb) | `user_preferences` category=`player` → `PlayerDetails` (`types/models.ts:361`) |
| Metrics (table, unused on public) | `performance_metrics` → `PerformanceMetric` (`types/models.ts:209`); vocab `utils/metrics/canonical.ts` |
| Film | `video_links` table; surfaced when `show_film` |
| View tracking | `server/api/public/profile/[slug]/view.post.ts` |
| Coach tracking links | `server/api/player/profile/tracking-links/[coachId].(post|get).ts`; `ProfileTrackingLink` (`ref_token`, `view_count`) |
| Coaches (CRM, no auth) | `coaches` → `Coach` (`types/models.ts:121`); `stores/coaches.ts`, `pages/coaches/*` |
| Notifications inbox | `notifications` table, `NotificationType` (`types/models.ts:274`), `useNotifications`, `pages/notifications.vue` |
| Email | Resend via `server/utils/emailService.ts` |
| Design system | `components/DesignSystem/*` (DSButton/DSCard/DSBadge/DSInput/DSEmptyState…); tokens `docs/design/tokens.md`, `assets/styles/theme.css` |

## Data model changes

### `player_profiles` (migration — extend)

- `banner_url text null` — custom hero banner (Supabase storage bucket `profile-banners`)
- `looking_for text null` — "What I'm Looking For" statement
- `commitment_status text not null default 'uncommitted'` — `uncommitted | committed`
- `committed_school_id uuid null references schools(id)`
- `awards jsonb not null default '[]'` — `[{ title: string, year: number|null }]`
- `values_tags text[] not null default '{}'` — Target Program & Values tags
- `section_config jsonb not null default '[]'` — ordered `[{ key, visible }]`; keys: `metrics | film | academics | values | team_history | awards`
- `show_metrics boolean not null default false`
- Backfill `section_config` from existing `show_*` bools; add trigger or app-layer sync to keep `show_*` in step with `section_config` writes.

### `PlayerDetails` (player prefs — add)

- `jersey_number number | null`

### `profile_contacts` (new table — both flows)

```
id            uuid pk default gen_random_uuid()
player_user_id uuid not null references users(id)
type          text not null check (type in ('contact','interest'))
coach_name    text not null
coach_email   text null
coach_title   text null
school_name   text null
school_id     uuid null references schools(id)
program       text null            -- express-interest program select
note          text null
ref_token     text null            -- from tracking link if present
matched_coach_id uuid null references coaches(id)
created_coach_id uuid null references coaches(id)
email_verified boolean not null default false
ip            inet null
ua            text null
created_at    timestamptz not null default now()
read_at       timestamptz null
```

RLS: player reads own rows (`player_user_id = auth.uid()` within family unit — follow existing family-scoping pattern). Inserts are service-role only (public endpoint uses `useSupabaseAdmin()`); no client insert policy.

### `NotificationType` — add

`profile_contact`, `profile_interest` (or reuse `inbound_interaction` — decide at plan time; new types are clearer for analytics).

## Endpoints

### Public (unauthenticated, service-role, hardened)

- `GET /api/public/profile/[slug]` — **extend** existing payload: add metrics (when `metrics` section visible), team history, awards, values_tags, commitment_status, jersey_number, banner_url. Never include player email/phone.
- `POST /api/public/profile/[slug]/contact` — Contact Player. Zod body `{ coachName, coachEmail?, coachTitle?, schoolId?|schoolName, note, refToken?, turnstileToken, hp? }`. Verify Turnstile, honeypot, rate-limit. Resolve player by slug. Match-or-create coach in player CRM (school + name/email). Insert `profile_contacts` (type=contact). Create notification + Resend email to player. Return `{ ok: true }` only (no PII).
- `POST /api/public/profile/[slug]/interest` — Express Interest. Zod `{ program, note?, coachName?, coachEmail?, refToken?, turnstileToken, hp? }`. Same guards. Insert `profile_contacts` (type=interest). Notification + optional email. Return `{ ok: true }`.

### Owner (authenticated)

- Extend profile write path (`stores/playerProfile.ts` / existing profile patch) for `banner_url`, `looking_for`, `commitment_status`, `committed_school_id`, `awards`, `values_tags`, `section_config`, `show_metrics`.
- Banner upload → Supabase storage (`profile-banners/<user>/…`), return public URL.
- `jersey_number` via existing `server/api/user/preferences/player-details.patch.ts`.
- Inbound inbox: `GET /api/player/profile/contacts` (list `profile_contacts` for the family athlete) + mark-read; feeds athlete analytics ("N this month").

## UI

### Public page — rebuild `components/profile/PublicProfileCard.vue` to Figma dark-hero layout

Header (banner/color hero, avatar, name + sport badge, physicals row `height · weight · pos/# · class · GPA`, bio, Contact Player + Express Interest buttons, "Verified Coach Access" pill) → Verified Athletic Metrics grid → Featured Highlights (video cards) → Academic Profile → Target Program & Values (looking_for + values_tags) → Team History & Coaching References → Awards & Honors → footer. Section order/visibility driven by `section_config`. Use DS primitives + brand tokens (no raw hex).

### Setup page — `pages/settings/public-profile.vue` (light, Figma right frame)

Live/public toggle + Share link (copy/email/text/twitter) header; (1) Appearance — hero color theme + banner upload; (2) Profile Content — bio + "What I'm Looking For"; (3) Section Configuration — drag-reorder + per-section visibility → `section_config`; (4) Recruitment Status dropdown. Right rail: LIVE mini-preview (reuse the public card in a scaled container) + QR code (client-generated from public URL). Drag reorder via lightweight approach (up/down buttons acceptable if a drag lib is undesirable).

### Interaction modals (public page)

- Contact Player modal: coach name/title, school select (typeahead over `schools`, free-text fallback → `schoolName`), email, message. Turnstile widget. Success → confirmation state ("The player will be notified and can respond directly").
- Express Interest popover: program select + optional note. Success → "Interest Sent" button state (persist per-session in localStorage; server is source of truth).

## Phasing

1. **Phase 1 — Public page redesign (read-only).** Migration; extend public GET; rebuild `PublicProfileCard.vue`; Contact/Interest buttons inert. Expose metrics + team history + awards + values + commitment.
2. **Phase 2 — Owner setup page.** `pages/settings/public-profile.vue`; appearance/banner; content; section_config drag+visibility; commitment dropdown; share tools; QR; live mini-preview. Migrate `show_*` → `section_config`.
3. **Phase 3 — Contact Player flow.** Public contact endpoint + match-or-create coach + notification + email + confirmation modal. Turnstile + rate-limit + honeypot.
4. **Phase 4 — Express Interest flow.** Public interest endpoint + one-tap popover + "Interest Sent" state + athlete inbound inbox + monthly analytics.

## Testing

- Unit (Vitest): match-or-create coach resolver (existing-follow match vs new-create), section_config backfill + sync, public payload gating (PII never leaks, sections gated), Zod validators, rate-limit logic.
- Integration: public endpoints hardened path (Turnstile mock, honeypot reject, rate-limit 429).
- E2E (Playwright): share → open public page unauth → submit contact → player notification appears; express interest → "Interest Sent" state; setup page reorder persists + reflects on public page.
- Manual: run the app; open public URL logged-out; verify no PII in network payloads.

## Security notes (Phase 3/4 — main risk surface)

Unauthenticated write endpoints. Required: Turnstile verification server-side, per-IP + per-slug rate limiting, honeypot field, Zod validation, service-role inserts only (no client RLS insert), no player PII in any public response, capture `ip`/`ua` for abuse triage, edu-domain → `email_verified` is display-only. Env: `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

## Open questions

- Reuse `inbound_interaction` NotificationType vs add `profile_contact`/`profile_interest` (leaning: add, for clean analytics).
- Drag-reorder lib vs up/down buttons for section config (leaning: up/down to avoid a dep, revisit if UX weak).
- Banner storage bucket policy (public-read) + image size/type validation limits.
- Whether Express Interest requires coach email at all (Figma shows program + note only; player-side value of anonymous interest vs identifiable).
