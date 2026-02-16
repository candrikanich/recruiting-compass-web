# Log Metric Modal Design

**Date:** 2026-02-16
**Status:** Approved
**Goal:** Replace inline "Log Metric" form with modal dialog for better UX consistency

## Problem

The current inline form on `/performance` page pushes content down when opened, making it hard to find after scrolling. This is inconsistent with the app's established modal pattern used for other "add" actions (AddCoachModal, ExportModal, etc.).

## Solution

Create a dedicated `LogMetricModal` component following the app's established modal pattern, with all existing fields plus optional event association.

---

## 1. Component Architecture

### New Component
`components/Performance/LogMetricModal.vue`

### Integration with Page
- Remove inline form (lines 50-189) from `/pages/performance/index.vue`
- Add `showLogMetricModal` ref (boolean state)
- Change "+ Log Metric" button to toggle `showLogMetricModal = true`
- Render `<PerformanceLogMetricModal>` at end of template with `v-if="showLogMetricModal"`
- Load async with `defineAsyncComponent` (same pattern as ExportModal)

### Modal Structure
```vue
<Teleport to="body">
  <div class="fixed inset-0 z-50 bg-black/50" @click.self="handleClose">
    <div class="modal-container">
      <!-- Header with gradient (following AddCoachModal pattern) -->
      <!-- Form content -->
      <!-- Action buttons -->
    </div>
  </div>
</Teleport>
```

### Props
- `show: boolean` - Controls visibility

### Events
- `@close` - Emitted when modal closes
- `@metric-created` - Emitted with new metric data after successful creation

---

## 2. Form Fields & Layout

### Grid Layout
2-column grid on desktop, single column on mobile

### Fields

**Row 1:**
- **Metric Type** (left) - Dropdown with 8 options - **Required**
  - velocity (Fastball Velocity)
  - exit_velo (Exit Velocity)
  - sixty_time (60-Yard Dash)
  - pop_time (Pop Time)
  - batting_avg (Batting Average)
  - era (ERA)
  - strikeouts (Strikeouts)
  - other (Other)
- **Value** (right) - Number input with decimal support (step="0.01") - **Required**

**Row 2:**
- **Date** (left) - Date picker, defaults to today - **Required**
- **Unit** (right) - Text input for custom units (e.g., "mph", "sec", "avg") - Optional

**Row 3:**
- **Event** (full width) - Dropdown showing athlete's events - Optional
  - Shows: `{event_name} - {formatted_date}`
  - Sorted by date descending (most recent first)
  - First option: "No event" (value: null)

**Row 4:**
- **Verified Checkbox** (full width) - "Verified by third party" - Optional

**Row 5:**
- **Notes** (full width) - Textarea (3 rows) - Optional
  - Placeholder: "Additional context or observations..."

### Action Buttons
- **Primary:** "Log Metric" (blue, disabled when required fields empty or during loading)
- **Secondary:** "Cancel" (gray, closes modal)

---

## 3. Event Integration

### Fetching Events
- Use existing `useEvents()` composable to fetch athlete's events
- Call `fetchEvents()` when modal opens (onMounted or when show prop becomes true)
- Show loading state in dropdown while fetching

### Dropdown Display
- Format: `{event_name} - {formatted_date}` (e.g., "PG Underclass Showcase - Jan 15, 2025")
- Sorted by date descending (most recent first)
- First option: "No event" (value: null)
- Events matching the selected metric date could be visually highlighted or sorted to top

### Data Storage
- Add `event_id` field to metric payload when submitting
- If "No event" selected, `event_id` is null (standalone metric)
- Backend already supports `event_id` as optional foreign key on `performance_metrics` table

### Edge Cases
- No events exist: Show "No events available" as only dropdown option
- Many events (50+): Use basic dropdown with scrolling (no autocomplete complexity needed)

---

## 4. Data Flow

### Form Submission Flow

1. **User clicks "Log Metric"** → `handleSubmit()` triggered
2. **Validation** → Check required fields (metric_type, value, recorded_date)
3. **Loading state** → Set `loading = true`, disable submit button
4. **API Call** → Use existing `usePerformance()` composable's `createMetric()` method
5. **Payload Structure:**
   ```typescript
   {
     metric_type: string,
     value: number,
     recorded_date: string,  // ISO date
     unit: string | null,
     verified: boolean,
     notes: string | null,
     event_id: string | null  // NEW - links to events table
   }
   ```
6. **Success** → Emit `metric-created` event with new metric, close modal, reset form
7. **Error** → Display error message in modal, keep modal open, re-enable form

### Page Integration
- Page listens for `@metric-created` event
- Calls `fetchMetrics()` to refresh metrics list
- Metrics table automatically updates with new data
- Charts recalculate with new metric included

### Form Reset
- After successful submission or on close, reset all fields to defaults
- Clear any error messages
- Set loading back to false

---

## 5. Error Handling

### Client-Side Validation
- **Required fields** - Disable submit button when metric_type, value, or recorded_date are empty
- **Value validation** - Must be valid number (HTML5 number input handles this)
- **Date validation** - Must be valid date (HTML5 date picker handles this)
- Show validation state with standard red error styling

### API Error Handling
- **Network errors** - "Failed to save metric. Please check your connection and try again."
- **Validation errors** - Display specific error message from API
- **Permission errors** - "You don't have permission to add metrics."
- **Generic errors** - "Something went wrong. Please try again."

### Error Display
- Show error message in red banner at top of modal form (below header)
- Error persists until user edits a field or closes/reopens modal
- Pattern: `<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>`
- Matches AddCoachModal error display pattern

### Loading States
- Submit button shows "Logging..." text while saving
- Submit button disabled during save
- Prevent form re-submission while loading
- Events dropdown shows "Loading events..." while fetching

---

## 6. User Experience & Modal Behavior

### Modal Interaction
- **Opening** - Smooth fade-in animation (CSS transition)
- **Backdrop click** - Closes modal (same as Cancel button)
- **ESC key** - Closes modal when pressed
- **Focus management** - Auto-focus first input (Metric Type dropdown) when modal opens
- **Scroll lock** - Prevent body scrolling when modal is open (handled by fixed positioning)

### Success Feedback
- **On successful save** - Modal closes immediately
- **Page confirmation** - Brief success toast/notification: "Metric logged successfully" (optional)
- **Data refresh** - Metrics list and charts update automatically
- **Visual indicator** - New metric could briefly highlight in table (optional enhancement)

### Form Behavior
- **Smart defaults** - Date field defaults to today's date
- **Tab order** - Natural flow through all form fields
- **Clear form on close** - All fields reset when modal closes
- **Preserve on error** - Form data persists if save fails

### Accessibility
- Modal has `role="dialog"` and `aria-modal="true"`
- Close button has `aria-label="Close modal"`
- All form inputs have associated labels
- Error messages announced to screen readers

---

## Implementation Files

### New Files
- `components/Performance/LogMetricModal.vue` - Main modal component

### Modified Files
- `pages/performance/index.vue` - Remove inline form, integrate modal

### Dependencies
- Existing `usePerformance()` composable - for `createMetric()`
- Existing `useEvents()` composable - for fetching athlete's events
- No new API endpoints needed (backend already supports `event_id`)

---

## Success Criteria

- ✅ Modal opens smoothly when "+ Log Metric" is clicked
- ✅ All existing form fields are present and functional
- ✅ Event dropdown shows athlete's events sorted by date
- ✅ Form validation prevents submission with missing required fields
- ✅ Successful submission closes modal and refreshes metrics list
- ✅ Error messages display clearly when submission fails
- ✅ Modal closes on backdrop click, Cancel button, or ESC key
- ✅ Form resets after successful submission
- ✅ Consistent styling with other modals (AddCoachModal, ExportModal)
- ✅ Accessible keyboard navigation and screen reader support

---

## Future Enhancements (Out of Scope)

- Auto-suggest events based on metric date
- Bulk metric entry (log multiple metrics at once)
- Import metrics from CSV
- Metric templates for common event types
