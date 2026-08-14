# Coach Tile Unification — Design Spec

**Date:** 2026-08-14
**Author:** Chris Andrikanich + Claude
**Status:** Draft (awaiting review)
**Path:** web canonical → iOS handoff (web is source of truth)

## Problem

The coach tile is rendered **five different ways** across the product, with
no shared component and no shared visual language:

| # | Surface | Web/iOS | Implementation | Style |
|---|---------|---------|----------------|-------|
| 1 | School detail sidebar | Web | `components/School/SchoolSidebar.vue:64-115` (inline) | name/role + 3 solid-color icon buttons (blue/green/purple) |
| 2 | Manage Coaches (per-school) | Web | `components/CoachCard.vue` | pastel text buttons: Email/Text/Tweet/Instagram/View + red X delete |
| 3 | Global Coaches directory | Web | `components/Coach/CoachListCard.vue` | logo + role badge + contact rows + ghost icons (envelope/text/social/**trash**) + View link |
| 4 | Coaches list (iOS) | iOS | `CoachCardView` in `CoachesListView` | logo + role badge + contact rows + 5 colored glyphs (email/sms/phone/@/camera) + trash |
| 5 | School detail coaches block (iOS) | iOS | `SchoolDetailView` coaches section | name–role + 5 glyphs + "Last contact" |

**Costs:** adding one coach field means editing up to five places; each
surface drifted its own icon set, action set, delete affordance, and
contact-display style; tap-to-detail is inconsistent (some tiles navigate,
some only emit, some do nothing).

## Goals

Chris's three words: **simplicity, consistency, parity.**

1. **One canonical tile** per platform (`CoachCard.vue`, `CoachCardView`),
   prop-driven — not five bespoke renderings.
2. **Identical layout rules, icon set, icon order, tap behavior** on web and
   iOS.
3. **Every tile taps through to the same coach detail screen** (detail
   screens already exist on both platforms — no new screen).

## Non-Goals

- Coach **detail page** redesign — exists on both platforms, out of scope
  (this pass only makes tiles route to it consistently).
- Search / filter / sort / "Add Coach" page chrome — page-level, untouched.
- Delete **logic** — exists; this spec only relocates the delete affordance
  in the UI (tile → detail).
- Any data-model / migration change — `Coach` fields are sufficient as-is.

## Decisions (locked with Chris)

| Decision | Choice |
|----------|--------|
| Inline action set | **Email · Text · Call · Social** |
| Delete affordance | **Detail page only** — no destructive action on any tile |
| Detail routing | **One shared `CoachDetail` component**, both web routes kept |
| Approach | **A** — canonical spec, one component per platform, phased web→iOS |
| Last-contact line | **Yes**, on `full` variant where data exists; omitted on `compact` |
| Camera glyph (iOS) | **Dropped** — not part of the canonical action set |

## Canonical Tile Anatomy

```
┌───────────────────────────────────────────────┐
│ [logo*]  Coach Name               [Role badge] │
│          School Name*                           │
│          ✉ email@school.edu          ← contact  │
│          ☎ 419-289-5476                rows*    │
│          [✉] [💬] [☎] [X] [IG]     ← action row │
│          Last contact: Aug 3, 2026*             │
└───────────────────────────────────────────────┘
   * = full variant only; hidden in compact
```

### Variants

One component, driven by a `variant` prop plus a `showSchoolMeta` flag.

| Element | `compact` (sidebar) | `full` (directory + manage) |
|---------|:---:|:---:|
| School logo | — | on (directory) / off (manage) via `showSchoolMeta` |
| School name | — | on / off via `showSchoolMeta` |
| Contact text rows (email/phone) | — | on |
| Role badge | on | on |
| Action-icon row | **on** | on |
| Last-contact line | — | on |
| Whole-tile tap → detail | on | on |

- **directory** (global `/coaches`) = `full` + `showSchoolMeta: true`
  (cross-school view needs logo + school name).
- **manage** (`/schools/[id]/coaches`) = `full` + `showSchoolMeta: false`
  (same-school context — logo + name redundant).
- **compact** (school sidebar) = quick-glance: name, role, and the full
  action-icon row (all applicable icons, same as `full` — Chris confirmed max
  parity over density). Omits logo, school name, contact text rows, and the
  last-contact line.

This collapses today's three web renderings into **one component + two
props**.

### Action-Icon Row

Fixed order, each icon renders **only when its data field is present**:

| Order | Icon | Data field | Action (web) | Color token |
|------:|------|-----------|--------------|-------------|
| 1 | Envelope | `coach.email` | `mailto:` (or `open-communication` event where a compose modal exists) | `brand-blue-600` |
| 2 | Chat bubble | `coach.phone` | `sms:` | `brand-emerald-600` |
| 3 | Phone | `coach.phone` | `tel:` | `brand-purple-600` |
| 4 | X / Twitter | `coach.twitter_handle` | open `x.com/<handle>` new tab | `brand-slate-700` |
| 5 | Instagram | `coach.instagram_handle` | open `instagram.com/<handle>` new tab | `brand-pink-500` (new token) |

**Social = two data-driven icons (X + Instagram)** — confirmed by Chris, for
iOS parity (iOS `@` = X, `camera` = Instagram). Each renders only when its
handle is present.

**Rules:**
- Row order is fixed regardless of which icons render (no reflow surprise).
- Icons use `@click.stop` / keyboard `.stop` — they fire their action and
  **never** trigger the tile's navigate-to-detail.
- Colors via **brand design tokens only** — no raw hex / `rgba` in `<style>`
  or inline (`audit:tokens` gate). **Add a `brand-pink-*` palette** to the
  `@theme` block in `assets/css/main.css` (steps 50–900, matching the other
  brand palettes) so Instagram reads true-to-brand; document it in
  `docs/design/tokens.md`.
- Icons are `@nuxt/icon` `i-heroicons-*` (already used); the X and Instagram
  glyphs stay as the existing inline `<svg fill="currentColor">` brand marks
  (heroicons has no brand logos) — `currentColor` inherits the token color,
  so no raw hex.

### Tap Behavior

- The **tile body** is the navigation target → coach detail.
  - Web: wrap in `NuxtLink :to="/coaches/${coach.id}"` — **all variants, all
    surfaces** route to the canonical rich page (Plan 1). A `detailTo` prop
    allows an override but defaults to `/coaches/${coach.id}`.
  - Keyboard: `NuxtLink` renders an `<a>` — native `Enter` activation; no
    manual `role="button"` keyboard handling needed.
- **Action icons** and **contact-row links** stop propagation — a tap on
  `mailto:`/`tel:`/social opens that channel, not the detail page.

## Detail Routing

**Scope split (Chris):** the two web detail routes are *not* duplicated
markup — they are two different implementations (`/coaches/[id]` is
rich/component-based; `/schools/[schoolId]/coaches/[coachId]` is a bespoke,
weaker page). Reconciling them into one shared `CoachDetail` component is a
separate subsystem, deferred to **Plan 2 (follow-up)**.

**This plan (Plan 1):** every unified tile — every variant, every surface —
navigates to the canonical rich page **`/coaches/[id]`**. The school-scoped
route stays live (untouched) for now; Plan 2 will consolidate it. iOS
already has a single `CoachDetailView` — no change needed there.

## Component Contract (web)

```ts
// components/Coach/CoachCard.vue
interface Props {
  coach: Coach
  variant?: "compact" | "full"   // default "full"
  showSchoolMeta?: boolean        // default false; directory sets true
  school?: School                 // required when showSchoolMeta (logo + name)
  detailTo?: string               // explicit detail route override; else derived
}

const emit = defineEmits<{
  // fired only where a surface prefers a compose modal over mailto:
  "open-communication": [coachId: string]
}>()
```

- No `delete-coach` emit — delete leaves the tile entirely.
- `open-communication` retained for the directory/manage surfaces that open
  the in-app compose modal instead of the OS `mailto:` handler; sidebar uses
  raw `mailto:`/`sms:`/`tel:` links (no store dependency).

## Migration / Wiring

0. Add `brand-pink-*` palette (50–900) to `assets/css/main.css` `@theme`;
   document in `docs/design/tokens.md`.
1. Build `components/Coach/CoachCard.vue` (canonical). (Detail-page
   consolidation is Plan 2 — not here.)
2. Repoint the three web surfaces:
   - `pages/coaches/index.vue` → `<CoachCard variant="full" :show-school-meta="true" :school="…" />`
   - `pages/schools/[id]/coaches.vue` → `<CoachCard variant="full" />` (drop the
     delete overlay wrapper — delete now on detail)
   - `components/School/SchoolSidebar.vue` coaches block → `<CoachCard variant="compact" />`
3. Delete the superseded components: old `components/CoachCard.vue`,
   `components/Coach/CoachListCard.vue`, and the inline sidebar markup.
4. Verify no other importers of the retired components (grep before delete).

## Testing

- **Unit (Vitest):** one `CoachCard` suite covering — icon renders iff data
  field present; fixed icon order with sparse data; `variant`/`showSchoolMeta`
  visibility matrix; icon click `.stop` does not navigate; tile body navigates
  to derived route; no delete affordance rendered in any variant.
- **Regression:** convert any existing `CoachListCard` / `CoachCard` tests to
  the unified component; keep coverage ≥ current.
- **E2E (Playwright):** from `/coaches`, `/schools/[id]`, and
  `/schools/[id]/coaches`, tapping a tile lands on the coach detail screen;
  tapping an action icon opens the channel without navigating.
- **Manual:** `npm run dev` → all three surfaces render identically-styled
  tiles; `npm run audit:tokens` clean (no raw hex introduced).

## iOS Handoff (phase 2, after web lands)

Separate handoff spec via `web-to-ios-handoff` skill. Target: one
`CoachCardView` + `variant` enum (`compact` / `full`) matching this contract —
same icon set, order, colors, tap-to-`CoachDetailView`, no inline delete.
Removes the current two-way iOS drift (list card vs school-detail block) and
the camera glyph.

## Resolved Questions

1. **Social icons** — two data-driven icons (X + Instagram), iOS parity. ✓
2. **Instagram color** — add a `brand-pink-*` brand token. ✓
3. **Compact action set** — sidebar shows all applicable icons (max parity). ✓
