# Merge Current High School Section into Basic Info

**Date:** 2026-02-14
**Status:** Approved
**Author:** Claude Code

## Overview

Consolidate high school information by merging the standalone "Current High School" section into the "Basic Info" section of the player profile page.

## Current State

The player details page (`/pages/settings/player-details.vue`) currently has:

1. **Basic Info section** with:
   - Graduation Year (required)
   - High School (simple text field)
   - Club/Travel Team

2. **Current High School section** (separate standalone section) with:
   - School Name
   - School Address
   - School City
   - School State

This creates duplication and spreads related information across multiple sections.

## Proposed Changes

### Approach: Simple Grid Expansion

Remove the simple "High School" text field and replace it with the four detailed school fields from the Current High School section, then delete the standalone section.

### Component Changes

**Single file modification:**
- `/pages/settings/player-details.vue`

**Changes required:**
1. Remove simple "High School" input field from Basic Info (lines 114-126)
2. Add 4 detailed fields to Basic Info grid: School Name, Address, City, State
3. Delete entire "Current High School" section (lines 630-690)

**No changes needed:**
- Form data model already contains all required fields
- Validation schema already includes school fields
- Database schema unchanged
- Auto-save behavior unchanged

### UI Layout

**New Basic Info section grid layout:**

```
Row 1: Graduation Year | School Name
Row 2: School City | School State
Row 3: School Address | Club/Travel Team
```

**Field specifications:**
- **School Name**: Text input, placeholder "e.g., Lincoln High School"
- **School Address**: Text input, placeholder "e.g., 123 Main St"
- **School City**: Text input, placeholder "e.g., Atlanta"
- **School State**: Text input, maxlength="2", uppercase, placeholder "e.g., GA"
- All fields optional
- All fields respect `isParentRole` disabled state
- All fields use `@blur="triggerSave"` for auto-save

### Visual Consistency

- Maintains existing 2-column grid layout (`grid-cols-1 md:grid-cols-2`)
- Uses same input styling as current Basic Info fields
- Keeps consistent spacing and gap values
- No visual grouping or subsections needed

## Testing Requirements

1. Verify all 4 new fields appear in Basic Info section
2. Test auto-save triggers on blur for each field
3. Confirm parent role sees all fields as disabled
4. Verify "Current High School" section is completely removed
5. Check that form submission includes all school fields
6. Update any existing tests that reference the old "High School" field

## Data Flow

- Form model already contains: `school_name`, `school_address`, `school_city`, `school_state`
- Submission uses existing `setPlayerDetails()` composable
- Auto-save uses existing `triggerSave()` function
- No API or database changes required

## Benefits

- Eliminates duplicate high school information
- Consolidates related data in one logical section
- Reduces page length by removing standalone section
- Maintains clean, consistent UI patterns
- No breaking changes to data model or API

## Risks & Mitigation

**Risk:** Tests may break if they reference old field locations
**Mitigation:** Update test selectors to target new field locations in Basic Info

**Risk:** Users may be surprised by section reorganization
**Mitigation:** This is an internal improvement with no functional changes; layout is more intuitive

## Implementation Steps

See companion implementation plan for detailed step-by-step instructions.
