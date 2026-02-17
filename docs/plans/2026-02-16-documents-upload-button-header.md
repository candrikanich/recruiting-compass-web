# Documents Upload Button Header Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the upload button from below the view toggle to the PageHeader actions slot, matching the pattern used on Schools and Coaches pages.

**Architecture:** Simple UI refactoring moving button component from main content area to PageHeader's `#actions` template slot while preserving all existing behavior.

**Tech Stack:** Vue 3 Composition API, Nuxt 3, TailwindCSS, Heroicons

---

## Task 1: Add Upload Button to PageHeader Actions Slot

**Files:**
- Modify: `pages/documents/index.vue:3-4`

**Step 1: Add actions template slot to PageHeader**

Locate the PageHeader component (line 3) and add the `#actions` template slot:

```vue
<PageHeader title="Documents" description="Manage videos, transcripts, and other recruiting documents">
  <template #actions>
    <button
      @click="showUploadForm = !showUploadForm"
      class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
    >
      <PlusIcon class="w-4 h-4" />
      {{ showUploadForm ? "Hide Form" : "+ Add Document" }}
    </button>
  </template>
</PageHeader>
```

**Step 2: Verify PlusIcon is imported**

Check line 358 to confirm PlusIcon is already imported from `@heroicons/vue/24/outline`. If not present, add it to the import statement.

Expected import line:
```typescript
import { PlusIcon } from "@heroicons/vue/24/outline";
```

**Step 3: Test button appears in header**

Run: `npm run dev`
Navigate to: `http://localhost:3000/documents`
Expected: Button appears in upper-right corner of PageHeader

**Step 4: Commit**

```bash
git add pages/documents/index.vue
git commit -m "feat: add upload button to documents page header"
```

---

## Task 2: Remove Old Upload Button

**Files:**
- Modify: `pages/documents/index.vue:83-117`

**Step 1: Remove upload button from view toggle section**

Delete lines 110-117 (the upload button). The section should change from:

```vue
<!-- View Toggle & Upload Button -->
<div class="flex gap-4 mb-8">
  <div class="flex gap-2">
    <button @click="viewMode = 'grid'" ...>⊞ Grid</button>
    <button @click="viewMode = 'list'" ...>☰ List</button>
  </div>

  <!-- Upload Button -->
  <button
    @click="showUploadForm = !showUploadForm"
    class="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
  >
    {{ showUploadForm ? "Hide Form" : "+ Upload Document" }}
  </button>
</div>
```

To:

```vue
<!-- View Toggle -->
<div class="flex gap-2 mb-8">
  <button
    @click="viewMode = 'grid'"
    :class="[
      'px-3 py-2 rounded-lg text-sm font-medium transition',
      viewMode === 'grid'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ]"
  >
    ⊞ Grid
  </button>
  <button
    @click="viewMode = 'list'"
    :class="[
      'px-3 py-2 rounded-lg text-sm font-medium transition',
      viewMode === 'list'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ]"
  >
    ☰ List
  </button>
</div>
```

**Step 2: Test button removal**

Run: `npm run dev`
Navigate to: `http://localhost:3000/documents`
Expected:
- Upload button only appears in header (upper-right)
- View toggle buttons still work
- No duplicate upload button

**Step 3: Commit**

```bash
git add pages/documents/index.vue
git commit -m "refactor: remove duplicate upload button from view toggle section"
```

---

## Task 3: Remove Stale Test Reference

**Files:**
- Check: `pages/documents/index.vue:341`

**Step 1: Search for /documents/create reference**

Search the file for any references to `/documents/create` path:

```bash
grep -n "documents/create" pages/documents/index.vue
```

Expected: Line 341 contains a NuxtLink to `/documents/create`

**Step 2: Remove or update the stale reference**

If found at line 341, this is within the list view section and appears to be incorrect. The line should be removed as it references a non-existent route.

Locate and remove:
```vue
<NuxtLink
  to="/documents/create"
  data-testid="add-document-button"
  class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
>
  <PlusIcon class="w-5 h-5" />
  Add Document
</NuxtLink>
```

**Step 3: Verify no route exists**

Run: `find pages/documents -name "create.vue"`
Expected: No results (route doesn't exist)

**Step 4: Test after removal**

Run: `npm run dev`
Navigate to: `http://localhost:3000/documents`
Test:
- Switch to list view
- Verify no broken link appears
- Verify upload button in header still works

**Step 5: Commit**

```bash
git add pages/documents/index.vue
git commit -m "fix: remove stale reference to non-existent /documents/create route"
```

---

## Task 4: Verification and Testing

**Files:**
- Test: `pages/documents/index.vue`

**Step 1: Run type checking**

```bash
npm run type-check
```

Expected: No TypeScript errors

**Step 2: Run linter**

```bash
npm run lint
```

Expected: No linting errors

**Step 3: Manual browser testing**

Run: `npm run dev`

Test cases:
1. Navigate to `/documents`
2. Verify "+ Add Document" button appears in header (upper-right)
3. Click button → form should appear
4. Button text should change to "Hide Form"
5. Click button again → form should hide
6. Button text should change back to "+ Add Document"
7. Test Grid/List toggle still works
8. Verify no duplicate buttons exist
9. Test on mobile viewport (responsive behavior)

**Step 4: Visual comparison with other pages**

Compare with:
- `/schools` - check button styling matches
- `/coaches` - check button positioning matches

Expected: Consistent styling and positioning across all three pages

**Step 5: Commit verification notes**

```bash
git add docs/plans/2026-02-16-documents-upload-button-header.md
git commit -m "docs: add verification results to implementation plan"
```

---

## Task 5: Update Tests (If Applicable)

**Files:**
- Check: `tests/e2e/**/*.spec.ts` for document upload tests

**Step 1: Search for existing E2E tests**

```bash
find tests -name "*document*" -type f
grep -r "add-document-button" tests/ || echo "No test found"
```

**Step 2: Update test selectors if needed**

If tests exist that reference the old button location or use `data-testid="add-document-button"`, update them to target the new header button.

Example update (if test exists):
```typescript
// Old
await page.click('[data-testid="add-document-button"]');

// New - target button in header
await page.getByRole('button', { name: /add document/i }).click();
```

**Step 3: Run E2E tests**

```bash
npm run test:e2e
```

Expected: All tests pass

**Step 4: Commit test updates**

```bash
git add tests/
git commit -m "test: update document upload test selectors for new button location"
```

---

## Final Checklist

- [ ] Upload button appears in PageHeader actions slot
- [ ] Button styling matches Schools and Coaches pages
- [ ] Button text toggles between "+ Add Document" and "Hide Form"
- [ ] Old button removed from view toggle section
- [ ] Form toggle behavior preserved
- [ ] No duplicate buttons
- [ ] No broken references to `/documents/create`
- [ ] Type checking passes
- [ ] Linter passes
- [ ] Manual testing complete
- [ ] Visual consistency verified
- [ ] Tests updated (if applicable)
- [ ] All commits follow conventional commit format

---

## Rollback Plan

If issues arise:

```bash
git log --oneline -5
git revert <commit-hash>
```

Or reset to before changes:

```bash
git reset --hard HEAD~5
```
