# Documents Upload Button Header Design

**Date:** 2026-02-16
**Status:** Approved

## Overview

Move the "Upload Document" button from its current position below the view toggle to the PageHeader actions slot, matching the pattern used on Schools and Coaches pages.

## Problem

The documents page currently has the upload button positioned below the Grid/List view toggle, which is inconsistent with other pages (Schools, Coaches) where the "Add" buttons are in the PageHeader's upper-right corner.

## Solution

Move the upload button to the PageHeader's `#actions` template slot while maintaining the existing toggle behavior for the upload form.

## Design Details

### Component Changes

**File:** `/pages/documents/index.vue`

1. **Add `#actions` slot to PageHeader** (line 3)
   - Create template slot with upload button
   - Button text: "+ Add Document" (closed state) / "Hide Form" (open state)
   - Style: Blue gradient button matching Schools/Coaches pattern
   - Include `PlusIcon` from heroicons
   - Click handler: `@click="showUploadForm = !showUploadForm"`

2. **Remove existing upload button** (lines 110-117)
   - Delete the button and its wrapper
   - Keep only the view toggle buttons (Grid/List)

3. **Button states**
   - Closed: "+ Add Document"
   - Open: "Hide Form"

### Visual Structure

```
PageHeader
  ├─ title: "Documents"
  ├─ description: "Manage videos, transcripts, and other recruiting documents"
  └─ #actions slot
      └─ Upload Button (toggles showUploadForm)

Main Content
  ├─ Statistics Row
  ├─ Filter Panel
  ├─ View Toggle (Grid/List only)
  ├─ Upload Form (conditional, v-if="showUploadForm")
  └─ Documents Grid/List
```

## Implementation Notes

- PlusIcon already imported from `@heroicons/vue/24/outline`
- `showUploadForm` reactive ref already exists
- No state management changes needed
- Existing form toggle behavior preserved
- Same styling pattern as Schools and Coaches pages

## Testing

- Verify button appears in header
- Verify form toggles on click
- Verify button text changes based on form state
- Visual consistency with other index pages
- Mobile responsive behavior

## Alternatives Considered

- **Modal-based upload:** Rejected, would require more significant UX changes
- **Separate upload page:** Rejected, user confirmed not intended despite `/documents/create` reference in code
