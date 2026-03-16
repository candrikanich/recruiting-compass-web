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
- Coach responsiveness: 40–59% (Moderate) and 20–39% (Slow)

**Don't use for:** Errors, completed states, primary actions. Note: positive sentiment uses **blue**, not orange.

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
