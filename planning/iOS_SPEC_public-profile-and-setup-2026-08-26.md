# iOS Handoff — Public Player Profile + Setup Panel (Figma parity)

**Date:** 2026-08-26
**Source of truth:** web app (this repo). iOS should match the web behavior + the Figma designs.
**Web state:** all work below is **merged to `develop`** (QA), tip `ab0910f3`. Not yet promoted to `main`/prod.
**Figma:** file `TSVId5Z9HuIMirJm0ECLQR` ("Player Public Profile — Web Capture"). Chris will attach/point to the specific frames. Key nodes referenced during the web build:
- Screen-1 Public Profile: `5:6` (hero `5:15`, coach-bar `5:7`, metrics `5:35`, videos `5:72`, academics+target `5:108`, team history `5:153`, awards `5:186`, footer `5:212`)
- Screen-2 Setup Panel: `5:224`

> **iOS rule (from CLAUDE.md):** web app spec/implementation = source of truth for iOS work. Do not touch web files.

---

## 1. Why / scope

This session redesigned the **public player profile** (the page a coach sees) and the **owner-facing setup panel** (settings → Public Profile tab) to match Figma, plus fixed several bugs and added fields. iOS should bring its equivalents to parity: the public profile view, the owner setup/editor, and the new data fields.

---

## 2. Web PRs shipped this session (all merged to develop)

| PR | Summary |
|----|---------|
| #500 | Public profile redesign to Figma — hero, section icons, video thumbnail cards, academics+target 2-col, team-history badges + reference contact, awards medal chips, footer socials + last-updated, `public` layout (no app nav) |
| #501 | Metrics: format via canonical registry (`applyFormat`) + **dedupe by type keeping newest**; batting_avg → `.410`, drop garbage unit |
| #503 | Hero fidelity: circle headshot, coach-bar inside card, Express Interest = primary blue / Contact = outline, `3B/2B` shorthand, `3.80 GPA` |
| #504 | Brand social icons (X / Instagram / TikTok via inline SVG); pair Team History next to Awards (2-col) |
| #505 | **CSRF exempt `/api/public/`** — Contact + Express Interest forms were 403; public endpoints have no session/token (n/a for iOS bearer clients) |
| #506 | Express Interest "Program" → free-text **"School / Program"** (was position dropdown); no leaking the athlete's followed schools |
| #507 | Setup panel redesign — workspace header bar + live toggle, Share card, 6 swatches, eye-icon section toggles, Commitment Status subtext, compact mini-preview |
| #508 | Wire `header_color` to the hero background (was hardcoded); setup preview renders the **real** public card from the draft + fetches metrics; 50/50 layout |
| #509 | Box each setup section; fold Custom URL into the Share card; Content order Bio → Looking For → Values → Awards |
| #510 | Hero stacks by **container width** (container query) so the narrow preview renders clean; Navy swatch → `slate-900` |

---

## 3. Public Profile view — what iOS should render

Order + content (owner `section_config` controls visibility/order of the reorderable sections):

### Coach-header bar (top of the dark hero card)
- Left: compass mark + **"RecruitingCompass"**. Right: green **"Verified Coach Access"** pill (dot + label).
- Divider under the bar.

### Hero (dark, color = `header_color`)
- **Background color** driven by `header_color` (see §5). Not always slate.
- **Circle** headshot (avatar), ~140pt.
- Name + sport pill (e.g. "Baseball").
- Physicals line: `6'2" · 170 lbs · 3B/2B · Class of 2028 · 3.80 GPA`
  - Height `ft'in"`, weight `lbs`, **position shorthand** (e.g. `3B/2B` — first two positions abbreviated, primary first; web util `formatPositionsShort` → mirror iOS position abbreviation registry), `Class of {gradYear}`, `{gpa} GPA`.
- Bio paragraph.
- Social row: X / Instagram / TikTok brand icons + `@handle`, `·`-separated.
- Actions (right on wide, stacked on narrow): **Contact Player** (secondary/outline, mail icon) and **Express Interest** (primary blue, star icon). Express shows "Interest Sent" + disabled after a prior submit (persist locally per-slug).

### Sections (each header = lucide-style icon + title)
1. **Verified Athletic Metrics** (bar-chart icon) — credentials row (NCAA ID pill + service badges e.g. PBR / Perfect Game), then metric cards: **label on top, big value + unit below**. 3-col on wide. One card per metric type (dedupe — see §5).
2. **Featured Highlights** (film icon) — thumbnail cards (image area + centered play button + platform badge + title). Web has no thumbnail URL in the model yet → placeholder dark gradient; iOS same until thumbnails exist.
3. **Academic Profile** (grad-cap icon) **paired 2-col with Target Program & Values**: High School, GPA / SAT / ACT, Graduation Year, **Desired Major**, distinct **NCAA Eligibility Center ID** strip.
4. **Target Program & Values** (target icon) — "What I'm Looking For" paragraph + value tag chips.
5. **Team History & Coaching References** (clock icon) **paired 2-col with Awards**: each row = team name + **level badge** + "Coach: X — Reference Contact: {phone}" (contact only when present) + years.
6. **Awards & Athletic Honors** (trophy icon) — chips with a medal icon + title · year.

### Footer
- Left: compass + "Powered by The Recruiting Compass". Right: X / IG / TikTok icons. Below: "Profile last updated: {Month D, YYYY}" (from `updatedAt`).

### Layout notes
- No app navigation on the public page (web uses a dedicated chrome-free layout). iOS: this is a standalone shareable view.
- Pairing: academics+values and team+awards render side-by-side when both visible, else full width.

---

## 4. Setup Panel (owner editor) — what iOS should render

Matches Figma Screen-2. Two-column on web (form left, live preview right, 50/50). iOS adapts to its own navigation, but keep the structure + fields.

- **Workspace header bar:** "RecruitingCompass Workspace" + a **"Your profile is live & public"** status pill with a **publish toggle** (drives `is_published`).
- **Share Profile Link card:** the public URL (read-only) + **Copy Link**, then **Share via Email / Text / Twitter**. **Custom URL (optional)** editor lives *inside* this card (vanity slug: `^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$`, empty clears).
- **1. Appearance Settings** (boxed card): **Hero Background Color Theme** = 6 swatches (Navy/slate, Blue, Teal, Red/rose, Purple/violet, Indigo) → sets `header_color`; **Upload Custom Banner** button + "Recommended: 1200×400 JPG or PNG".
- **2. Profile Content** (boxed card): **Bio** (0/300 chars), **What I'm Looking For** (0/600), **Values** (tag chips, max 12, ≤60 chars each), **Awards** (title + year rows). Order exactly: Bio → Looking For → Values → Awards.
- **3. Section Configuration** (boxed card): drag-to-reorder rows with an **eye / eye-slash** visibility toggle. Six rows: Athletic Metrics, Featured Videos & Highlights, Academic Profile, Target Program & Values, Team History & Coaching References, Honors & Awards.
- **4. Recruitment Status** (boxed card): **Commitment Status** dropdown (Uncommitted / Committed) + subtext "Updating this adds a status tag to your live page"; when Committed, a committed-school picker.
- **Live Preview:** renders the **real** profile from the in-progress draft (sections/order/content/color all reflected) + a **Profile QR Code** card ("Coaches can scan directly at tournaments"). Metrics are fetched separately (they live in `performance_metrics`, not on the profile row).

---

## 5. Data model + API (what iOS consumes)

### Public profile endpoint
`GET /api/public/profile/{slug}` → `PublicProfileData`. Slug = 6-char hash or vanity slug. 404 unknown, 410 unpublished. New/notable fields:
- `headerColor: string` — one of `slate|blue|emerald|violet|rose|amber|teal|indigo`. **Maps to a dark hero background.** Web map (`utils/profile/headerColor.ts`): slate→slate-900, blue→blue-900, emerald→emerald-900, indigo→indigo-900, teal→teal-900, rose→rose-900, violet→violet-900, amber→amber-900; unknown → slate-900. iOS should theme the hero the same way.
- `academics.intended_major?: string` — new; renders as "Desired Major".
- `updatedAt: string | null` — ISO; footer "Profile last updated".
- `metrics: PublicMetric[] | null` — `{ key, label, value, unit, verified }`. **Built via the canonical metric registry** (iOS `MetricRegistry`): value formatted by the metric's `Format` (e.g. batting_avg = 3-decimal, drop-leading-zero → `.410`; velo = 1-decimal + `mph`), unit from the registry (NOT the stored `unit` column, which has stale/garbage values). **Dedupe: one entry per `metric_type`, keep the newest by `created_at`; then rank primary+verified first, cap 6.**
- `teamHistory[].contact: string | null` — reference phone; render only when present.
- Section pairing + `sections` (ordered, `{key, visible}`) same as web.

### Lead endpoints (coach → athlete inbound leads; no coach accounts)
- `POST /api/public/profile/{slug}/contact` — body `{ coachName, coachEmail?, coachTitle?, schoolName?, note, turnstileToken?, hp }`. Honeypot `hp` (must be empty), rate-limit, optional Turnstile. Writes `profile_contacts` type `contact`. Response `{ ok: true }` only (no PII).
- `POST /api/public/profile/{slug}/interest` — body `{ coachName, coachEmail?, program, note?, turnstileToken?, hp }`. **`program` is now a free-text School/Program string** (was position). Writes `profile_contacts` type `interest`. Anonymous allowed.
- `POST /api/public/profile/{slug}/view` — fire-and-forget view record (optional `?ref=`).
- **CSRF:** web exempts `/api/public/` (no session). iOS uses bearer tokens → CSRF already n/a; just POST these normally.
- **Inbox:** owner reads leads via `GET /api/player/profile/contacts` (family-scoped, excludes ip/ua) — per-type monthly counts + lead rows. iOS owner UI can surface these ("Inbox" tab on web).

### Profile write (owner)
`PUT /api/player/profile` — fields incl `bio`, `header_color` (enum above), `banner_url`, `looking_for`, `commitment_status`, `committed_school_id`, `awards[]`, `values_tags[]`, `section_config[]` (`{key ∈ metrics|film|academics|values|team_history|awards, visible}`), `show_metrics/film/academics/...`, `vanity_slug`, `is_published`. `section_config` ⇄ `show_*` are reconciled server-side; edit the section_config.

---

## 6. Behaviors / decisions to mirror

- **Metrics formatting + dedupe** — use iOS `MetricRegistry` (byte-parity with web canonical) for value/unit; ignore stored `unit`/`display_value`; dedupe newest-per-type.
- **Position shorthand** — `3B/2B` style via iOS position-abbreviation map (parity with `utils/positions/canonical.ts`).
- **Express Interest = free-text school** (privacy: never list the athlete's followed schools to a visitor).
- **Section pairing** — academics+values, team+awards side-by-side when both visible.
- **Hero color from `header_color`** (don't hardcode).
- **Publish gating** — unpublished profile = not viewable (410 on web).
- **Content order** — Bio, Looking For, Values, Awards.

---

## 7. Known follow-ups / not done on web (so iOS doesn't chase them)

- **Video thumbnails**: no thumbnail URL in the data model yet — web shows placeholder cards. Real thumbnails are a future data addition; iOS mirror the placeholder for now.
- **Banner (`banner_url`)**: stored + editable but the public hero does **not** render a banner image yet (hero uses the solid `header_color`). Parity = don't render banner yet.
- **Turnstile/Upstash launch gate**: public prod promotion is gated on anti-abuse env (web note). Doesn't affect iOS reads, but the lead endpoints' abuse protection is server-side.

---

## 8. iOS task checklist (fill in against the Figma frames Chris provides)

- [ ] Public profile: coach-bar, hero (color, circle avatar, shorthand physicals, socials, Contact/Express buttons + sent state)
- [ ] Sections with icons + correct titles; metrics cards (label-top), credentials row
- [ ] Highlights thumbnail cards; academics (Desired Major + NCAA strip); target+values; team history (level badge + reference contact); awards medal chips
- [ ] Footer socials + last-updated
- [ ] `header_color` → hero theme map (parity with §5)
- [ ] Metrics: registry formatting + newest-per-type dedupe
- [ ] Owner setup: workspace bar + publish toggle, Share + Custom URL, Appearance (6 swatches + banner), Content (Bio/Looking For/Values/Awards), Section Config (eye toggles + reorder), Commitment Status
- [ ] Live preview of the real profile + QR
- [ ] Lead submit (contact + interest with free-text school) + owner inbox
- [ ] Confirm model fields: `intended_major`, `updatedAt`, `header_color`, `program` (interest), `teamHistory.contact`

---

## 9. Where to look in the web repo (reference, do not edit)

- Public render: `components/profile/PublicProfileCard.vue` + `components/profile/public/*` (`ProfileHero`, `MetricsGrid`, `MetricsCredentials`, `HighlightsReel`, `AcademicPanel`, `TargetProgramValues`, `TeamHistoryPanel`, `AwardsHonors`, `SocialIcon`, `SectionHeader`)
- Page + layout: `pages/p/[slug].vue`, `layouts/public.vue`
- Setup: `components/profile/ProfileSetup.vue` + `components/profile/setup/*` (`ShareProfilePanel`, `ProfileAppearanceEditor`, `ProfileContentEditor`, `SectionConfigEditor`, `CommitmentStatusControl`, `ProfileMiniPreview`)
- Builders/utils: `utils/profile/publicProfileBuilders.ts` (metrics dedupe/format, team history), `utils/profile/headerColor.ts`, `utils/profile/socialLinks.ts`, `utils/profile/recruitingCredentials.ts`, `utils/positions/canonical.ts` (`formatPositionsShort`), `utils/metrics/canonical.ts` (`applyFormat`)
- Endpoints: `server/api/public/profile/[slug].get.ts`, `.../[slug]/contact.post.ts`, `.../[slug]/interest.post.ts`, `server/api/player/profile.put.ts`, `server/api/player/profile/contacts.get.ts`
