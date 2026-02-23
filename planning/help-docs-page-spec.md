# Help Center — Feature Specification

**Project:** The Recruiting Compass
**Date:** 2026-02-23
**Status:** Resolved — ready for implementation
**Reference:** [remembered.cc/docs](https://remembered.cc/docs) (design inspiration)

---

## 1. Overview

A dedicated, auth-gated Help Center giving athletes and families a structured reference for every feature of The Recruiting Compass. Modeled on remembered.cc/docs: clean docs layout, fixed left sidebar, rich content components, and a consistent reading experience.

The Help Center lives at `/help` inside the authenticated app and uses its own dedicated layout — separate from the main app shell — to create a focused reading experience.

---

## 2. Goals

- Give athletes and families a single place to understand every feature of the app
- Cover the four core topic areas that map to the main user journey
- Provide a clean, navigable reading experience at both desktop and mobile
- Keep the implementation maintainable as a developer-only content system (no CMS)
- Signal content freshness concerns early so docs don't drift from product reality

## Non-Goals (MVP)

- No in-page search (add when content volume warrants it)
- No CMS or markdown-file authoring — all content is hardcoded Vue components
- No phase-aware personalization — docs are a static reference regardless of user's current phase
- No live data embedded in docs — purely explanatory text with deep-links into the app
- No public/unauthenticated access — login required

---

## 3. User Stories

| As a… | I want to… | So that… |
|---|---|---|
| New athlete | Read a getting started guide after first login | I know what to do before my first action |
| Athlete | Understand what a fit score means | I can prioritize my school list |
| Athlete | Know what "Phase 3" unlocks | I understand what actions are available to me |
| Parent | Understand how recommendation letters work | I can guide my athlete through the request process |
| Any user | Find help without leaving the app | I don't need to email support for common questions |
| Any user | Give feedback when a doc doesn't answer my question | The team can improve unclear content |

---

## 4. Architecture

### Auth

- Requires active session — middleware redirects unauthenticated users to `/login`
- No role check needed — all authenticated users (athletes and family members) can access all docs

### Routing (Nuxt file-based)

```
pages/
  help/
    index.vue              → /help (overview page)
    getting-started.vue    → /help/getting-started
    schools.vue            → /help/schools
    phases.vue             → /help/phases
    account.vue            → /help/account
```

### Layout

A dedicated `layouts/help.vue` — **does not reuse the main app layout**.

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]                              [← Back to App]     │  ← HelpHeader.vue
├────────────────┬────────────────────────────────────────┤
│                │                                         │
│  HelpSidebar   │  <slot /> (page content)                │
│  (sticky)      │                                         │
│                │  HelpFeedback.vue (bottom of each page) │
└────────────────┴────────────────────────────────────────┘
```

**Mobile:** Sidebar collapses into a sticky top drawer triggered by a "Sections" button.

### Layout File Structure

```
layouts/
  help.vue                 # Dedicated docs layout

components/help/
  HelpHeader.vue           # Logo + Back to App link
  HelpSidebar.vue          # Fixed left nav, all top-level sections, active highlight
  HelpSidebarLink.vue      # Individual nav item (icon + label, active state)
  HelpOverviewCard.vue     # Card on /help overview (icon + title + description)
  HelpStepCard.vue         # Numbered step in a workflow sequence
  HelpCallout.vue          # Tip / warning / info callout box
  HelpBadge.vue            # Feature badge (New, Required, Optional)
  HelpImageSlot.vue        # Screenshot/image container with caption
  HelpFeedback.vue         # Thumbs up/down + support link (bottom of deep-dive pages)
  HelpSectionHeader.vue    # H2 section heading with optional badge
```

---

## 5. Page Specifications

### 5.1 Overview Page — `/help`

**Purpose:** Entry point. Shows all four help sections as scannable cards.

**Layout:** Centered content, no sidebar. Grid of 4 cards.

**Card Design:** `HelpOverviewCard` — icon + title + one-line description. Clicking navigates to the deep-dive page.

```
┌─────────────────────────────────────────────────────────┐
│  Help Center                                            │
│  "Everything you need to use The Recruiting Compass."   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 🚀 Getting   │  │ 🏫 Schools & │                    │
│  │    Started   │  │    Coaches   │                    │
│  └──────────────┘  └──────────────┘                    │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 📋 Phases &  │  │ ⚙️ Account & │                    │
│  │    Letters   │  │   Settings   │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

**Sections Data Model** (hardcoded in `pages/help/index.vue`):

```typescript
const helpSections = [
  {
    slug: 'getting-started',
    icon: 'i-heroicons-rocket-launch',
    title: 'Getting Started',
    description: 'Set up your profile and learn the basics of the recruiting dashboard.',
  },
  {
    slug: 'schools',
    icon: 'i-heroicons-building-library',
    title: 'Schools & Coaches',
    description: 'Add schools, understand fit scores, and track coach interactions.',
  },
  {
    slug: 'phases',
    icon: 'i-heroicons-chart-bar',
    title: 'Phases & Letters',
    description: 'Navigate recruiting phases and manage recommendation letter requests.',
  },
  {
    slug: 'account',
    icon: 'i-heroicons-cog-6-tooth',
    title: 'Account & Settings',
    description: 'Manage your family, notifications, profile, and account preferences.',
  },
] as const
```

---

### 5.2 Sidebar Navigation — `HelpSidebar.vue`

Shows all four top-level docs sections. The current page's link is highlighted (active state).

**Sidebar nav items** (always visible on desktop, drawer on mobile):

```
Help Center          ← /help link (home)
────────────────
🚀 Getting Started   ← /help/getting-started
🏫 Schools & Coaches ← /help/schools
📋 Phases & Letters  ← /help/phases
⚙️ Account & Settings ← /help/account
```

Active state: left border accent + bold text.

**Active detection:** Use `useRoute().path` to compare against each section's slug.

---

### 5.3 Getting Started — `/help/getting-started`

| Section | Component | Notes |
|---|---|---|
| What is The Recruiting Compass? | Prose + HelpCallout (tip) | Brief product explainer |
| Creating your profile | HelpStepCard sequence (1→2→3) | Walk through profile setup steps |
| Adding family members | HelpStepCard sequence + HelpCallout (info) | How to add a parent/guardian |
| Understanding the dashboard | HelpImageSlot + prose | Screenshot of dashboard with callouts |
| Your first action | HelpStepCard + deep-link into app | CTA to add first school |

---

### 5.4 Schools & Coaches — `/help/schools`

| Section | Component | Notes |
|---|---|---|
| Adding a school to your list | HelpStepCard sequence | |
| What is a fit score? | Prose + HelpCallout (info) | Explain scoring dimensions |
| Managing your school list | Prose + HelpBadge (Required) | |
| Logging a coach interaction | HelpStepCard sequence | |
| Interaction types | Prose + status descriptions | Email, call, campus visit, etc. |
| Updating interaction status | HelpCallout (tip) | |

---

### 5.5 Phases & Letters — `/help/phases`

| Section | Component | Notes |
|---|---|---|
| Overview of recruiting phases | HelpImageSlot (phase diagram) + prose | Visual phase timeline |
| What each phase means | One sub-section per phase (Freshman / Sophomore / Junior / Senior), HelpBadge labels | |
| How to advance your phase | HelpStepCard + HelpCallout (warning: "coach must confirm") | |
| Requesting a recommendation letter | HelpStepCard sequence | |
| Tracking letter status | Prose + status descriptions | Requested → Received states |
| Tips for strong rec letter requests | HelpCallout (tip) | |

---

### 5.6 Account & Settings — `/help/account`

| Section | Component | Notes |
|---|---|---|
| Updating your athlete profile | HelpStepCard | |
| Adding and managing family members | HelpStepCard + HelpCallout (info) | |
| Notification preferences | Prose + HelpCallout (tip) | |
| Understanding notification types | Prose with notification examples | |
| Changing your password | HelpStepCard | |
| Data and privacy | Prose | What data is stored, how to delete |

---

## 6. Component Design Specs

### `HelpStepCard.vue`

Numbered sequential workflow step.

```vue
<HelpStepCard :step="1" title="Create your profile">
  Fill in your athlete details including graduation year, position, and GPA.
</HelpStepCard>
```

Props: `step: number`, `title: string`, `slot: default` (description text)

Visual: Large step number in accent color, title bold, description muted. Left border accent line connecting cards vertically.

---

### `HelpCallout.vue`

Highlighted callout box for tips, warnings, info.

```vue
<HelpCallout type="tip">
  You can add up to 50 schools to your list.
</HelpCallout>
```

Props: `type: 'tip' | 'info' | 'warning' | 'important'`

Visual:
- `tip` → green bg, lightbulb icon
- `info` → blue bg, info-circle icon
- `warning` → amber bg, exclamation icon
- `important` → red bg, flag icon

---

### `HelpBadge.vue`

Small inline chip for feature labeling.

```vue
<HelpBadge type="required" />
<HelpBadge type="new" />
<HelpBadge type="optional" />
```

Props: `type: 'new' | 'required' | 'optional'`

Visual: Small rounded pill. `new` → blue, `required` → red, `optional` → gray.

---

### `HelpImageSlot.vue`

Screenshot or diagram placeholder with caption.

```vue
<HelpImageSlot src="/help/dashboard-overview.png" caption="The main dashboard showing your school list and current phase." />
```

Props: `src: string`, `caption: string`, `alt?: string`

Visual: Rounded border, subtle shadow, caption below in muted text. Responsive width.

---

### `HelpFeedback.vue`

Bottom-of-page feedback section shown on all deep-dive pages (not the overview).

```
─────────────────────────────
Was this page helpful?
  [👍 Yes]   [👎 No]

Need more help? Contact support →
─────────────────────────────
```

**Thumbs behavior:** On click, `POST /api/help/feedback` with `{ page, helpful }`. Show a "Thanks for your feedback!" confirmation inline. No external analytics service needed — feedback is stored in Supabase (see §8.1).

**Support link:** `mailto:support@therecruitingcompass.com`

---

## 7. Routing & Middleware

```typescript
// middleware/help-auth.ts
export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if (!user.value) return navigateTo('/login')
})
```

Apply to all `/help/**` pages via `definePageMeta({ middleware: 'help-auth' })`.

---

## 8. Feedback Storage

### 8.1 Supabase Table

```sql
create table help_feedback (
  id          uuid primary key default gen_random_uuid(),
  page        text not null,       -- e.g. '/help/schools'
  helpful     boolean not null,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);
```

### 8.2 API Endpoint

`server/api/help/feedback.post.ts` — validates `{ page: string, helpful: boolean }`, inserts row with the authenticated user's ID from session. Returns `{ ok: true }`.

No external analytics service is needed for MVP. PostHog (or similar) can be layered on top later if you want funnel analysis or session recording across the full app — but Supabase is the right MVP home for this data since you already have it.

---

## 9. Addressing the Staleness Concern

The top concern raised was docs drifting from product reality. Mitigations baked into the architecture:

**1. Co-locate docs with features.**
Each help page maps 1:1 to a feature area. When you change a feature, you know which docs page to update.

**2. Docs review checklist on feature PRs.**
Add a checklist item to the PR template: `[ ] Updated /help docs if this changes user-facing behavior`.

**3. "Last reviewed" metadata per page.**
Add a `lastReviewed: string` date to each page's frontmatter or a `PAGE_META` constant. Surface it lightly in the UI (e.g., "Last reviewed: Jan 2026"). This makes staleness visible.

**4. Screenshot slots as a freshness signal.**
When the UI changes, screenshots break visually — this naturally flags which docs need updating.

---

## 10. Mobile Behavior

| Element | Desktop | Mobile |
|---|---|---|
| Sidebar | Fixed left, always visible | Collapsed, shown via "Sections ☰" sticky button at top |
| Overview cards | 2×2 grid | Single column stack |
| Step cards | Full width | Full width (no change) |
| HelpHeader | Logo left, Back link right | Logo left, Back link as icon-only |

---

## 11. Implementation Order (Suggested)

1. Supabase migration — `help_feedback` table
2. `server/api/help/feedback.post.ts` — feedback endpoint
3. `layouts/help.vue` — skeleton layout with header, sidebar slot, content slot
4. `components/help/HelpHeader.vue` + `HelpSidebar.vue` — navigation shell
5. `pages/help/index.vue` — overview page with `HelpOverviewCard` grid
6. Core components: `HelpStepCard`, `HelpCallout`, `HelpBadge`, `HelpImageSlot`
7. Content pages in order: getting-started → schools → phases → account
8. `HelpFeedback.vue` — thumbs + `mailto:support@therecruitingcompass.com`
9. Middleware auth guard
10. Mobile responsive pass
11. PR template (`.github/pull_request_template.md`) — add docs review checklist item
12. Ship with empty `HelpImageSlot` placeholders; fill screenshots post-launch

---

## 12. Resolved Decisions

| Question | Decision |
|---|---|
| Support link | `mailto:support@therecruitingcompass.com` |
| Analytics | No external service — store in Supabase `help_feedback` table via `/api/help/feedback` |
| "Back to App" | `router.back()` |
| Phase names | Freshman, Sophomore, Junior, Senior |
| Screenshots | Ship with `HelpImageSlot` placeholders; fill in post-launch |
| PR template | Create `.github/pull_request_template.md` as part of this implementation |

---

## 13. Acceptance Criteria

- [ ] `/help` renders overview cards for all 4 sections, requires auth
- [ ] Each `/help/[slug]` page renders with dedicated docs layout (no main app nav)
- [ ] Sidebar correctly highlights active section
- [ ] `HelpStepCard`, `HelpCallout`, `HelpBadge`, `HelpImageSlot` components are usable across all pages
- [ ] `HelpFeedback` POSTs to `/api/help/feedback`, stores in Supabase, shows inline confirmation
- [ ] Mobile: sidebar collapses to accessible drawer
- [ ] `npm run type-check`, `npm run test`, `npm run lint` all pass
- [ ] No auth bypass — unauthenticated access to any `/help/**` route redirects to `/login`
