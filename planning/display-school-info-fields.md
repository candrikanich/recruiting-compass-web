# Plan: Display All School Information Fields

## Problem Statement
When editing a school, users can enter detailed information (campus address, mascot, baseball facility, undergraduate size, website, Twitter handle), but after saving, these fields don't appear in the school detail page's "Information" section. Users see no visual confirmation that their edits were saved.

## Current State Analysis

### What Gets Displayed (Display Info section, lines 145-176)
Currently showing:
1. Website (clickable link) - line 147-153
2. College Scorecard Data (student size, tuition, admission rate) - lines 156-175

### What Gets Saved but NOT Displayed
1. **Campus Address** - stored in `school.academic_info.address`
2. **Baseball Facility** - stored in `school.academic_info.baseball_facility_address`
3. **Mascot** - stored in `school.academic_info.mascot`
4. **Undergraduate Size** - stored in `school.academic_info.undergrad_size`
5. **Twitter Handle** - stored in `school.twitter_handle` (direct field)

### Data Flow Verification
**File:** `/pages/schools/[id]/index.vue`

- **Edit Form** (lines 113-143): Collects all 6 fields into `editedBasicInfo`
- **Save Logic** (lines 565-585): Saves fields to:
  - Direct fields: `website`, `twitter_handle`, `instagram_handle`
  - JSON object: `academic_info` (contains address, mascot, baseball_facility_address, undergrad_size)
- **Display** (lines 145-176): Only shows website and college scorecard data

The fields are properly saved but never displayed.

## Solution Design

### UI/UX Approach
Expand the "Display Info" section (currently lines 145-176) to show all editable fields organized in a clean grid layout with:
- Icons for visual recognition
- Conditional rendering (only show if data exists)
- Consistent styling with existing website display
- Clear section headers

### Layout Structure
```
Information Section
├── [Lookup] [Edit/Cancel buttons]
│
├── Map (existing)
├── Distance from Home (existing)
│
├── Personal Details Section (NEW)
│   ├── Campus Address
│   ├── Baseball Facility
│   ├── Mascot
│   └── Undergraduate Size
│
├── Contact/Social Section (NEW)
│   ├── Website
│   └── Twitter Handle
│
└── College Scorecard Data (existing)
```

### Data Sources
All fields already have getters in the component:
- `school.academic_info?.address`
- `school.academic_info?.baseball_facility_address`
- `school.academic_info?.mascot`
- `school.academic_info?.undergrad_size`
- `school.website`
- `school.twitter_handle`

No additional data fetching or store changes needed.

## Implementation Details

### File to Modify
- **Primary:** `pages/schools/[id]/index.vue`

### Changes Required

**1. Add Display Section (lines 145-177, in the `<!-- Display Info -->` block)**

Replace the current Display Info section with:
- Keep Website section as-is
- Add new "School Information" section with grid layout showing:
  - Campus Address (with location icon)
  - Baseball Facility (with stadium icon)
  - Mascot
  - Undergraduate Size
  - Twitter Handle (with link to Twitter)

**2. Use Existing Icons**
Already imported from `@heroicons/vue/24/outline`:
- `MapPinIcon` - for address
- `UserGroupIcon` - for undergraduate size
- (May need to add: `GlobeAltIcon` for website, `AtSymbolIcon` for twitter)

**3. Responsive Grid**
- Mobile (1 column)
- Tablet/Desktop (2 columns for personal details, separate for contact/social)

### Implementation Strategy

**Option A (Recommended):** Add new sub-sections within Display Info
```typescript
<!-- Display Info -->
├── Website (existing, moved to "Contact & Social" section)
├── School Information (new grid section)
│   ├── Campus Address
│   ├── Baseball Facility
│   ├── Mascot
│   └── Undergraduate Size
├── Contact & Social (new section)
│   ├── Website
│   └── Twitter Handle
└── College Scorecard Data (existing)
```

**Option B:** Flat display with conditional rendering
Same fields but in a single grid without section headers.

## Files Affected
- **Primary Change:** `/pages/schools/[id]/index.vue` (Display Info section, ~30-40 lines added)
- **No Changes Required:**
  - Database schema (fields already stored)
  - Store (already saving correctly)
  - Edit form (already collecting data)
  - Types/validation (already defined)

## Testing Checklist
1. Create a new school and fill all editable fields
2. Save the school
3. Verify all 6 fields display in Information section:
   - ✓ Campus Address
   - ✓ Baseball Facility
   - ✓ Mascot
   - ✓ Undergraduate Size
   - ✓ Website
   - ✓ Twitter Handle
4. Edit fields and verify updates appear immediately
5. Leave fields empty and verify they don't display
6. Test responsive layout on mobile/tablet/desktop
7. Run type-check and lint
8. Manual smoke test on /schools/[id] page

## Risk Assessment
- **Risk Level:** Very Low
- **Change Scope:** Single file, display-only logic (no data mutations)
- **Breaking Changes:** None (only adds display functionality)
- **Browser Compatibility:** Uses existing Heroicons, no new dependencies

## Unresolved Questions
None - all data sources and storage locations are clear.
