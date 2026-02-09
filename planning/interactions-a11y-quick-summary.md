# Interactions Page A11y - Quick Summary

**Document:** `/planning/interactions-page-a11y-audit.md`
**Date:** February 9, 2026
**Total Issues:** 16 (5 CRITICAL, 5 HIGH, 4 MEDIUM, 2 LOW)
**Est. Fix Time:** 2-2.5 hours

---

## The 5 Critical Issues (Must Fix First)

### 1. No Focus Visible Indicators

**Files:** All components + index.vue
**Fix:** Change `focus:outline-none` → `focus:outline-2 focus:outline-blue-600 focus:outline-offset-1`
**Impact:** Keyboard users cannot see focused elements

### 2. Filter Inputs Not Associated with Labels

**File:** InteractionFilters.vue
**Fix:** Add `id` to inputs, `for` to labels (6 inputs total)
**Impact:** Screen readers cannot identify form fields

### 3. No Skip Link

**File:** pages/interactions/index.vue (top)
**Fix:** Add skip link + `id="main"` to main element
**Impact:** Keyboard users must tab through 10+ elements to reach content

### 4. Filter Changes Not Announced

**File:** pages/interactions/index.vue
**Fix:** Add live region with filter result count
**Impact:** Screen reader users don't know results changed

### 5. Loading/Empty States Not Announced

**File:** pages/interactions/index.vue
**Fix:** Add `role="status"` + `aria-live="polite"` to state divs
**Impact:** Screen readers silent during loading

---

## The 5 High-Priority Issues

| Issue                                   | File                   | Fix                                               |
| --------------------------------------- | ---------------------- | ------------------------------------------------- |
| **6. Buttons missing accessible names** | Multiple               | Add `aria-label` to buttons                       |
| **7. Decorative icons announced**       | Multiple               | Add `aria-hidden="true"` to icons                 |
| **8. Filter chips unclear**             | ActiveFilterChips.vue  | Add `aria-label` to remove buttons                |
| **9. No fieldset/legend**               | InteractionFilters.vue | Wrap in `<fieldset>` + `<legend class="sr-only">` |
| **10. Active filters not grouped**      | ActiveFilterChips.vue  | Wrap in `role="region"` or `<fieldset>`           |

---

## The 4 Medium-Priority Issues

| Issue                          | File                     | Fix                                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------------------ |
| **11. Badge contrast too low** | interactionFormatters.ts | Change text from 700 → 900 weight (e.g., `text-emerald-900`) |
| **12. Load More button**       | N/A                      | Only if implemented; add `aria-label` + announcement         |
| **13. Table structure**        | N/A                      | Card layout acceptable; no change needed                     |
| **14. Touch target size**      | Multiple                 | Increase padding to 44x44px minimum                          |

---

## The 2 Low-Priority Issues

| Issue                             | File      | Fix                                       |
| --------------------------------- | --------- | ----------------------------------------- |
| **15. Heading hierarchy**         | index.vue | Add `<section>` + sr-only `<h2>` headings |
| **16. Links not distinguishable** | index.vue | Add `underline` class to text links       |

---

## Files Involved

```
pages/interactions/
├── index.vue .......................... 7 issues (skip link, focus, live regions, headings, links, aria-labels)

components/Interaction/
├── InteractionFilters.vue ............ 2 issues (label associations, fieldset/legend)
├── InteractionCard.vue .............. 3 issues (focus, aria-labels, aria-hidden)
├── ActiveFilterChips.vue ............ 3 issues (focus, aria-labels, region wrapper, aria-hidden)
├── AnalyticsCards.vue ............... 2 issues (focus, aria-labels, aria-hidden)
└── LoggedByBadge.vue ................ 1 issue (contrast)

utils/
└── interactionFormatters.ts ......... 1 issue (contrast)
```

---

## WCAG Criteria Violated

### Level A (5 issues)

- 1.3.1 Info and Relationships (3 instances)
- 1.1.1 Non-text Content (1 instance)
- 4.1.2 Name, Role, Value (2 instances)
- 2.4.1 Bypass Blocks (1 instance)

### Level AA (5 issues)

- 2.4.7 Focus Visible (1 instance)
- 4.1.3 Status Messages (2 instances)
- 1.4.3 Contrast (Minimum) (1 instance)
- 1.4.1 Use of Color (1 instance)

---

## Implementation Order (Recommended)

### Batch 1: CRITICAL (30 min)

1. Add focus indicators (outline → focus:outline-blue-600)
2. Add skip link + main id
3. Add live region for filter changes
4. Add ARIA to loading/empty states

### Batch 2: HIGH (45 min)

5. Label associations (InteractionFilters.vue)
6. aria-hidden on decorative icons
7. aria-label on buttons
8. Filter chips aria-label
9. Fieldset/legend wrappers

### Batch 3: MEDIUM (15 min)

10. Update badge contrast
11. Touch target sizing

### Batch 4: LOW (7 min)

12. Add section headings
13. Add underline to links

---

## Testing Checklist

- [ ] Tab through page → focus visible on ALL elements
- [ ] NVDA/JAWS reads filter changes
- [ ] Skip link appears first Tab
- [ ] All buttons have accessible names
- [ ] Loading state announced
- [ ] All colors meet 4.5:1 contrast
- [ ] Touch targets >= 44x44px

---

## Helpful Code Snippets

### Focus Indicator (All Buttons/Inputs)

```vue
class="... focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
```

### Label Association

```vue
<label for="search-input">Search</label>
<input id="search-input" ... />
```

### Live Region (Filter Changes)

```vue
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
  Showing {{ count }} interactions{{ hasFilters ? ' with filters' : '' }}
</div>
```

### aria-hidden on Icons

```vue
<ChatBubbleLeftRightIcon aria-hidden="true" class="w-5 h-5" />
```

### Fieldset/Legend

```vue
<fieldset>
  <legend class="sr-only">Filter interactions</legend>
  <!-- inputs here -->
</fieldset>
```

---

**Full audit details:** `/planning/interactions-page-a11y-audit.md`
