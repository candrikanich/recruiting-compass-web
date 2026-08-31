# User Onboarding Redesign — Design Spec

**Date:** 2026-08-31
**Status:** Draft
**Approach:** A — Quick Wins First (aggressive value-first, progressive disclosure)
**Platforms:** Web (Nuxt 3) + iOS (SwiftUI) — same logic, platform-native UI
**Appetite:** Big bet, multi-sprint (~5 weeks across 5 phases)

## Problem Statement

Users sign up, complete a 5-step onboarding wizard, then land on a cold dashboard full of empty widgets with no guidance. There is no post-signup checklist, no feature tour, no progressive disclosure, and no visible path to value. Research shows 77% of users who don't engage meaningfully within 3 days churn permanently.

The school recommendation engine (PR #549) already exists and works, but only surfaces in the empty state of `/schools` — the single highest-value feature is invisible to most users.

## Success Metrics

| Metric | Current (estimated) | Target |
|---|---|---|
| Time to first school add | Unknown (no tracking) | < 3 minutes from signup |
| Profile completion at Day 7 | Unknown | > 60% |
| Onboarding wizard completion rate | Unknown | > 85% (down from 5 steps to 2) |
| Users who add ≥1 school in first session | Unknown | > 50% |
| Day-7 retention | Unknown | Establish baseline, improve 20%+ |

**Aha moment target:** User sees personalized school recommendations matched to their sport, location, and academics — the app transforms from "forms to fill" to "a tool that knows my recruiting situation."

## Architecture Overview

```
Signup → 2-Step Wizard (sport + grad year + optional location)
  → Step 2: Inline school recommendations (immediate value)
  → Dashboard with:
      - Getting Started Checklist (role-aware, persistent)
      - School Recommendations widget
      - ProfileCompleteness ring
      - Existing widgets (suggestions, tasks, etc.)
  → Progressive profile prompts (contextual, non-intrusive)
  → NUX tracking via users.nux_progress JSONB
```

All NUX state lives on `users.nux_progress` — no new tables for tracking (one new table for recommendation dismissals already exists). Web and iOS read/write the same column.

---

## Phase 1: Onboarding Funnel Reshape

### 1.1 Wizard Reduction

**Current:** 5 steps — Welcome → Basic Info (grad year, sport, gender, position) → Location (zip) → Academics (GPA, SAT, ACT) → Invite Parent

**New:** 2 steps

#### Step 1: "Tell us about you" (~30 seconds)

Fields:
- **Sport** (required) — existing sport selector, drives everything downstream
- **Graduation year** (required) — existing selector, drives phase/timeline/calendar
- **Zip code** (optional, prompted) — drives location-based recommendations
- **Gender** — auto-derived from sport where unambiguous (e.g., softball → female), asked otherwise

Parent variant: same fields, framed as "Tell us about your athlete" with athlete's first name from signup.

#### Step 2: "Here are schools to explore"

Instead of more form fields, immediately display 4-6 school recommendations:
- Rendered using existing `utils/schoolRecommendations.ts` scoring (home state + GPA bucket + diversity caps)
- Each card shows: school name, conference, state, location badge ("In-state" / "Nearby" / "Out of state")
- Actions per card: "Add to my list" (calls existing add-school flow) and "Not a fit" (calls existing dismiss endpoint)
- Below recs: copy — "Want better matches? We'll ask a few more questions as you explore."
- CTA button: "Go to your dashboard →"

Parent variant: "Schools [athlete name] might explore"

#### Middleware change

`middleware/onboarding.global.ts` — `onboarding_complete` set after Step 2 completion (user either added a school, dismissed one, or clicked through). The 5-step completion flag becomes legacy; new users use the 2-step flag.

Fields removed from wizard:
- GPA, SAT, ACT → checklist item "Complete your academics"
- Position → checklist item "Add your position"
- Parent/player invite → checklist item "Invite your family"

### 1.2 NUX Progress Column

Add `nux_progress` JSONB column to `users` table.

```typescript
interface NuxProgress {
  checklist: {
    items: Record<string, {
      completed: boolean;
      completedAt: string; // ISO timestamp
    }>;
    dismissedAt?: string; // user dismissed entire checklist
  };
  firstVisits: Record<string, string>; // pageKey → ISO timestamp
  dismissals: Record<string, string>; // promptKey → dismissedAt ISO
  version: number; // schema version for forward compat
}
```

Migration: `ALTER TABLE users ADD COLUMN nux_progress JSONB DEFAULT '{}'::jsonb;`

No new RLS policies needed — `users` table already has row-level access via existing family-scoped policies.

### 1.3 Recommendation Dashboard Widget

New component: `components/Dashboard/SchoolRecommendationsWidget.vue`
- Shows 3-4 recommended schools in a compact card grid
- Reuses `useSchoolRecommendations` composable (already exists)
- "Add to my list" and "Not a fit" actions inline
- "See all recommendations →" link to `/schools`
- Visible until user has ≥5 tracked schools OR dismisses widget
- Refreshes when profile data changes (GPA added → better recs → show updated)

---

## Phase 2: Dashboard Checklist + Empty State Overhaul

### 2.1 Getting Started Checklist

New component: `components/Dashboard/GettingStartedChecklist.vue`

#### Checklist items (ordered by value unlock):

| # | Key | Player label | Parent label | Auto-complete trigger | Unlocks |
|---|---|---|---|---|---|
| 1 | `sport` | ✅ Choose your sport | ✅ Set [name]'s sport | Onboarding Step 1 | Recs, phase, timeline |
| 2 | `first_school` | Explore recommended schools | Explore schools for [name] | First school added | Fit scores |
| 3 | `academics` | Complete your academics | Add [name]'s academics | GPA field saved | Fit score accuracy |
| 4 | `first_coach` | Add your first coach | Help [name] track a coach | First coach added | Interactions, outreach |
| 5 | `invite_family` | Invite your family | Invite [name] to take over | Family invite sent or code shared | Collaboration |
| 6 | `profile_80` | Complete your profile (80%+) | Complete [name]'s profile (80%+) | ProfileCompleteness ≥ 80% | Full fit scores, templates |
| 7 | `preview_template` | Preview a coach outreach email | Preview a coach email | Template detail page visited | Template discovery |
| 8 | `check_timeline` | Check your recruiting timeline | Review recruiting timeline | Timeline page visited | Phase awareness |

#### Mechanics:
- Progress bar at top: "3 of 8 complete — 37%"
- Items 1-2 auto-complete from onboarding wizard (user starts at ≥25%)
- Each item has one-line "why" copy explaining the value unlock
- Each item deep-links to the relevant page/action
- Completed items show ✅, collapsible
- Visible until all items complete OR user dismisses
- After dismissal: subtle "Resume getting started" link remains on dashboard
- State stored in `users.nux_progress.checklist`

#### Auto-completion detection:

Checklist items complete via two mechanisms:
1. **Page visit tracking** (items 7, 8): `nux_progress.firstVisits[pageKey]` set on first visit via a lightweight composable
2. **Data existence checks** (items 1-6): evaluated client-side on dashboard load — e.g., `schools.length > 0` for `first_school`, `profileCompleteness >= 80` for `profile_80`. When newly true, PATCH `nux_progress.checklist.items[key]`.

No server-side event bus needed. Dashboard evaluates on mount + when returning from other pages.

### 2.2 ProfileCompleteness on Dashboard

Move `ProfileCompleteness` from settings-only → dashboard card:
- Circular progress ring with percentage
- Lists top 3 missing fields ranked by impact on fit scores
- Each field links directly to the correct settings tab
- Collapses to single line after 80%+ complete
- Positioned below checklist, above existing dashboard widgets

### 2.3 Empty State Overhaul

Upgrade 10 pages from hand-rolled HTML to `DesignSystemPageState` / `DesignSystemEmptyState`:

| Page | Component | CTA | Value copy |
|---|---|---|---|
| Events | `DesignSystemEmptyState` | "Schedule Your First Event" | Coaches want to see you compete — track camps, showcases, and visits |
| Offers | `DesignSystemEmptyState` | "Track Your First Offer" | Record offers, preferred walk-ons, and recruiting interest levels |
| Documents | `DesignSystemEmptyState` | "Upload Your First Document" | Coaches expect transcripts, test scores, and highlight reels |
| Performance | `DesignSystemEmptyState` | "Log Your First Stats" | Stats auto-fill your coach outreach templates |
| Deadlines | `DesignSystemEmptyState` | "View Recruiting Deadlines" | Key dates for your sport, division, and graduation year |
| Recommendations | `DesignSystemEmptyState` | "Request a Recommendation" | Letters from coaches and teachers strengthen your recruiting profile |
| Tasks | `DesignSystemEmptyState` | "Your tasks appear as you progress" | Phase-based recruiting tasks guide your next steps |
| Templates | `DesignSystemEmptyState` | "Browse Coach Outreach Templates" + sample preview | Ready-to-send emails personalized with your recruiting data |
| Activity | `DesignSystemEmptyState` | "Your activity feed starts when you begin tracking" | See all your recruiting activity in one timeline |
| Analytics | `DesignSystemEmptyState` | "Add a school to see recruiting analytics" | Track engagement, fit trends, and recruiting momentum |

Each empty state: icon + heading + description copy + primary CTA button + optional secondary link to help content.

---

## Phase 3: Progressive Value Reveals

### 3.1 Recommendation Surfacing Beyond Empty State

Three new surfaces for school recommendations:

**A. Dashboard widget** (Phase 1, item 1.3 above)

**B. Schools page "Discover More" section:**
- Below tracked schools list on `/schools`
- Shows 4-6 recommendations even when user has schools
- Replaces current empty-state-only pattern
- "Recommendations update as your profile grows" subtitle
- Existing dismiss/add infrastructure reused

**C. Contextual recommendation refresh prompts:**
- When user completes a profile field that impacts rec quality (GPA, test scores, location, preferred division), show a toast: "Your school recommendations just improved — [view updated matches →]"
- Max 1 toast per profile-update session
- Links to `/schools` recommendations section

### 3.2 Fit Score Previews on Recommendation Cards

Add lightweight fit signals to `School/RecommendedSchools.vue` cards:

| Signal | Data needed | Display |
|---|---|---|
| Location | Zip code | "In-state" / "2 hours away" / "Out of state" badge |
| Academic match | GPA | "Academic match" / "Academic reach" / "Academic safety" badge |
| Test score range | SAT or ACT | "Your SAT: 1250 — School range: 1100-1300 ✓" |
| Missing data prompt | Any missing | "Add your GPA to see academic fit →" link |

Badges use existing fit score utils (`utils/fitScoreCalculation.ts`) adapted for recommendation context (school may not be enriched with Scorecard data yet — degrade gracefully).

### 3.3 Contextual Profile Prompts

Nudges that appear when a user encounters a feature that would improve with more data:

| Trigger | Prompt | Location |
|---|---|---|
| View fit score with missing dimension | "Add your GPA to see academic fit at [school]" | Inline on fit score card |
| Open template with unfilled variables | "Complete your position to personalize this email" | Banner above template preview |
| Add 3rd school | "Add your test scores — we'll show how you compare at all your schools" | Toast |
| Visit `/schools` with no GPA | "Academic fit needs your GPA" | Subtle banner on recs section |
| ProfileCompleteness < 60% after 3 days | "Your profile is 45% complete — coaches see this too" | Dashboard checklist emphasis |
| View own public profile | "Coaches will see [X empty sections]. Fill them in?" | Inline on public profile |

#### Anti-annoyance rules:
- Each prompt appears max **1× per session** per field
- "Not now" dismissal → 7-day cooldown for that prompt
- Max **1 prompt visible at a time** (queue, don't stack)
- Dismissal state: `nux_progress.dismissals[promptKey] = ISO timestamp`
- No prompts while user is mid-task (composing email, filling a form)
- Prompts composable: `useNuxPrompts()` — manages queue, dismissals, cooldowns

---

## Phase 4: iOS Parity

### Platform mapping:

| Web | iOS |
|---|---|
| 2-step wizard in `pages/onboarding/` | 2-step SwiftUI `NavigationStack` flow |
| Recommendation cards in wizard Step 2 | Horizontally scrollable cards (carousel) |
| Dashboard checklist widget | Native `List` with `Section` header + `ProgressView` |
| `DesignSystemEmptyState` components | `ContentUnavailableView` (iOS 17+) with actions |
| Contextual prompt banners/toasts | SwiftUI `Alert` or inline `HStack` prompts |
| ProfileCompleteness ring | `Gauge` or custom circular progress view |
| `nux_progress` JSONB reads/writes | Same column, same API, native rendering |

### iOS-specific:
- School recommendations implementation (spec exists: `planning/iOS_SPEC_school-recommendations-2026-08-28.md`)
- Push notification permission priming: ask AFTER user adds first school ("Want to know when coaches view your profile?"), never on first launch
- Haptic feedback on checklist item completion
- iOS onboarding currently a separate flow — align with web's 2-step pattern

### Shared infrastructure (ships once, both platforms consume):
- `users.nux_progress` column + migration
- Checklist completion evaluation logic (server-side for iOS, client-side for web)
- Recommendation API already exists and is family-aware

---

## Phase 5: Sport-Filtered Recommendations (Follow-up)

### Problem:
Current NCAA catalog (`data/ncaaSchools.json`, 1,093 schools) has no sport sponsorship data. Recommendations may suggest schools that don't offer the athlete's sport.

### Solution:
1. **Programs table:** `college_programs(id, school_catalog_key, sport, division, conference, gender, scorecard_id)` — architecture doc already specifies this as the scale-out path
2. **Data source:** NCAA sport sponsorship data (available via EADA/Equity in Athletics reports or NCAA directory scraping)
3. **Ranker update:** `utils/schoolRecommendations.ts` filters by sport before scoring
4. **NAIA/JUCO expansion:** Add non-NCAA programs to catalog (separate data source TBD)
5. **College Scorecard integration in ranking:** Batch-enrich programs table with admission rates, test score ranges, tuition for smarter academic-fit ranking

### Scope note:
This phase is a meaningful effort (data sourcing + new table + ranker rewrite). Deferred intentionally — Phases 1-4 deliver the flow improvements that make recommendations discoverable and valuable. Sport filtering makes them more accurate, but location + division + GPA matching already produces useful results for most athletes.

---

## Migration Plan

### Database:
1. `ALTER TABLE users ADD COLUMN nux_progress JSONB DEFAULT '{}'::jsonb;` — Phase 1
2. No other schema changes for Phases 1-4 (recommendation dismissals table already exists)
3. `college_programs` table — Phase 5 only

### Backward compatibility:
- Existing users with `onboarding_complete = true` skip the new wizard entirely
- Existing users get the checklist on next dashboard visit (items auto-evaluated from existing data)
- `nux_progress` defaults to `{}` — all code handles empty/missing gracefully
- Old 5-step wizard code remains but is dead-path for new signups; remove after 30 days

### Feature flags:
- No A/B testing — not live yet, ship to all new users
- No `ONBOARDING_V2` flag needed; old wizard code stays as dead path for 30 days then remove

---

## Out of Scope

- ML/collaborative filtering for recommendations ("athletes like you also added...")
- In-app video tutorials or animated walkthroughs
- Demo mode / pre-signup exploration (Approach C — revisit at scale)
- Gamification beyond checklist progress (badges, streaks, etc.)
- Coach-side onboarding (no coach accounts in current system)

---

## Resolved Decisions

1. **Analytics:** PostHog (already integrated) + Sentry for error tracking. Add PostHog events for onboarding funnel steps, checklist completions, and activation metrics.
2. **A/B testing:** No — not live yet, ship new flow to all new users. No feature flag needed.
3. **Existing user backfill:** Yes — existing users get the checklist on next dashboard visit, items auto-evaluated from existing data. Few users, low risk.
4. **Email nudges:** Yes — re-engagement email at Day 3 if checklist < 50% complete. Part of Phase 3 (progressive value reveals). Uses existing Resend email infrastructure (`server/utils/emailService.ts`). Triggered by a cron job checking `nux_progress` + `created_at`.

## Open Questions

1. **Email content:** What tone/brand voice for re-engagement emails? Need copy direction before Phase 3.
2. **Push notifications (iOS):** Beyond the post-first-school permission priming, should we send push nudges for stalled checklists? Or email only?
