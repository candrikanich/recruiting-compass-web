# User Story 3 Implementation Plan

**Date:** 2026-01-24
**Scope:** Implement missing features from Stories 3.1-3.5 to achieve full compliance

---

## High-Level Approach

1. **Database Schema Updates** - Add `priority_tier` field to schools table
2. **Core Features** (Priority 1)
   - Priority tier system with filtering/display
   - Duplicate school detection and prevention
   - Warning at 30+ schools
   - Fit score breakdown UI with 4 components
   - Automatic fit score recalculation on athlete profile changes
3. **Enhancement Features** (Priority 2)
   - Sorting by distance, fit score, last contact date
   - Fit score range filtering
   - Status change history tracking
   - Character limit validation (5000) for notes
   - Edit history for notes
4. **Testing** - Comprehensive unit and E2E tests

---

## Phase 1: Database & Data Model Updates

### Task 1.1: Add Priority Tier Field

**File:** `types/models.ts` / Database migration
**Changes:**

```typescript
// Add to School type
priority_tier?: 'A' | 'B' | 'C' | null  // null = not set
```

**Migration:**

- Add `priority_tier` column to `schools` table (VARCHAR, nullable)
- Type: `'A' | 'B' | 'C'` or null

**Why:** Enable priority-based filtering and display per Story 3.4

---

### Task 1.2: Add Note Edit History

**File:** Types and optional migration
**Approach:** Store edit metadata in JSON field or separate `note_history` table

**Option A (Simple):** Add to School model

```typescript
note_edits?: Array<{
  edited_at: string
  edited_by: string
  content: string
}> | null
```

**Option B (Normalized):** Create separate `school_note_history` table with foreign key

**Recommended:** Option A for MVP simplicity

---

## Phase 2: Core Features (Priority 1)

### Task 2.1: Priority Tier System

#### 2.1a: Update Store & Composables

**Files:** `stores/schools.ts`, `composables/useSchools.ts`

**Changes:**

1. Add getters:

   ```typescript
   schoolsByPriorityTier(tier: 'A' | 'B' | 'C') {
     return this.filteredSchools.filter(s => s.priority_tier === tier)
   }

   priorityATiers() { return this.schoolsByPriorityTier('A') }
   priorityBTiers() { return this.schoolsByPriorityTier('B') }
   priorityCTiers() { return this.schoolsByPriorityTier('C') }
   ```

2. Add action:

   ```typescript
   async setPriorityTier(schoolId: string, tier: 'A' | 'B' | 'C' | null) {
     // Update via updateSchool
   }
   ```

3. Update filter state to include priority tier

#### 2.1b: Create UI Components

**New Component:** `SchoolPrioritySelector.vue`

- Dropdown or button group (A/B/C/None)
- Used in school detail page and school card
- Shows current tier with visual styling

**Update Components:**

- `SchoolCard.vue` - Show priority tier badge
- `schools/[id]/index.vue` - Add priority tier selector
- Filter UI in `schools/index.vue` - Add priority tier filter

#### 2.1c: Update Store Filters

**File:** `stores/schools.ts`

```typescript
interface SchoolFilters {
  division?: string[];
  state?: string[];
  status?: string[];
  verified?: boolean;
  priorityTiers?: ("A" | "B" | "C")[]; // NEW
}
```

**Implementation Notes:**

- Independent of status (can be set/changed separately)
- Visible in filtered results view
- Selectable via priority filter chips

---

### Task 2.2: Duplicate School Detection

#### 2.2a: Create Detection Algorithm

**File:** `composables/useSchoolDuplication.ts` (new)

**Logic:**

1. Check by exact name match (case-insensitive)
2. Check by NCAA ID if available
3. Check by website domain if available
4. Return match details (school, match type: name/ncaa/url)

```typescript
export const useSchoolDuplication = () => {
  const schoolStore = useSchoolStore();

  const findDuplicate = (schoolData: Partial<School>) => {
    return schoolStore.schools.find((existing) => {
      // Name match (normalize)
      if (existing.name.toLowerCase() === schoolData.name?.toLowerCase()) {
        return true;
      }
      // NCAA ID match
      if (schoolData.ncaa_id && existing.ncaa_id === schoolData.ncaa_id) {
        return true;
      }
      // Website match (extract domain)
      if (schoolData.website && existing.website) {
        const domain1 = new URL(schoolData.website).hostname;
        const domain2 = new URL(existing.website).hostname;
        if (domain1 === domain2) return true;
      }
      return false;
    });
  };

  return { findDuplicate };
};
```

#### 2.2b: Integration Points

**Files to Update:**

1. `pages/schools/new.vue` - After autocomplete selection or form submission
   - Call `findDuplicate()`
   - Show modal if duplicate found
   - Offer options: Cancel, Go to Existing, Add Anyway

2. `composables/useSchools.ts` - `createSchool()` action
   - Optional: Warn before insertion

**Modal Component:** `SchoolDuplicateWarning.vue`

```
┌─────────────────────────────────┐
│ School Already Added             │
├─────────────────────────────────┤
│ "Arizona State University" is    │
│ already on your list.            │
│                                  │
│ Current Status: interested       │
│ Added: Jan 20, 2026             │
│                                  │
│ [View Existing] [Add Anyway] [×] │
└─────────────────────────────────┘
```

---

### Task 2.3: Warning at 30+ Schools

#### 2.3a: Add Watcher/Alert

**File:** `pages/schools/index.vue`

**Implementation:**

```typescript
const { schools } = useSchools();

const schoolCount = computed(() => schools.value.length);

watch(schoolCount, (newCount) => {
  if (newCount >= 30) {
    showWarning = true;
  }
});
```

#### 2.3b: UI Components

**Update:** `pages/schools/index.vue`

**Options:**

1. **Inline Banner** (recommended)

   ```
   ⚠️ You have 30 schools on your list.
      Consider prioritizing with tiers A/B/C.
   ```

2. **Modal Alert** (on navigation to page)

3. **Toast Notification** (when count reaches 30)

**Threshold:** 30 schools (as per Story 3.1)

---

### Task 2.4: Fit Score Breakdown UI

#### 2.4a: Update Match Scoring

**File:** `composables/useSchoolMatching.ts`

**Current state:** Already calculates components

- Academic Fit (GPA-based)
- Athletic Fit (stats-based)
- Opportunity Fit (coach interest)
- Personal Fit (school-life fit)

**Change:** Ensure all 4 are returned with individual scores

```typescript
interface MatchBreakdown {
  academic: { score: number; reason: string }
  athletic: { score: number; reason: string }
  opportunity: { score: number; reason: string }
  personal: { score: number; reason: string }
  overall: number
}

calculateMatchBreakdown(school): MatchBreakdown {
  // Return all 4 components
}
```

#### 2.4b: Create Display Component

**New Component:** `SchoolFitScoreBreakdown.vue`

**Usage:**

```vue
<SchoolFitScoreBreakdown :school="school" :breakdown="matchBreakdown" />
```

**UI:**

```
┌─ Fit Score: 82 ─┐
├──────────────────┤
│ Academic Fit     │ 85
│ ████████░░░░░░   │ GPA above average
│
│ Athletic Fit     │ 80
│ ████████░░░░░░   │ Stats solid for position
│
│ Opportunity Fit  │ 78
│ ███████░░░░░░░░  │ Coach expressed interest
│
│ Personal Fit     │ 82
│ ████████░░░░░░   │ Good school-life fit
└──────────────────┘
```

#### 2.4c: Integration

**Files to Update:**

1. `pages/schools/[id]/index.vue` - Add breakdown view
2. `components/SchoolCard.vue` - Link to breakdown modal
3. Click handler: "View Fit Score Breakdown" → Modal with component

---

### Task 2.5: Automatic Fit Score Recalculation

#### 2.5a: Create Trigger System

**File:** `composables/useSchoolRecalculation.ts` (new)

**Approach:**

1. Watch athlete profile store for changes
2. On change, trigger recalculation for all schools
3. Update school match scores in store
4. Show notification

```typescript
export const useSchoolRecalculation = () => {
  const athleteStore = useAthleteStore()
  const schoolStore = useSchoolStore()

  watch(
    () => [athleteStore.athlete?.gpa, athleteStore.athlete?.stats, ...],
    async () => {
      // Recalculate all schools
      for (const school of schoolStore.schools) {
        const score = calculateMatchScore(school)
        // Store in computed/cache - don't mutate schools directly
      }
      showNotification('Fit scores updated')
    },
    { deep: true }
  )
}
```

#### 2.5b: Cache Strategy

**File:** `stores/schoolMatchCache.ts` (new)

Create a separate store for match scores:

```typescript
interface SchoolMatch {
  schoolId: string;
  score: number;
  breakdown: MatchBreakdown;
  calculatedAt: string;
}

state: {
  matches: Map<string, SchoolMatch>;
}
```

**Why:** Keep match calculation separate from school data, recalculate on demand

#### 2.5c: Hook Integration

**File:** `pages/athlete-profile.vue` (or similar)

- Import `useSchoolRecalculation()`
- Watches athlete profile changes
- Triggers recalculation
- Shows "Fit scores updated" notification

**Performance:** Recalculation should take <1s per school (verify)

---

## Phase 3: Enhancement Features (Priority 2)

### Task 3.1: Sorting by Distance, Fit Score, Contact Date

#### 3.1a: Update Store

**File:** `stores/schools.ts`

```typescript
interface SchoolSort {
  by: 'distance' | 'fitScore' | 'lastContact' | 'name' | 'ranking'
  order: 'asc' | 'desc'
}

state: {
  sort: SchoolSort = { by: 'name', order: 'asc' }
}

setSortBy(by: string, order: 'asc' | 'desc') {
  this.sort = { by: by as any, order }
}

getterSortedSchools() {
  let sorted = [...this.filteredSchools]

  switch (this.sort.by) {
    case 'distance':
      sorted.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      break
    case 'fitScore':
      sorted.sort((a, b) => (matchCache.get(b.id)?.score ?? 0) - (matchCache.get(a.id)?.score ?? 0))
      break
    case 'lastContact':
      sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      break
    // ... other cases
  }

  if (this.sort.order === 'desc') sorted.reverse()
  return sorted
}
```

#### 3.1b: UI Components

**Update:** `pages/schools/index.vue`

**Sort Control:**

```
[Sort By ▼]
├─ Distance (closest first)
├─ Fit Score (highest first)
├─ Last Contact (recent)
├─ Name (A-Z)
└─ Ranking (priority)

[Direction: ↓ ↑]
```

**Implementation:** Dropdown + toggle button for direction

---

### Task 3.2: Fit Score Range Filtering

#### 3.2a: Update Filters

**File:** `stores/schools.ts`

```typescript
interface SchoolFilters {
  fitScoreRange?: { min: number; max: number }; // 0-100
}
```

#### 3.2b: Filtering Logic

```typescript
getFilteredSchools() {
  return this.schools.filter(school => {
    const score = matchCache.get(school.id)?.score ?? 0
    if (this.filters.fitScoreRange) {
      if (score < this.filters.fitScoreRange.min || score > this.filters.fitScoreRange.max) {
        return false
      }
    }
    // ... other filters
    return true
  })
}
```

#### 3.2c: UI Component

**Update filter panel:**

```
Fit Score Range:
[0 ═════●───── 100]
Min: 0   Max: 100

Common presets:
[70-100] [60-80] [0-60]
```

---

### Task 3.3: Status Change History

#### 3.3a: Data Structure

**Add to School:**

```typescript
statusHistory?: Array<{
  status: string
  changedAt: string
  changedBy: string
}> | null
```

#### 3.3b: Store Updates

```typescript
async updateSchool(id, updates) {
  if (updates.status && updates.status !== currentSchool.status) {
    // Add to history
    const history = currentSchool.statusHistory ?? []
    history.push({
      status: updates.status,
      changedAt: new Date().toISOString(),
      changedBy: userId
    })
    updates.statusHistory = history
  }
  // ... rest of update
}
```

#### 3.3c: UI Timeline

**New Component:** `SchoolStatusTimeline.vue`

```
Status History:
─────────────────────
↓ Offer Received     Jan 23, 2026
  Changed by: Coach Johnson

↓ Recruited          Jan 15, 2026
  Changed by: System

↓ Contacted          Jan 10, 2026
  Changed by: You
─────────────────────
```

**Location:** School detail page sidebar or dedicated section

---

### Task 3.4: Character Limit Validation for Notes

#### 3.4a: Validator

**File:** `utils/validators/schoolValidation.ts`

```typescript
const MAX_SCHOOL_NOTES = 5000;

export const validateSchoolNotes = (notes: string) => {
  if (notes.length > MAX_SCHOOL_NOTES) {
    return {
      valid: false,
      error: `Notes must be ${MAX_SCHOOL_NOTES} characters or less (${notes.length} characters)`,
    };
  }
  return { valid: true };
};
```

#### 3.4b: UI Component

**Update:** `pages/schools/[id]/index.vue` notes section

```vue
<textarea v-model="notes" @input="validateNotes" maxlength="5000" />
<div class="text-sm text-gray-500">
  {{ notes.length }} / 5000 characters
  <span v-if="notes.length > 4500" class="text-amber-600">
    ⚠️ Approaching limit
  </span>
</div>
```

#### 3.4c: Store Validation

```typescript
async updateSchool(id, { notes, ...updates }) {
  if (notes) {
    const validation = validateSchoolNotes(notes)
    if (!validation.valid) throw new Error(validation.error)
  }
  // ... proceed with update
}
```

---

### Task 3.5: Edit History for Notes

#### 3.5a: Data Storage

```typescript
interface NoteEdit {
  content: string
  editedAt: string
  editedBy: string
}

// Add to School:
noteEdits?: NoteEdit[] | null
```

#### 3.5b: Store Logic

```typescript
async updateSchool(id, { notes, ...updates }) {
  if (notes && notes !== currentSchool.notes) {
    const edits = currentSchool.noteEdits ?? []
    edits.push({
      content: notes,
      editedAt: new Date().toISOString(),
      editedBy: userId
    })
    updates.noteEdits = edits
  }
  // ... proceed with update
}
```

#### 3.5c: UI Display

**Update:** School detail notes section

```
Notes
─────────────────────
Great campus, strong program...

Last updated: Jan 23, 2026
Previous versions: [1] [2] [3]

[Edit] [×]
```

**On click "Previous versions":** Show history modal

---

## Phase 4: Testing

### Unit Tests for New Features

#### 4.1: Priority Tier Tests

**File:** `tests/unit/stores/schools-priority.spec.ts` (new)

- Test setting priority tier
- Test filtering by priority tier
- Test independent priority/status
- Test priority tier in school data model

#### 4.2: Duplicate Detection Tests

**File:** `tests/unit/composables/useSchoolDuplication.spec.ts` (new)

- Test name matching (case-insensitive)
- Test NCAA ID matching
- Test domain matching
- Test no false positives

#### 4.3: Fit Score Tests

**File:** `tests/unit/composables/useSchoolMatching.spec.ts` (update)

- Test 4-component breakdown
- Test automatic recalculation trigger
- Test <1s recalculation time
- Test match cache updates

#### 4.4: Sorting & Filtering Tests

**File:** `tests/unit/stores/schools-sorting.spec.ts` (new)

- Test sort by distance
- Test sort by fit score
- Test sort by contact date
- Test sort order toggle
- Test fit score range filter

#### 4.5: Validation Tests

**File:** `tests/unit/utils/schoolValidation.spec.ts` (new)

- Test character limit (5000)
- Test validation messages
- Test edge cases (exactly 5000, 5001, etc.)

### E2E Tests for User Story Scenarios

#### 4.6: Story 3.1 E2E Tests

**File:** `tests/e2e/schools-add.spec.ts` (new)

```
- Add school from database
  ✓ Search NCAA database
  ✓ Select school
  ✓ Auto-populate info
  ✓ Verify completion <30s

- Add custom school
  ✓ Manual form entry
  ✓ Submit and save
  ✓ Appears in list

- Prevent duplicates
  ✓ Add school A
  ✓ Try to add school A again
  ✓ See duplicate warning
  ✓ Cancel duplicates
  ✓ Or proceed with warning

- Warning at 30+ schools
  ✓ Add schools until 30
  ✓ See warning banner
  ✓ Warning suggests priority tiers
```

#### 4.7: Story 3.2 E2E Tests

**File:** `tests/e2e/schools-fit-score.spec.ts` (new)

```
- View fit scores
  ✓ Fit score displays on list
  ✓ Fit score displays on detail

- View breakdown
  ✓ Click "View Breakdown"
  ✓ See 4 components
  ✓ See reason for each

- Automatic updates
  ✓ Update athlete profile
  ✓ Fit scores recalculate
  ✓ Notification shows
  ✓ <1s recalculation
```

#### 4.8: Story 3.3 E2E Tests

**File:** `tests/e2e/schools-filter-sort.spec.ts` (new)

```
- Filter by priority
  ✓ Set schools to A/B/C
  ✓ Filter by A shows only A
  ✓ Filter by B shows only B

- Filter by fit score
  ✓ Set fit score range 70-100
  ✓ Only matching schools display

- Sort by distance
  ✓ Sort closest first
  ✓ Verify order

- Sort by fit score
  ✓ Sort highest first
  ✓ Verify order

- Multiple filters
  ✓ Apply 3+ filters
  ✓ All work together
  ✓ <100ms load time
```

#### 4.9: Story 3.4 E2E Tests

**File:** `tests/e2e/schools-priority-status.spec.ts` (new)

```
- Set priority tier
  ✓ Open school detail
  ✓ Set to A/B/C
  ✓ Save and verify
  ✓ Changes independently of status

- Update status
  ✓ Cycle through statuses
  ✓ Timestamp recorded
  ✓ History shows all changes
  ✓ Timeline displays changes
```

#### 4.10: Story 3.5 E2E Tests

**File:** `tests/e2e/schools-notes.spec.ts` (new)

```
- Add notes
  ✓ Add notes to school
  ✓ Save <2s
  ✓ Display on detail page

- Character limit
  ✓ Type 5000 chars
  ✓ Can't type more
  ✓ Progress indicator shows

- Edit history
  ✓ Edit notes
  ✓ See "Last updated" date
  ✓ View previous versions
```

---

## Implementation Timeline & Dependencies

### Phase 1 (Database): 1-2 hours

- No testing dependencies
- Schema migration is prerequisite for all phases
- Must complete first

### Phase 2 (Core): 8-12 hours

- Depends on Phase 1
- Features can be implemented in parallel
- Higher impact/visibility features
- Enables most of Phase 3

### Phase 3 (Enhancement): 4-6 hours

- Mostly independent
- Some depend on Phase 2 components
- Lower priority but improves UX

### Phase 4 (Testing): 6-8 hours

- Can begin after Phase 1
- Unit tests before implementation helps with TDD
- E2E tests after all phases complete
- Total: 20+ hours integration/E2E time

---

## Risk Factors & Mitigation

| Risk                                | Likelihood | Impact | Mitigation                                    |
| ----------------------------------- | ---------- | ------ | --------------------------------------------- |
| Performance hit from recalculation  | Medium     | High   | Cache match scores, async recalc, limit scope |
| Duplicate detection false positives | Medium     | Medium | Thorough testing, adjustable algorithm        |
| DB migration issues                 | Low        | High   | Thorough testing, backup plan                 |
| Complex store/filter state          | Medium     | Medium | Keep state simple, use computed properties    |
| E2E test flakiness                  | Medium     | Medium | Use explicit waits, avoid timing deps         |

---

## Acceptance Criteria for Completion

**Story 3.1:** ✅

- [x] Add school from database
- [x] Add custom school
- [x] Auto-populate info
- [ ] Duplicate prevention with warning
- [ ] Warning at 30+ schools

**Story 3.2:** ⚠️

- [x] Fit scores display
- [ ] 4-component breakdown UI
- [ ] Auto-update on profile change
- [x] Honest assessment

**Story 3.3:** ⚠️

- [ ] Filter by priority tier
- [x] Filter by status
- [ ] Filter by fit score range
- [ ] Sort by distance/fit score/contact date
- [x] Multiple filters work

**Story 3.4:** ⚠️

- [ ] Priority tier system (A/B/C)
- [x] Track recruiting status
- [x] Timestamp changes
- [ ] Status change history
- [ ] Timeline view

**Story 3.5:** ⚠️

- [x] Add/edit notes
- [ ] 5000 char limit
- [x] Display on page
- [ ] Edit history
- [ ] (Coaching philosophy - lower priority)

---

## Notes for Implementation

1. **Maintain Backward Compatibility** - Old schools without new fields should still work
2. **Progressive Enhancement** - Features can be added incrementally
3. **Performance Testing** - Verify <30s school add, <1s recalc, <100ms filters
4. **User Communication** - Clear error messages and confirmations
5. **Accessibility** - Ensure new components are a11y compliant
