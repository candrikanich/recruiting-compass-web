# Accessibility Fixes - Remaining Tasks

**Status:** 14 of 23 tasks completed (61%)
**Date:** February 9, 2026

## Completed (14 tasks) ✅

### Critical Issues (4/4)

- ✅ Modal dialogs - Added ARIA, focus trap
- ✅ Delete confirmation modal - Added accessibility
- ✅ Icon-only buttons - Added aria-label, improved contrast
- ✅ Loading states - Added announcements

### High Priority (5/8)

- ✅ Search input - Added for/id linking, aria-describedby
- ✅ Responsiveness bar - Added progressbar role, pattern overlay
- ✅ Semantic list - Converted to ul/li with aria-live count
- ✅ Empty/error states - Improved contrast
- ✅ Date formatters - Added i18n, time elements

### Medium Priority (3/8)

- ✅ Filter pills - Added role="group", aria-label, live announcements
- ✅ Role badges - Added aria-label
- ✅ Form label associations (availability.vue) - Added for/id linking

### Low Priority (2/6)

- ✅ Export buttons - Added loading states, aria-busy
- ✅ Tab navigation (availability.vue) - Added focus indicators, fieldset/legend

## Remaining Tasks (9 tasks)

### High Priority (3 remaining)

1. **Task #12: Add skip link to main content**
   - Files: All coach pages
   - Action: Add `<a href="#main-content">Skip to main content</a>` as first element
   - Mark main with `id="main-content"`

### Medium Priority (5 remaining)

2. **Task #13: Add heading context to stat cards**
   - File: `pages/coaches/[id].vue` (lines 271, 280, 298)
   - Action: Wrap stats in section with aria-labelledby, convert p labels to h3

3. **Task #14: Fix sentiment badge accessibility**
   - File: `pages/coaches/[id]/communications.vue`
   - Action: Separate emoji from text, add aria-hidden to emoji, add aria-label

4. **Task #16: Add required field indicators**
   - Files: `pages/coaches/new.vue`, components/Coach/CoachForm.vue
   - Action: Add aria-required, aria-describedby, role="alert" to form validation

5. **Task #17: Make interaction breakdown chart accessible**
   - File: `pages/coaches/[id]/analytics.vue`
   - Action: Add data table alongside visual chart

6. **Task #18: Make trend chart accessible**
   - File: `pages/coaches/[id]/analytics.vue`
   - Action: Add data summary (highest, lowest, average) before visual chart

### Low Priority (4 remaining)

7. **Task #19: Add context to View All button**
   - File: `pages/coaches/[id].vue` (line 462)
   - Action: Add aria-label with full context

8. **Task #21: Add scrollable region indication**
   - File: `pages/coaches/[id]/communications.vue`
   - Action: Add role="region" and aria-label to scrollable areas

9. **Task #23: Add new window warnings to social links**
   - File: `pages/coaches/[id].vue` (lines 108-148)
   - Action: Add aria-label indicating "opens in new window", add ↗ icon

## Implementation Guide

### Task #12: Skip Link (High Priority)

```vue
<!-- Add to layout or each page -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-blue-600 focus:text-white"
>
  Skip to main content
</a>

<main id="main-content" class="...">
  <!-- Page content -->
</main>
```

### Task #13: Stat Cards Heading Context

```vue
<section aria-labelledby="coach-stats-heading">
  <h2 id="coach-stats-heading" class="sr-only">Coach Statistics</h2>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 id="stat-interactions" class="text-sm font-medium text-slate-700 mb-2">
        Total Interactions
      </h3>
      <p class="text-3xl font-bold text-slate-900" aria-labelledby="stat-interactions">
        {{ stats.totalInteractions }}
      </p>
    </div>
    <!-- Similar for other stats -->
  </div>
</section>
```

### Task #23: Social Link Warnings

```vue
<a
  :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
  target="_blank"
  rel="noopener noreferrer"
  :aria-label="`View ${coach.first_name}'s Twitter profile (opens in new window)`"
  class="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
>
  {{ coach.twitter_handle }}
  <span aria-hidden="true" class="ml-1 inline-block">↗</span>
</a>
```

## Testing Requirements

After completing remaining tasks:

- [ ] Screen reader test (NVDA/JAWS)
- [ ] Keyboard-only navigation
- [ ] 200% zoom test
- [ ] Color contrast validation (WebAIM)
- [ ] Color-blind simulation
- [ ] Mobile AT (TalkBack/VoiceOver)

## Expected Outcomes

**Upon completion:**

- 95%+ WCAG 2.1 AA compliance
- All interactive elements accessible
- All form inputs properly labeled
- All charts have text alternatives
- All navigation keyboard-accessible
- All state changes announced to AT

**Estimated effort:** 2-3 hours for remaining 9 tasks
