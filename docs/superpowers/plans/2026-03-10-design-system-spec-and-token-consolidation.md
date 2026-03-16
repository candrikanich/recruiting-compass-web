# Design System Spec Files + Token Consolidation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write four `docs/design/` spec files that document the design system for AI sessions, and consolidate the two overlapping token systems so `main.css @theme` is the single source of hex values.

**Architecture:** `main.css @theme` owns all raw hex values as `--color-brand-*`. `theme.css` aliases the subset it needs as `--brand-*: var(--color-brand-*)`. Vue components and `theme.utilities.css` are unchanged. Four markdown spec files give AI sessions a machine-readable reference for colors, tokens, components, and domain states.

**Tech Stack:** TailwindCSS v4 (`@theme`), CSS custom properties, Markdown

---

## Chunk 1: Token Consolidation

### Task 1: Add indigo to `@theme` and alias all `--brand-*` in `theme.css`

**Files:**
- Modify: `assets/css/main.css` (add indigo palette to `@theme`)
- Modify: `assets/styles/theme.css` (replace hex values with `var(--color-brand-*)`)

**Context:** `Button.vue` uses Tailwind utilities `bg-brand-indigo-600`, `bg-brand-indigo-100`, `focus:ring-brand-indigo-500`, `hover:bg-brand-indigo-700` — but `--color-brand-indigo-*` is missing from `@theme`, making these utilities silently undefined. Fix this as part of consolidation.

- [ ] **Step 1: Add indigo palette to `@theme` in `assets/css/main.css`**

  Add after the `--color-brand-red-*` block (before the closing `}`):

  ```css
  --color-brand-indigo-50: #eef2ff;
  --color-brand-indigo-100: #e0e7ff;
  --color-brand-indigo-200: #c7d2fe;
  --color-brand-indigo-300: #a5b4fc;
  --color-brand-indigo-400: #818cf8;
  --color-brand-indigo-500: #6366f1;
  --color-brand-indigo-600: #4f46e5;
  --color-brand-indigo-700: #4338ca;
  --color-brand-indigo-800: #3730a3;
  --color-brand-indigo-900: #312e81;
  ```

- [ ] **Step 2: Replace `--brand-*` hex values in `assets/styles/theme.css`**

  Find the `/* Brand Colors */` block (lines ~42–63) and replace it entirely with:

  ```css
  /* Brand Colors — aliases to @theme tokens in assets/css/main.css */
  --brand-blue-100: var(--color-brand-blue-100);
  --brand-blue-500: var(--color-brand-blue-500);
  --brand-blue-600: var(--color-brand-blue-600);
  --brand-blue-700: var(--color-brand-blue-700);

  --brand-purple-100: var(--color-brand-purple-100);
  --brand-purple-500: var(--color-brand-purple-500);
  --brand-purple-600: var(--color-brand-purple-600);
  --brand-purple-700: var(--color-brand-purple-700);

  --brand-emerald-100: var(--color-brand-emerald-100);
  --brand-emerald-500: var(--color-brand-emerald-500);
  --brand-emerald-600: var(--color-brand-emerald-600);
  --brand-emerald-700: var(--color-brand-emerald-700);

  --brand-orange-100: var(--color-brand-orange-100);
  --brand-orange-500: var(--color-brand-orange-500);
  --brand-orange-600: var(--color-brand-orange-600);
  --brand-orange-700: var(--color-brand-orange-700);

  --brand-indigo-100: var(--color-brand-indigo-100);
  --brand-indigo-500: var(--color-brand-indigo-500);
  --brand-indigo-600: var(--color-brand-indigo-600);
  --brand-indigo-700: var(--color-brand-indigo-700);
  ```

  > **Note:** Remove the old `--brand-indigo-*` hex lines entirely. The gradients (`--gradient-page` etc.) use hardcoded hex inside `linear-gradient()` — leave those as-is, they are out of scope.

- [ ] **Step 3: Verify build passes**

  ```bash
  npm run build
  ```

  Expected: no CSS errors, build exits 0.

- [ ] **Step 4: Run type-check and lint**

  ```bash
  npm run type-check && npm run lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

  ```bash
  git add assets/css/main.css assets/styles/theme.css
  git commit -m "refactor: consolidate brand tokens — alias theme.css to @theme, add missing indigo palette"
  ```

---

## Chunk 2: Spec Files

### Task 2: `docs/design/tokens.md`

**Files:**
- Create: `docs/design/tokens.md`

- [ ] **Step 1: Create `docs/design/tokens.md`** with the following content:

  ```markdown
  # Design Tokens

  Source files: `assets/styles/theme.css` (semantic tokens), `assets/css/main.css` (brand palette via `@theme`).

  ## Semantic Tokens

  These are CSS custom properties defined in `assets/styles/theme.css`. Use them for structural/layout concerns. Do not use raw brand colors for semantic roles.

  | Token | Value | Use for | Avoid |
  |-------|-------|---------|-------|
  | `--background` | `#ffffff` | Page/app background | Card surfaces |
  | `--foreground` | `oklch(0.145 0 0)` | Primary body text | Secondary text |
  | `--card` | `#ffffff` | Card surface background | Page background |
  | `--card-foreground` | `oklch(0.145 0 0)` | Text inside cards | — |
  | `--popover` | `oklch(1 0 0)` | Dropdown/popover bg | — |
  | `--popover-foreground` | `oklch(0.145 0 0)` | Dropdown/popover text | — |
  | `--primary` | `#030213` | Rarely used directly; prefer brand-blue for interactive elements | — |
  | `--primary-foreground` | `oklch(1 0 0)` | Text on `--primary` bg | — |
  | `--secondary` | `oklch(0.95 0.0058 264.53)` | Secondary surfaces | — |
  | `--secondary-foreground` | `#030213` | Text on secondary surfaces | — |
  | `--muted` | `#ececf0` | Muted backgrounds, disabled state bg, inactive filter pills | Active/emphasis elements |
  | `--muted-foreground` | `#717182` | Secondary/helper text, captions, metadata | Primary content |
  | `--accent` | `#e9ebef` | Hover bg for secondary buttons | — |
  | `--accent-foreground` | `#030213` | Text on accent bg | — |
  | `--destructive` | `#d4183d` | Destructive action text/border (when not using brand-red) | Non-destructive contexts |
  | `--destructive-foreground` | `#ffffff` | Text on destructive bg | — |
  | `--border` | `rgba(0,0,0,0.1)` | Default borders on inputs, cards, dividers | Colored/semantic borders |
  | `--input` | `transparent` | Input element border | — |
  | `--input-background` | `#f3f3f5` | Input field background | Card backgrounds |
  | `--switch-background` | `#cbced4` | Toggle/switch off-state bg | — |
  | `--ring` | `oklch(0.708 0 0)` | Focus outline (auto-applied via `@layer base`) | Manual focus styles |

  ## Shadow Tokens

  | Token | Use for |
  |-------|---------|
  | `--shadow-card` | Default card resting state |
  | `--shadow-card-hover` | Card hover/elevated state |
  | `--shadow-lg` | Large overlays, modals |

  ## Gradient Tokens

  | Token | Use for |
  |-------|---------|
  | `--gradient-page` | Page/section background gradient (slate → blue → slate) |
  | `--gradient-blue` | Blue accent gradient (135deg, blue-500 → blue-600) |
  | `--gradient-purple` | Purple accent gradient |
  | `--gradient-emerald` | Emerald accent gradient |
  | `--gradient-orange` | Orange accent gradient |

  Use gradients in `GradientCard` components and hero sections. Avoid in inline text or small elements.

  ## Brand Palette

  Raw brand colors live in the `@theme` block in `assets/css/main.css`. They are available as both:
  - **Tailwind utilities:** `bg-brand-blue-500`, `text-brand-emerald-700`, `border-brand-orange-200`, etc.
  - **CSS custom properties:** `var(--color-brand-blue-500)` (via Tailwind v4's `:root` exposure)

  Available palettes (each has steps 50–900):

  | Palette | Tailwind prefix | Semantic role |
  |---------|----------------|---------------|
  | Blue | `brand-blue-*` | Primary actions, links, info |
  | Emerald | `brand-emerald-*` | Success, positive, inbound |
  | Purple | `brand-purple-*` | Secondary, outbound, premium |
  | Orange | `brand-orange-*` | Warning, pending, reach |
  | Slate | `brand-slate-*` | Neutral, disabled, default |
  | Red | `brand-red-*` | Error, danger, destructive |
  | Indigo | `brand-indigo-*` | Accent (Button component only) |

  **Rule:** Always use the palette via Tailwind utilities (`bg-brand-blue-600`) or via the `BadgeColor`/`ButtonColor` type — never write `color: #3b82f6` directly in a Vue template.
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/design/tokens.md
  git commit -m "docs: add design system tokens reference"
  ```

---

### Task 3: `docs/design/colors.md`

**Files:**
- Create: `docs/design/colors.md`

- [ ] **Step 1: Create `docs/design/colors.md`** with the following content:

  ```markdown
  # Color Roles

  The app uses a fixed color vocabulary via two types: `BadgeColor` (Badge component) and `ButtonColor` (Button component). Always pick from this vocabulary — do not introduce new brand colors or raw hex values in components.

  ```typescript
  type BadgeColor = "blue" | "purple" | "emerald" | "orange" | "slate" | "red"
  type ButtonColor = "blue" | "purple" | "emerald" | "orange" | "indigo" | "slate" | "red"
  ```

  ## Blue — Primary / Action / Info

  **Signal:** Active, interactive, primary call to action, in-progress.

  **Use for:**
  - Primary buttons, CTA links
  - "Resend invite" and other soft-action buttons
  - Interaction type badges (always blue, regardless of type)
  - In-progress task status
  - Active/selected filter states

  **Don't use for:** Success outcomes, warnings, destructive actions.

  **Tailwind:** `bg-brand-blue-{100..700}`, `text-brand-blue-{600,700,900}`

  ---

  ## Emerald — Success / Positive / Inbound / Complete

  **Signal:** Done, good outcome, received communication, strong fit.

  **Use for:**
  - Completed task status
  - Very positive interaction sentiment
  - Inbound interaction direction
  - Fit score tiers: match and safety
  - Fit score numeric: ≥ 70
  - Coach responsiveness: ≥ 80% (Very Responsive)
  - "Sent ✓" confirmation flash
  - Fit breakdown: Opportunity dimension

  **Don't use for:** In-progress states, neutral defaults, warning states.

  **Tailwind:** `bg-brand-emerald-{100..700}`, `text-brand-emerald-{600,700,900}`

  ---

  ## Orange — Warning / Pending / Reach / Effort Required

  **Signal:** Needs attention, not yet resolved, below target but achievable.

  **Use for:**
  - Reach fit tier
  - Fit score numeric: ≥ 50 and < 70
  - Fit breakdown: Personal dimension
  - Coach responsiveness: 40–79% (Moderate / Slow)
  - Positive (non-very_positive) sentiment: **Note — positive sentiment uses blue, NOT orange.** Orange is NOT used for positive sentiment.

  **Don't use for:** Errors, completed states, primary actions.

  **Tailwind:** `bg-brand-orange-{100..700}`, `text-brand-orange-{600,700,900}`

  ---

  ## Purple — Secondary / Outbound / Academic

  **Signal:** Athlete-initiated communication, secondary emphasis, academic dimension.

  **Use for:**
  - Outbound interaction direction (athlete reached out to coach)
  - Fit breakdown: Academic dimension
  - Secondary/accent buttons where blue is already dominant

  **Don't use for:** Primary actions, errors, success states.

  **Tailwind:** `bg-brand-purple-{100..700}`, `text-brand-purple-{600,700,900}`

  ---

  ## Red — Error / Danger / Destructive / Negative / Unlikely

  **Signal:** Bad outcome, delete/remove action, negative sentiment, cannot achieve.

  **Use for:**
  - Destructive action buttons ("Delete", "Revoke")
  - Negative interaction sentiment
  - Unlikely fit tier
  - Fit score numeric: < 50
  - Coach responsiveness: < 20% (Unresponsive)
  - "Revoke invite" button

  **Don't use for:** Warnings (use orange), in-progress, neutral defaults.

  **Note:** School priority tier A ("Top Choice") also uses red — this is intentional. Red = high urgency, high stakes, not bad. The label clarifies meaning. Do not change priority A to another color.

  **Tailwind:** `bg-brand-red-{100..700}`, `text-brand-red-{600,700,900}`

  ---

  ## Slate — Neutral / Unknown / Disabled / Default

  **Signal:** No state, not started, unknown, fallback.

  **Use for:**
  - Not-started task status
  - Skipped task status
  - Neutral / unknown interaction sentiment
  - School priority tier C ("Fallback")
  - Default badge color when no semantic color applies
  - Disabled / inactive UI elements

  **Don't use for:** Any state that has a semantic meaning. If in doubt, slate is the fallback.

  **Tailwind:** `bg-brand-slate-{100..700}`, `text-brand-slate-{600,700,900}`

  ---

  ## Indigo — Button Accent Only

  **Signal:** Alternative CTA, accent action (not semantic state).

  **Use for:** `<Button color="indigo">` only. Not available in `BadgeColor`.

  **Don't use for:** Badge status, domain states, semantic indicators.

  **Tailwind:** `bg-brand-indigo-{100..700}` (Button component only)

  ---

  ## Amber — Special Case (Raw Tailwind, Not BadgeColor)

  Amber is NOT in `BadgeColor` or `ButtonColor`. It appears in two specific places only:

  1. **FitScoreDisplay missing-data warning:** `bg-amber-50 border-amber-200` — informational warning, not an error.
  2. **FamilyPendingInviteCard:** `bg-amber-50 border-amber-200` — pending/awaiting action state.

  **Rule:** Use raw Tailwind `amber-*` only for these "soft informational warning" containers. Never add amber to `BadgeColor` — it would fragment the vocabulary.

  ---

  ## Color Quick Reference

  | Color | Tailwind prefix | Badge? | Button? | Primary domain use |
  |-------|----------------|--------|---------|-------------------|
  | Blue | `brand-blue-*` | ✓ | ✓ | Actions, in-progress |
  | Emerald | `brand-emerald-*` | ✓ | ✓ | Success, completed, inbound |
  | Orange | `brand-orange-*` | ✓ | ✓ | Warning, pending, reach |
  | Purple | `brand-purple-*` | ✓ | ✓ | Outbound, academic |
  | Red | `brand-red-*` | ✓ | ✓ | Error, danger, negative, unlikely |
  | Slate | `brand-slate-*` | ✓ | ✓ | Neutral, disabled, default |
  | Indigo | `brand-indigo-*` | ✗ | ✓ | Button accent only |
  | Amber | `amber-*` (raw) | ✗ | ✗ | Soft info warnings only |
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/design/colors.md
  git commit -m "docs: add color roles reference"
  ```

---

### Task 4: `docs/design/components.md`

**Files:**
- Create: `docs/design/components.md`

- [ ] **Step 1: Create `docs/design/components.md`** with the following content:

  ```markdown
  # Components Guide

  Component source files live in `components/DesignSystem/`. All are auto-imported by Nuxt — no import needed.

  ## Badge

  **File:** `components/DesignSystem/Badge.vue`

  ```vue
  <Badge color="emerald" variant="light" size="md">Completed</Badge>
  ```

  **Props:**

  | Prop | Type | Default | Options |
  |------|------|---------|---------|
  | `color` | `BadgeColor` | `"blue"` | `"blue" \| "purple" \| "emerald" \| "orange" \| "slate" \| "red"` |
  | `variant` | `"solid" \| "light"` | `"light"` | — |
  | `size` | `"sm" \| "md"` | `"md"` | — |

  **Variant rules:**
  - `light`: most status badges — muted background, dark text. Use for inline labels, metadata.
  - `solid`: high-emphasis labels — white text on color bg. Use for tier labels (fit tier), prominent status.

  **Color × variant quick reference:**

  | Color | Light | Solid |
  |-------|-------|-------|
  | blue | `bg-brand-blue-200 text-brand-blue-900` | `bg-brand-blue-600 text-white` |
  | purple | `bg-brand-purple-200 text-brand-purple-900` | `bg-brand-purple-600 text-white` |
  | emerald | `bg-brand-emerald-200 text-brand-emerald-900` | `bg-brand-emerald-600 text-white` |
  | orange | `bg-brand-orange-100 text-brand-orange-700` | `bg-brand-orange-600 text-white` |
  | slate | `bg-brand-slate-200 text-brand-slate-900` | `bg-brand-slate-700 text-white` |
  | red | `bg-brand-red-200 text-brand-red-900` | `bg-brand-red-600 text-white` |

  ---

  ## Button

  **File:** `components/DesignSystem/Button.vue`

  ```vue
  <Button color="blue" variant="solid" size="md" @click="save">Save</Button>
  <Button color="red" variant="outline" @click="handleDelete">Delete</Button>
  <Button :to="/schools" variant="gradient" color="indigo">Browse Schools</Button>
  ```

  **Props:**

  | Prop | Type | Default | Options |
  |------|------|---------|---------|
  | `color` | `ButtonColor` | `"blue"` | `"blue" \| "purple" \| "emerald" \| "orange" \| "indigo" \| "slate" \| "red"` |
  | `variant` | `ButtonVariant` | `"solid"` | `"solid" \| "gradient" \| "outline" \| "ghost"` |
  | `size` | `ButtonSize` | `"md"` | `"sm" \| "md" \| "lg"` |
  | `to` | `string` | — | NuxtLink href — renders as `<NuxtLink>` |
  | `loading` | `boolean` | `false` | Shows spinner, disables click |
  | `fullWidth` | `boolean` | `false` | `w-full` |

  **Variant rules:**
  - `solid`: default — filled bg. Use for primary actions.
  - `gradient`: attention-grabbing. Use for hero CTAs, onboarding actions.
  - `outline`: bordered, transparent bg. Use for secondary actions alongside a solid primary.
  - `ghost`: text-only with hover bg. Use for inline actions, table row actions.

  ---

  ## CSS Utility Classes

  Defined in `assets/styles/theme.utilities.css` as `@utility` blocks. Apply directly in Vue templates.

  ### Card

  ```html
  <div class="card">...</div>
  ```

  Applies: `rounded-lg p-4`, card bg + foreground, `--shadow-card`, lifts on hover. Use for any content container card.

  ### Buttons (CSS utilities)

  These are lower-level CSS utilities. Prefer the `<Button>` Vue component for most cases. Use these when you need a plain HTML `<button>` or when the Button component is not appropriate.

  | Class | Description |
  |-------|-------------|
  | `btn` | Base: `px-4 py-2 rounded-lg font-medium transition` |
  | `btn-primary` | Blue filled button (`--brand-blue-600` bg) |
  | `btn-secondary` | Bordered button, muted hover |
  | `search-btn` | Larger blue button (`px-6 py-3`) for search/filter submit |
  | `filter-type-btn-active` | Active filter pill — blue bg |
  | `filter-type-btn-inactive` | Inactive filter pill — muted bg |

  ### Badges (CSS utilities)

  These are CSS utility badges, distinct from the `<Badge>` Vue component. Use the Vue `<Badge>` component for domain status badges. Use these only for hardcoded labels in plain HTML.

  | Class | Color |
  |-------|-------|
  | `badge-primary` | Blue light |
  | `badge-success` | Emerald light |
  | `badge-warning` | Orange light |
  | `badge-danger` | Destructive red |

  ### Input

  ```html
  <input class="input-field" />
  ```

  Applies: `w-full px-3 py-2 rounded-lg`, border, input-background, focus ring (blue-500).

  ---

  ## Design System Vue Components

  ### EmptyState

  ```vue
  <DesignSystemEmptyState title="No schools yet" description="Add your first school to get started." />
  ```

  Use whenever a list or data view has zero items. Do not write inline empty state UI.

  ### ErrorState

  ```vue
  <DesignSystemErrorState :error="error" @retry="refetch" />
  ```

  Use for async load errors in page-level data fetching. Always provide `@retry` if re-fetching is possible.

  ### LoadingState / CardSkeleton / ListSkeleton / ChartSkeleton

  Use the appropriate skeleton for the content type while loading:
  - `<DesignSystemLoadingState>` — generic spinner
  - `<DesignSystemCardSkeleton>` — card grid loading
  - `<DesignSystemListSkeleton>` — list/table loading
  - `<DesignSystemChartSkeleton>` — chart loading

  ### GradientCard

  ```vue
  <DesignSystemGradientCard gradient="blue">
    <template #title>Schools</template>
    <template #value>12</template>
  </DesignSystemGradientCard>
  ```

  Use for stat/metric cards with gradient accent backgrounds. Gradient options match `--gradient-*` tokens.

  ### FilterChips

  ```vue
  <DesignSystemFilterChips :filters="activeFilters" @remove="removeFilter" />
  ```

  Use to display active filter state above filtered lists.

  ---

  ## ResponsivenessBadge

  **File:** `components/ResponsivenessBadge.vue`

  ```vue
  <ResponsivenessBadge :percentage="coach.responsiveness_rate" />
  ```

  Standalone badge for coach responsiveness. Renders color + label from percentage automatically — do not replicate this logic inline.

  ---

  ## Interaction Status Badges

  **File:** `components/Interaction/StatusBadges.vue`

  ```vue
  <InteractionStatusBadges type="email" direction="outbound" sentiment="positive" />
  ```

  Renders three `<Badge>` components for interaction type, direction, and sentiment. Always use this component for interaction status — never build inline badge sets for interactions.
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/design/components.md
  git commit -m "docs: add components usage guide"
  ```

---

### Task 5: `docs/design/states.md`

**Files:**
- Create: `docs/design/states.md`

- [ ] **Step 1: Create `docs/design/states.md`** with the following content:

  ```markdown
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
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/design/states.md
  git commit -m "docs: add domain state visual treatment reference"
  ```

---

### Task 6: Final verification

- [ ] **Step 1: Run full verification**

  ```bash
  npm run type-check && npm run lint && npm run test
  ```

  Expected: 0 errors, all tests pass. (The token consolidation is a pure CSS alias change — no TypeScript or component logic changed.)

- [ ] **Step 2: Spot-check the dev server**

  ```bash
  npm run dev
  ```

  Open in browser and verify:
  - A page with `<Badge>` components renders badge colors correctly
  - A page with `<Button color="indigo">` renders correctly (previously broken)
  - `FitScoreDisplay` renders tier badge and score colors correctly

- [ ] **Step 3: Final commit if anything was adjusted**

  ```bash
  git add -p
  git commit -m "docs: finalize design spec files"
  ```
