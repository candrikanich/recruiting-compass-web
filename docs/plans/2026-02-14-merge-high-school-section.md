# Merge High School Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate high school information by merging the standalone "Current High School" section into the "Basic Info" section of the player profile page.

**Architecture:** Single-file modification to `/pages/settings/player-details.vue`. Remove duplicate "High School" field from Basic Info, add 4 detailed school fields (Name, Address, City, State) to the existing grid, and delete the standalone "Current High School" section entirely.

**Tech Stack:** Vue 3 (Composition API), TypeScript, TailwindCSS, Vitest

---

## Task 1: Update Basic Info Section Template

**Files:**
- Modify: `/pages/settings/player-details.vue:114-141`

**Step 1: Remove old "High School" field**

Remove lines 114-126 (the simple "High School" text input field):

```vue
<!-- DELETE THIS BLOCK (lines 114-126) -->
<div>
  <label class="block text-sm font-medium text-gray-700 mb-2"
    >High School</label
  >
  <input
    v-model="form.high_school"
    :disabled="isParentRole"
    type="text"
    placeholder="e.g., Lincoln High School"
    @blur="triggerSave"
    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
  />
</div>
```

**Step 2: Add detailed school fields to Basic Info grid**

After the Graduation Year field and before Club/Travel Team, add 4 new fields:

Location: After line 112 (closing `</div>` of Graduation Year)
Insert:

```vue
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >School Name</label
              >
              <input
                v-model="form.school_name"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., Lincoln High School"
                @blur="triggerSave"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >School City</label
              >
              <input
                v-model="form.school_city"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., Atlanta"
                @blur="triggerSave"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >School State</label
              >
              <input
                v-model="form.school_state"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., GA"
                maxlength="2"
                @blur="triggerSave"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >School Address</label
              >
              <input
                v-model="form.school_address"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., 123 Main St"
                @blur="triggerSave"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
```

**Step 3: Verify grid layout**

Check that the grid now has 6 fields in this order:
1. Graduation Year
2. School Name
3. School City
4. School State
5. School Address
6. Club/Travel Team

**Step 4: Commit Basic Info changes**

```bash
git add pages/settings/player-details.vue
git commit -m "refactor: add detailed school fields to Basic Info section"
```

---

## Task 2: Remove Standalone "Current High School" Section

**Files:**
- Modify: `/pages/settings/player-details.vue:630-690`

**Step 1: Delete the entire "Current High School" section**

Remove lines 630-690 (the entire standalone section including the wrapper div):

```vue
<!-- DELETE THIS ENTIRE SECTION (lines 630-690) -->
<!-- School Information -->
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
  <h2 class="text-xl font-bold text-gray-900 mb-6">
    Current High School
  </h2>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- All 4 school fields -->
  </div>
</div>
```

**Step 2: Verify no orphaned references**

Search for any remaining references to the old section:

```bash
grep -n "Current High School" pages/settings/player-details.vue
```

Expected: No matches found

**Step 3: Check TypeScript compilation**

```bash
npm run type-check
```

Expected: No errors

**Step 4: Commit section removal**

```bash
git add pages/settings/player-details.vue
git commit -m "refactor: remove standalone Current High School section"
```

---

## Task 3: Update Tests (if any exist)

**Files:**
- Search: `**/*.spec.ts`, `**/*.test.ts` for player-details tests

**Step 1: Search for existing tests**

```bash
find . -name "*player-details*.spec.ts" -o -name "*player-details*.test.ts"
```

**Step 2: If tests exist, update field references**

Replace any references to:
- Old "High School" field → "School Name" field
- References to "Current High School" section → "Basic Info" section

**Step 3: Run tests**

```bash
npm run test
```

Expected: All tests pass

**Step 4: Commit test updates (if any)**

```bash
git add tests/
git commit -m "test: update player-details tests for merged sections"
```

---

## Task 4: Manual Browser Testing

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Navigate to player details page**

URL: `http://localhost:3000/settings/player-details`

**Step 3: Verify Basic Info section**

Check that Basic Info section now contains (in order):
- ✅ Graduation Year (dropdown)
- ✅ School Name (text input)
- ✅ School City (text input)
- ✅ School State (text input, uppercase)
- ✅ School Address (text input)
- ✅ Club/Travel Team (text input)

**Step 4: Verify "Current High School" section is gone**

Scroll through the entire page and confirm:
- ✅ No standalone "Current High School" section exists
- ✅ Page flows from Contact Information → High School Team Levels

**Step 5: Test auto-save functionality**

For each new school field:
1. Enter test data
2. Blur the field
3. Check browser console/network tab for save request
4. ✅ Confirm auto-save triggered

**Step 6: Test parent role view (if applicable)**

1. Switch to parent role account (or simulate with dev tools)
2. ✅ Verify all school fields are disabled
3. ✅ Verify read-only banner shows

**Step 7: Test form submission**

1. Fill in all school fields
2. Click "Save Player Details"
3. ✅ Confirm success toast appears
4. Reload page
5. ✅ Verify school data persists

---

## Task 5: Final Verification & Documentation

**Step 1: Run full test suite**

```bash
npm run test
npm run type-check
npm run lint
```

Expected: All pass

**Step 2: Check git status**

```bash
git status
```

Expected: Clean working directory (all changes committed)

**Step 3: Review commit history**

```bash
git log --oneline -5
```

Expected commits:
- `refactor: remove standalone Current High School section`
- `refactor: add detailed school fields to Basic Info section`
- (optional) `test: update player-details tests for merged sections`

**Step 4: Update CLAUDE.local.md**

Add completion note:

```markdown
## Completed

- Merged "Current High School" section into "Basic Info" section
- Files modified: pages/settings/player-details.vue
- Tests updated (if applicable)
- Manual browser testing: ✅ PASS
```

**Step 5: Final commit**

```bash
git add CLAUDE.local.md
git commit -m "docs: mark high school section merge as complete"
```

---

## Rollback Plan

If issues arise:

```bash
# Revert to before changes
git log --oneline  # Find commit hash before first change
git revert <hash>  # Or git reset --hard <hash> if not pushed
```

---

## Success Criteria

- ✅ Basic Info section contains 6 fields (including 4 school fields)
- ✅ "Current High School" standalone section completely removed
- ✅ Auto-save works on all new fields
- ✅ Parent role sees all fields as disabled
- ✅ Form submission includes all school data
- ✅ No TypeScript errors
- ✅ All tests pass
- ✅ Clean git history with descriptive commits
