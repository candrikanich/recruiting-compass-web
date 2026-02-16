# Interactions Page: Card Grid Layout Design

**Date:** 2026-02-15
**Status:** Approved
**Approach:** Minimal Change - Container Only

## Overview

Convert the interactions page from a vertical list layout to a responsive card grid layout, matching the pattern used on the schools and coaches pages.

## Current State

- `/pages/interactions/index.vue` renders interactions in a vertical list using `<div class="space-y-4">`
- Each interaction is rendered via `InteractionCard.vue` component
- Component is horizontally oriented (icon left, content middle, button right)
- One card per row, full container width

## Proposed Change

Change the container div from vertical stack to responsive grid:
- **FROM:** `<div class="space-y-4">`
- **TO:** `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`

This matches the pattern used in `/pages/schools/index.vue` and `/pages/coaches/index.vue`.

## Design Decisions

### Card Layout
**Decision:** Keep horizontal orientation (icon left, content middle, button right)
**Rationale:** Current design is well-structured and should adapt to grid without modification

### Grid Configuration
**Decision:** Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
**Rationale:** Consistency with schools/coaches pages, proven responsive behavior

### Card Content
**Decision:** Keep all current information (type, direction, sentiment, subject, school/coach, content preview, date, attachments)
**Rationale:** Provides complete context at a glance, cards are tall enough to accommodate

## Architecture

### Files Modified
- `/pages/interactions/index.vue` (1 line change at line 119)

### Impact
- Zero breaking changes
- No component API changes
- No data structure changes
- Purely presentational change

### Components Unchanged
- `InteractionCard.vue` - No modifications needed
- All composables, stores, and data fetching logic remain the same

## Implementation

### Code Change

In `/pages/interactions/index.vue` at line 119:

```vue
<!-- BEFORE -->
<div class="space-y-4">
  <InteractionCard
    v-for="interaction in filteredInteractions"
    :key="interaction.id"
    :interaction="interaction"
    :school-name="getSchoolName(interaction.school_id)"
    :coach-name="
      interaction.coach_id
        ? getCoachName(interaction.coach_id)
        : undefined
    "
    :current-user-id="userStore.user?.id || ''"
    :is-parent="userStore.isParent"
    @view="viewInteraction"
  />
</div>

<!-- AFTER -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <InteractionCard
    v-for="interaction in filteredInteractions"
    :key="interaction.id"
    :interaction="interaction"
    :school-name="getSchoolName(interaction.school_id)"
    :coach-name="
      interaction.coach_id
        ? getCoachName(interaction.coach_id)
        : undefined
    "
    :current-user-id="userStore.user?.id || ''"
    :is-parent="userStore.isParent"
    @view="viewInteraction"
  />
</div>
```

### Grid Classes Breakdown
- `grid` - Enables CSS Grid layout
- `grid-cols-1` - 1 column on mobile (default, < 768px)
- `md:grid-cols-2` - 2 columns on tablet (≥768px)
- `lg:grid-cols-3` - 3 columns on desktop (≥1024px)
- `gap-6` - 1.5rem (24px) gap between cards

## Visual Design

### Mobile (< 768px)
- Single column layout
- Each card takes full width
- Same appearance as current implementation
- Cards stacked vertically with 24px gap

### Tablet (768px - 1023px)
- Two-column layout
- Cards displayed side-by-side in pairs
- Each card ~50% of container width (minus gap)
- Horizontal card layout remains functional

### Desktop (≥ 1024px)
- Three-column layout
- Cards displayed in rows of 3
- Each card ~33% of container width (minus gap)
- Maximum screen real estate efficiency

### Visual Consistency
- All cards maintain border, shadow, and hover states from `InteractionCard`
- Gap spacing matches schools/coaches pages
- Cards align to grid naturally with equal heights per row

### Card Internal Layout (Unchanged)
- Icon (10x10 rounded-lg) on left
- Content section flexes to fill available space
- "View" button on right (fixed width)
- Text truncation (`line-clamp-2`) prevents overflow
- All badges and metadata visible

## Accessibility

### No Regressions
- Container change is semantically neutral
- All existing ARIA attributes preserved
- Skip link, page header, and announcements unchanged

### Grid Accessibility
- CSS Grid is well-supported by screen readers
- Reading order follows DOM order (left-to-right, top-to-bottom)
- No visual-only reordering

### Preserved Features
- Skip link: "Skip to main content" (line 6-11)
- Semantic `<main>` landmark with `id="main-content"`
- Live region for filter results announcement
- Proper heading hierarchy
- Focus management in card buttons
- ARIA labels on icons and buttons

### Touch Targets
- "View" button maintains 44px min-height
- All interactive elements meet WCAG 2.1 AA standards

### Keyboard Navigation
- Tab order flows naturally through grid (row by row)
- All interactions remain keyboard accessible

## Testing

### Manual Testing Checklist

**Visual Verification:**
- [ ] Mobile (< 768px): Single column, cards full-width
- [ ] Tablet (768px - 1023px): Two columns side-by-side
- [ ] Desktop (≥ 1024px): Three columns
- [ ] Cards maintain proper spacing and alignment

**Functional Testing:**
- [ ] Click "View" button → navigates to detail page
- [ ] Filter interactions → grid updates correctly
- [ ] Export CSV → works
- [ ] Export PDF → works
- [ ] Pagination → cards paginate correctly in grid

**Responsive Testing:**
- [ ] Resize browser from mobile → tablet → desktop
- [ ] Cards reflow smoothly
- [ ] No horizontal scrolling
- [ ] Gaps remain consistent at all breakpoints

**Edge Cases:**
- [ ] Empty state (no interactions) displays correctly
- [ ] Loading state displays correctly
- [ ] Error state displays correctly
- [ ] Single interaction displays in grid (not stretched)
- [ ] Many interactions paginate correctly
- [ ] Filter results with 1-2 items don't stretch cards

### Automated Testing
- Existing E2E tests should pass (no DOM structure changes to cards)
- Unit tests for InteractionCard unchanged
- No new test files needed

### Browser Testing
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (iOS and macOS)

### Verification Commands
```bash
npm run dev                    # Visual verification
npm run type-check            # TypeScript validation
npm run lint                  # Code quality
npm run test                  # Unit tests
npm run test:e2e              # E2E tests
```

## Future Enhancements (Not in Scope)

If user testing reveals UX issues with the horizontal card layout in narrow grid columns:
- Consider vertical card variant for mobile/tablet
- Add responsive font size adjustments
- Optimize spacing for narrow cards

These would be handled as separate iterations if needed.

## Summary

This is a minimal, low-risk change that brings visual consistency to the interactions page by adopting the same grid pattern used across schools and coaches pages. The single-line change maintains all existing functionality while improving space efficiency and visual appeal.
