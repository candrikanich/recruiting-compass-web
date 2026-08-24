# iOS Spec — Animated Completion Checkbox

> **Prepared:** 2026-08-24
> **Web branch:** `fix/soak-nightly-failures`
> **Purpose:** Bring the new web completion-feedback animation (`DesignSystemFormAnimatedCheck`) to iOS so task, terms, and consent commit moments get the same satisfying "spring + tick" confirmation, using native SF Symbol effects rather than a custom animation.

---

## Feature Overview

When a user commits a meaningful boolean — completing a task, accepting Terms & Conditions, or toggling a coach-visibility consent — the checkbox now animates: an emerald rounded box springs in (scale + bouncy overshoot) and a white checkmark strokes on a beat later. It is purely presentational confirmation; the underlying checkbox/switch remains the source of truth for state, accessibility, and form semantics. Motion is fully suppressed under Reduce Motion (the state simply snaps).

This is a **UI-polish / animation** feature. There is **no API, no data model, and no persistence change** — every rollout site already has working toggle logic on both platforms. The only thing being ported is the *completion animation and its accessibility/Reduce-Motion behavior*.

---

## Web Implementation Summary

### Files Changed
- `components/DesignSystem/Form/AnimatedCheck.vue` — **new** primitive. A real `<input type="checkbox" class="sr-only">` stays the source of truth (keyboard, focus, screen-reader announce, form semantics); a sibling `<svg>` renders the visual state purely via CSS `peer-checked:` selectors. `v-bind="$attrs"` forwards `@change` / `data-testid` / `aria-*` straight onto the native input. Props: `modelValue?: boolean`, `disabled?: boolean`, `size?: "sm" | "md"`. Emits `update:modelValue`.
- `components/DesignSystem/index.ts` — registers/exports the new component (`DesignSystemFormAnimatedCheck`).
- `components/Timeline/TaskItem.vue` — task complete toggle now uses AnimatedCheck.
- `components/Dashboard/QuickTasksWidget.vue` — quick-task complete toggle.
- `pages/tasks/index.vue` — task-list status toggle.
- `pages/admin/signup.vue` — accept Terms & Conditions checkbox.
- `components/Settings/PlayerDetailsBasicsTab.vue` — "Show phone to verified coaches" **and** "Show email to verified coaches" consent toggles.

### DB/Migration Changes
None. This is presentational only.

### Web Animation Spec (source of truth)
Extracted from `AnimatedCheck.vue`. iOS should reproduce the *feel*, not the literal CSS.

| Element | Property animated | Timing | Easing |
|---|---|---|---|
| Emerald fill box (`.fill`) | `transform: scale(0 → 1)`, `transform-origin: center` | ~300 ms | `cubic-bezier(.34, 1.56, .64, 1)` (bouncy overshoot / spring) |
| White tick (`.tick`) | `stroke-dashoffset: 22 → 0` (strokes on) | ~300 ms, **~100 ms delay** after box starts | ease (default) |
| Box outline (`.box`) | `stroke` color slate-300 → emerald-600 | ~200 ms | linear |
| Reduce Motion | `motion-reduce:[&_*]:!transition-none` — **all transitions disabled**, state snaps instantly | 0 ms | none |

- **Unchecked** state: slate-300 rounded-square outline, no fill, no tick.
- **Checked** state: emerald-500 filled rounded box, emerald-600 outline, white tick.
- **Focus:** `peer-focus-visible` draws a 2px blue-600 focus ring on the SVG (driven by the hidden native input's focus).
- **Colors:** emerald-500 fill / emerald-600 stroke. iOS twin: `Color.successGreen` (already defined as `Brand.emerald600` in `Core/Theme/AppColors.swift`).

---

## Existing iOS Files (parity-check results)

No `AnimatedCheck` component and **no `symbolEffect` usage anywhere** in the iOS repo — the bounce is net-new. Each web rollout site already has a working iOS counterpart; the work is adding the completion animation + Reduce-Motion gating to them (and reconciling the deltas below).

| # | Web site | iOS file | Current iOS rendering | Parity status |
|---|---|---|---|---|
| 1 | `Timeline/TaskItem.vue` (task complete) | `Features/Timeline/Components/PhaseCardTaskRow.swift` | `Button` → `Image(systemName: task.statusIconName)` w/ `task.statusColor` | **MATCH** — SF Symbol already; add bounce |
| 2 | `Dashboard/QuickTasksWidget.vue` | `Features/Dashboard/Components/QuickTaskRow.swift` | `Button(action: onToggle)` → `Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")` w/ `Color.successGreen` | **MATCH** — exact twin; add bounce |
| 3 | `pages/tasks/index.vue` (task list) | `Features/Tasks/Components/TaskCard.swift` (inside `Features/Tasks/Views/TasksListView.swift`) | `Button` → `Image(systemName: task.effectiveStatus == .completed ? "checkmark.circle.fill" : "circle")` w/ `Color.successGreen` | **MATCH** — exact twin; add bounce |
| 4 | `pages/admin/signup.vue` (accept Terms) | `Features/Auth/Components/TermsCheckbox.swift` (used by `Features/Auth/Views/SignupView.swift`) | `Button` → `Image(systemName: isChecked ? "checkmark.square.fill" : "square")` w/ **`Color.accentBlue`** (blue, **square**) | **GAP** — see Delta A |
| 5 | `PlayerDetailsBasicsTab.vue` — show phone to coaches | `Features/Preferences/Views/Tabs/BasicsTab.swift` → `toggleRow(...)` `keyPath: \.allowSharePhone` | native `Toggle` (**switch**), label "Share phone with coaches" | **GAP** — see Delta B |
| 6 | `PlayerDetailsBasicsTab.vue` — show email to coaches | `Features/Preferences/Views/Tabs/BasicsTab.swift` → `toggleRow(...)` `keyPath: \.allowShareEmail` | native `Toggle` (**switch**), label "Share email with coaches" | **GAP** — see Delta B |

---

## Parity Deltas (web is source of truth — resolve explicitly)

> **✅ RESOLVED by Chris 2026-08-24 — build to these, deltas below are background:**
> - **Delta A → Retint to emerald + bounce.** Keep the `checkmark.square.fill` square glyph on Terms, recolor checked tint to `Color.successGreen`, add gated `.symbolEffect(.bounce)`. Do NOT switch to the circle glyph.
> - **Delta B → Keep native `Toggle` switches** for the two consent controls (intentional platform divergence — no bounce). Still update the labels to match web copy exactly (see below).
> - **Exact web consent labels (verified against web source):** `"Show phone number to verified coaches"` and `"Show email to verified coaches"`. Update iOS labels to these strings verbatim; keep keys `allowSharePhone` / `allowShareEmail`.

### Delta A — Terms checkbox is a **blue square**, web is an **emerald box**
`TermsCheckbox.swift` renders `checkmark.square.fill` / `square` tinted `Color.accentBlue`. The web AnimatedCheck springs an **emerald** rounded box + white tick.

- **Recommended:** keep the **square** SF Symbol (`checkmark.square.fill`) for Terms since it reads as a "form checkbox" not a "task done" circle, but switch the checked tint to `Color.successGreen` to match web's emerald and add `.symbolEffect(.bounce)` on check. This gives visual parity (emerald + bounce) while staying idiomatic.
- **Alternative (stricter literal parity):** switch to `checkmark.circle.fill` to match the exact glyph the task sites use. Decide with Chris — the web uses one shared component everywhere, so the *most faithful* port is one emerald bouncing check glyph at all six sites.
- **Do not** silently leave it blue — that is the parity gap this spec exists to surface.

### Delta B — Consent controls are native **switches** on iOS, **checkboxes** on web
`BasicsTab.swift` uses `Toggle` (iOS switch) for the two coach-visibility consents. Web uses the AnimatedCheck checkbox. A `Toggle` has no checkmark glyph to bounce.

- **Recommended:** keep the native `Toggle` **switch** on iOS. A switch is the platform-idiomatic control for a settings-style boolean, its animation is already native, and forcing a custom checkbox here would fight iOS conventions. The bounce animation is a checkmark affordance and does not apply to a switch. Treat this as **intentional platform divergence** and document it, rather than replacing the switch.
- **If Chris wants literal parity:** replace the two `toggleRow` switches with a checkbox-style control (`checkmark.circle.fill` + `.symbolEffect(.bounce)`, emerald) matching the task sites. This is a UX change to the Basics tab, not just an animation add — call it out before building.
- **Label delta (independent of control choice):** web labels are "Show phone to verified coaches" / "Show email to verified coaches"; iOS labels are "Share phone with coaches" / "Share email with coaches". Web is source of truth → update iOS labels to "Show phone to verified coaches" / "Show email to verified coaches" (verify the "verified" qualifier matches the actual web copy before changing). Underlying keys `allowSharePhone` / `allowShareEmail` are fine to keep.

---

## What iOS Needs to Build

No new screens. This is an **animation + Reduce-Motion pass** over existing completion controls, plus the two delta reconciliations above.

### Suggested shared helper

Add a small reusable modifier / view so all six (or four, if consents stay switches) sites animate identically and handle Reduce Motion in one place. Sketch:

```swift
import SwiftUI

/// Native twin of web `DesignSystemFormAnimatedCheck`.
/// A checkmark glyph that bounces in on completion, respecting Reduce Motion.
struct AnimatedCheckIcon: View {
    let isOn: Bool
    /// "checkmark.circle.fill"/"circle" for tasks; "checkmark.square.fill"/"square" for terms.
    var filledSymbol: String = "checkmark.circle.fill"
    var emptySymbol: String = "circle"
    var onColor: Color = .successGreen
    var offColor: Color = .secondary

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Image(systemName: isOn ? filledSymbol : emptySymbol)
            .foregroundStyle(isOn ? onColor : offColor)
            // Bounce only on genuine completion, and only when motion is allowed.
            .symbolEffect(.bounce, value: reduceMotion ? false : isOn)
    }
}
```

- `.symbolEffect(.bounce, value:)` fires the bounce whenever `value` changes to a new truthy transition. Gating `value` on `reduceMotion` means that under Reduce Motion the symbol simply swaps with no bounce.
- Keep the existing `Button` / `Toggle` wrappers, accessibility labels, hints, and `@ScaledMetric` sizing at each call site — only the inner `Image` swaps to `AnimatedCheckIcon` (or gains the `.symbolEffect`).
- **Only animate genuine commit moments** (task complete, terms accept, consent grant). Do **not** attach the bounce to rapid/bulk interactions (filter chips, multi-select, bulk status changes) — matches the web guidance.

### Reduce-Motion handling (required)
- Read `@Environment(\.accessibilityReduceMotion)` in each animating view (or the shared helper). When true, skip the bounce and snap to the new state. Equivalent to the web's `motion-reduce:` transition suppression.
- (Optional, belt-and-suspenders) `UIAccessibility.isReduceMotionEnabled` is the UIKit equivalent if any call site is not a SwiftUI `View`; prefer the environment value in SwiftUI.

---

## API Endpoints to Call

**None.** No network work in this feature. Existing toggle handlers (`onToggle`, `isChecked.toggle()`, `Toggle` bindings, task status services) are unchanged.

---

## Data Models (Swift)

**None new.** Reuses existing `TaskWithStatus` / `AthleteTaskStatus` / `QuickTask` / `PlayerDetails.allowSharePhone` / `allowShareEmail`. No `Codable` changes.

---

## Business Rules to Enforce Client-Side

- The animation is **presentational only** — it must never gate, delay, or block the state write. State updates immediately; the bounce plays over the already-committed state (same as web, where the native input is the source of truth).
- Bounce fires **only on the false→true (completion) transition** of a genuine commit control, and only when Reduce Motion is off.
- Disabled/locked controls (e.g. locked tasks) must not bounce and must retain their existing disabled affordance.
- Accessibility parity: the native control keeps its `accessibilityLabel` / `accessibilityValue` ("Completed"/"Not completed", "Checked"/"Unchecked") / `accessibilityHint`. The animated glyph stays `accessibilityHidden(true)` (it already is in `TermsCheckbox`).

---

## Excluded Items (No iOS Work Needed)

- **DB migrations / RLS** — none; presentational feature.
- **API routes** — none; no `$fetch` involved on web either.
- **Animation library** — web uses none (pure CSS); iOS uses native `.symbolEffect`, no third-party dependency.
- **Email / CSRF / auth flows** — untouched.

---

## Dependencies

- iOS 17+ for `.symbolEffect(.bounce, value:)` (symbol effects are iOS 17 API). Confirm the deployment target supports it; if the app still targets iOS 16, gate the effect with `if #available(iOS 17, *)` and fall back to a plain glyph swap (or a small `withAnimation(.spring)` scale on the icon).
- Existing controls at all six sites (already present) — this is an enhancement, not a new screen.

---

## Notes for iOS Claude

- The web component's whole design intent is **"native checkbox stays the source of truth, visual layer is decoration."** iOS already honors this everywhere (Button/Toggle drive state, Image is `accessibilityHidden`). Preserve that — do not move state into the animation.
- Tasks sites are a near-zero-risk change: they *already* render `checkmark.circle.fill` + `Color.successGreen`. Literally just add the gated `.symbolEffect(.bounce)`.
- Resolve **Delta A** (terms blue-square vs emerald) and **Delta B** (consent switch vs checkbox + label copy) with Chris before building — these are UX decisions, not mechanical ports. Recommendations are in the Deltas section; the strictest-parity path is one emerald bouncing `checkmark.circle.fill` at all six sites.
- `Color.successGreen` already equals `Brand.emerald600` — reuse it; do not introduce a new green.
- Match the web's ~300 ms spring feel: `.bounce` is a good default. If you hand-roll (iOS 16 fallback), `.spring(response: 0.3, dampingFraction: 0.6)` approximates `cubic-bezier(.34,1.56,.64,1)`.

---

## Test Checklist

1. **Task complete (all 3 task sites):** tap an incomplete task → glyph fills emerald and bounces once; state persists; tapping again un-completes with no bounce (no false→true transition).
2. **Reduce Motion ON** (Settings → Accessibility → Motion → Reduce Motion): complete a task → glyph swaps to filled emerald instantly, **no bounce**. Verify at every animating site.
3. **Terms acceptance (signup):** tap the Terms checkbox → checkmark appears with the agreed animation/color per the Delta A decision; the "I agree" state gates signup exactly as before.
4. **Consent toggles (Basics tab):** toggle "Show phone to verified coaches" / "Show email to verified coaches" → state saves as before; behavior matches the Delta B decision (switch retained, or checkbox with bounce). Confirm labels read "Show … to verified coaches".
5. **VoiceOver:** each control announces its label + value ("Completed"/"Not completed", "Checked"/"Unchecked") + hint; the decorative glyph is not separately announced.
6. **Dynamic Type (XXL):** glyphs scale with `@ScaledMetric` sizing; layout does not clip; bounce still reads.
7. **Disabled/locked task:** no bounce, no state change, disabled affordance intact.
8. **iOS 16 fallback (if applicable):** on a device below the symbol-effects minimum, completion still swaps state and color with a graceful (or absent) animation — no crash, no missing glyph.
