# Domain State → Visual Treatment

This file is the canonical reference for how each application domain state maps to colors, badges, and CSS classes. When building or modifying UI that displays state, check here first.

Source of truth functions: `utils/sentiment.ts`, `utils/taskHelpers.ts`, `components/FitScore/FitScoreDisplay.vue`, `components/School/SchoolCard.vue`.

---

## Fit Score — Tier

Displayed via `<Badge>` with `variant="solid"`. Source: `FitScoreDisplay.vue`.

| Tier | Label | BadgeColor | Meaning |
|------|-------|-----------|---------|
| `match` | Match | `emerald` | Profile aligns well — strong fit |
| `safety` | Safety | `emerald` | Strong chance of acceptance |
| `reach` | Reach | `orange` | Possible fit, needs development |
| `unlikely` | Unlikely | `red` | Not a strong fit currently |

---

## Fit Score — Numeric

Applied as a Tailwind text color class to the score number. Source: `FitScoreDisplay.vue`.

| Score range | Class | Color |
|------------|-------|-------|
| ≥ 70 | `text-emerald-600` | Good |
| ≥ 50 and < 70 | `text-orange-600` | Caution |
| < 50 | `text-red-600` | Poor |

**Note:** These use raw Tailwind `emerald`/`orange`/`red`, not `brand-emerald`. This is intentional — the number color is a direct semantic signal, not a labeled badge.

---

## Fit Score — Breakdown Dimensions

Progress bar fill colors. Source: `FitScoreDisplay.vue`.

| Dimension | Class | Max points |
|-----------|-------|-----------|
| Athletic Fit | `bg-blue-500` | /40 |
| Academic Fit | `bg-purple-500` | /25 |
| Opportunity Fit | `bg-emerald-500` | /20 |
| Personal Fit | `bg-orange-500` | /15 |

---

## School — Priority Tier

Applied as Tailwind bg + text classes (not via `<Badge>`). Source: `SchoolCard.vue`.

| Tier | Label | CSS classes | Meaning |
|------|-------|------------|---------|
| `A` | Top Choice | `bg-red-100 text-red-700` | Highest priority — athlete most wants this school |
| `B` | Strong Interest | `bg-amber-100 text-amber-700` | Strong candidate, actively pursuing |
| `C` | Fallback | `bg-slate-100 text-slate-700` | Lower priority, safety school |

**Note:** Tier A uses red to signal urgency/importance, not danger. The label "Top Choice" clarifies meaning.

---

## Interaction — Sentiment

Returned by `getSentimentBadgeColor()` in `utils/sentiment.ts`. Used via `<Badge>`.

| Sentiment value | BadgeColor | Meaning |
|----------------|-----------|---------|
| `very_positive` | `emerald` | Coach is very engaged / enthusiastic |
| `positive` | `blue` | Coach is interested |
| `neutral` | `slate` | No clear signal |
| `negative` | `red` | Coach is uninterested or discouraging |
| `null` / unknown | `slate` | Not assessed |

---

## Interaction — Direction

Returned by `getDirectionBadgeColor()` in `utils/sentiment.ts`. Used via `<Badge>`.

| Direction | BadgeColor | Meaning |
|-----------|-----------|---------|
| `inbound` | `emerald` | Coach initiated contact — high positive signal |
| `outbound` | `purple` | Athlete/family initiated contact |
| other | `slate` | Unknown |

---

## Interaction — Type

Returned by `getTypeBadgeColor()` in `utils/sentiment.ts`. Used via `<Badge>`.

| Type | BadgeColor |
|------|-----------|
| any | `blue` (always) |

All interaction types use blue. The type label carries the meaning; the badge color is structural only.

---

## Task Status

Returned by `getTaskStatusColor()` in `utils/taskHelpers.ts`. Applied as raw Tailwind classes (not via `<Badge>`).

| Status | CSS classes | Displayed label |
|--------|------------|----------------|
| `not_started` | `bg-slate-100 text-slate-700` | Not started |
| `in_progress` | `bg-blue-100 text-blue-700` | In progress |
| `completed` | `bg-emerald-100 text-emerald-700` | ✓ Done |
| `skipped` | `bg-slate-100 text-slate-600` | Skipped |

**Note:** These use raw Tailwind colors (`blue`, `emerald`, etc.), not `brand-*` prefixed. Do not switch to `brand-*` — `getTaskStatusColor()` returns plain Tailwind class strings.

---

## Coach Responsiveness

Rendered by `<ResponsivenessBadge :percentage="n" />`. Source: `components/ResponsivenessBadge.vue`.

| Range | Label | Classes |
|-------|-------|---------|
| ≥ 80% | Very Responsive | `bg-brand-emerald-100 text-brand-emerald-700` + `bg-brand-emerald-500` dot |
| 60–79% | Responsive | `bg-brand-blue-100 text-brand-blue-700` + `bg-brand-blue-500` dot |
| 40–59% | Moderate | `bg-brand-orange-100 text-brand-orange-700` + `bg-brand-orange-500` dot |
| 20–39% | Slow | `bg-brand-orange-100 text-brand-orange-700` + `bg-brand-orange-500` dot |
| < 20% | Unresponsive | `bg-brand-red-100 text-brand-red-700` + `bg-brand-red-500` dot |

Always use `<ResponsivenessBadge>` — never replicate this logic inline.

---

## Family Invitation States

Source: `components/Family/FamilyPendingInviteCard.vue`, `components/Family/FamilyMemberCard.vue`.

| State | Visual treatment | Component |
|-------|-----------------|-----------|
| Pending (active invite, not expired) | `bg-amber-50 border border-amber-200` card | `FamilyPendingInviteCard` |
| Expired invite | Calculated from `expires_at`; shown as text "expired" in `text-slate-500` | `FamilyPendingInviteCard` |
| Resend confirmation | Resend button flashes: `text-emerald-600 bg-emerald-50` with scale animation | `FamilyPendingInviteCard` |
| Revoke button | `text-red-600 hover:bg-red-50` | `FamilyPendingInviteCard` |
| Active member | Standard card, no color emphasis | `FamilyMemberCard` |

**Note:** Family invite pending state uses raw Tailwind `amber` (not `brand-amber`, which doesn't exist). This is the "soft informational warning" amber pattern — see `colors.md`.

---

## Missing Data Warning (Fit Score)

When fit score has missing dimensions, `FitScoreDisplay` renders:

```html
<div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
  <p class="text-amber-900">...</p>
  <p class="text-amber-700">...</p>
</div>
```

This is the same amber pattern as family invite pending. Use this exact class set for any "data incomplete, action suggested" warnings.
