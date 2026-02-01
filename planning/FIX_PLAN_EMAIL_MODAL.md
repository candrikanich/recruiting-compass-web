# Fix Plan: EmailRecruitingPacketModal Component Tests

**Category:** CRITICAL
**Failures:** 28/30 tests
**Root Cause:** Vue Teleport + Transition incompatibility with Vue Test Utils happy-dom environment

---

## Problem Analysis

The `EmailRecruitingPacketModal` component uses `<Teleport to="body">` wrapped in `<Transition>`:

```vue
<Teleport to="body">
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 ...">
      <!-- Modal content -->
    </div>
  </Transition>
</Teleport>
```

**Why tests fail:**

- Teleport renders DOM outside the component tree (into document.body)
- Vue Test Utils' happy-dom environment doesn't support full Teleport behavior
- Tests mount component in isolated wrapper, can't access teleported DOM
- `wrapper.find(".fixed")` searches wrapper scope only, not body
- Transition component timing may require async handling

**Current test status:**

- ✗ Rendering tests fail
- ✗ Coach selection tests fail (checkboxes not found)
- ✗ Manual email tests fail (textarea not found)
- ✗ Input/button tests fail (elements not found)
- ✓ "Should not render when isOpen=false" passes (v-if prevents render)
- ✓ "Should disable send button when invalid" may partially pass (vm property accessible)

---

## Solution Strategy

**Option A: Mock Teleport + Test Component Logic (RECOMMENDED)**

- Override Teleport to render inline (no actual teleport in tests)
- Focus tests on component logic and props/emits
- Use unit test approach (test behavior, not full rendering)
- **Pros:** Fast, reliable, aligns with unit testing principles
- **Cons:** Doesn't test actual Teleport behavior

**Option B: Attach to Real DOM + Async Handling**

- Use `attachTo` mount option to attach to real DOM element
- Use `flushPromises()` to wait for Transition
- Query document.body directly in tests
- **Pros:** Tests actual Teleport behavior
- **Cons:** Slower, more complex setup, integration test approach

**Option C: Refactor Component to Remove Teleport (NOT RECOMMENDED)**

- Move modal content outside Teleport
- Test rendering normally
- **Pros:** Simpler tests
- **Cons:** May break modal functionality (escape key, focus management)

---

## Recommended Implementation Path: Option A

### Phase 1: Setup Test Configuration

**File:** `tests/unit/components/EmailRecruitingPacketModal.spec.ts`

**Change 1: Add Teleport mock at top of test file**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import EmailRecruitingPacketModal from "~/components/EmailRecruitingPacketModal.vue";

// Mock Teleport to render inline (bypass teleport-to-body)
vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    Teleport: defineComponent({
      name: "Teleport",
      props: {
        to: String,
      },
      setup(_, { slots }) {
        // Render slots inline instead of teleporting
        return () => slots.default?.();
      },
    }),
  };
});
```

**Why:** Intercepts Vue's Teleport and replaces it with a pass-through component that renders children inline in the component tree.

**Rationale:**

- Teleport behavior isn't essential to unit test
- We're testing modal state management, not DOM placement
- Mocking removes the happy-dom incompatibility
- Tests become deterministic and fast

---

### Phase 2: Update Test Assertions

**File:** `tests/unit/components/EmailRecruitingPacketModal.spec.ts`

**Tests to update:**

1. **"should render modal when isOpen is true"**
   - Location: Line ~42
   - Current: `expect(wrapper.find(".fixed").exists()).toBe(true)`
   - Updated: `expect(wrapper.vm.isOpen).toBe(true)` and `expect(wrapper.find(".fixed").exists()).toBe(true)` (now works with mocked Teleport)

2. **"should display modal title"**
   - Location: Line ~47
   - Current: Queries for text "Email Recruiting Packet"
   - Updated: Should now work because `.fixed` div is in component tree
   - No code change needed - just verify it passes

3. **"should not render modal when isOpen is false"**
   - Location: Line ~52
   - Should still pass unchanged
   - Verify v-if blocks rendering

4. **All coach selection tests**
   - Location: Lines ~60-80
   - Checkboxes should now be findable: `wrapper.find('input[type="checkbox"]')`
   - No changes needed - assertions should pass after Teleport mock

5. **Email textarea tests**
   - Location: Lines ~90-110
   - Textarea should be findable: `wrapper.find('textarea')`
   - Manual email input tests should now work

6. **Subject/body input tests**
   - Location: Lines ~120-140
   - Inputs should be findable: `wrapper.find('input[placeholder="Subject"]')`
   - No changes needed

---

### Phase 3: Handle Transition Timing (if needed)

**File:** `tests/unit/components/EmailRecruitingPacketModal.spec.ts`

**Problem:** Transition component may have timing delays

**Solution:**

```typescript
import { flushPromises } from "@vue/test-utils";

describe("EmailRecruitingPacketModal", () => {
  // ... existing setup ...

  it("should render modal when isOpen is true", async () => {
    // Set prop
    await wrapper.setProps({ isOpen: true });
    // Flush any pending async operations
    await flushPromises();
    // Flush Vue nextTick
    await wrapper.vm.$nextTick();

    // Now assertions should work
    expect(wrapper.find(".fixed").exists()).toBe(true);
  });
});
```

**Apply to all tests that check for rendered elements after prop/state changes.**

---

### Phase 4: Verify Mock Doesn't Break Production

**Verification checklist:**

- [ ] Original component still has `<Teleport to="body">` (no changes to component)
- [ ] Mock only affects test files, not production build
- [ ] `vi.mock()` is scoped to test file only
- [ ] Production CSS transitions still work (not affected by mock)

---

## Implementation Checklist

- [ ] Add Teleport mock to test file
- [ ] Run tests to see which now pass
- [ ] Update assertions that need adjustments (likely minimal)
- [ ] Add `flushPromises()` calls where needed
- [ ] Verify all 30 tests pass
- [ ] Run full test suite to confirm no regressions
- [ ] Commit changes

---

## Expected Outcomes

**Before:** 28 failures, 2 passes
**After:** 30 passes (all tests)

**Performance:** Tests should run ~20-50ms per test (very fast)

**Coverage:** Tests now reliably check:

- ✓ Modal visibility based on `isOpen` prop
- ✓ Coach selection logic
- ✓ Manual email entry
- ✓ Subject/body input
- ✓ Form validation
- ✓ Send/close button behavior
- ✓ Emit events

---

## Unresolved Questions

1. Are there other tests that use Teleport that might need the same mock?
2. Should we create a global Teleport mock in `tests/setup.ts` instead of per-file?
3. Do we need to test actual Teleport behavior (e.g., escape key handling, focus trapping)?
   - If yes, consider adding an E2E test instead of unit test

---

## Risk Assessment

**Low Risk:**

- Change is test-only, no production code modified
- Mock is a pass-through, preserves component behavior semantically
- If modal doesn't work in browser, it's a separate issue (not caused by test changes)

**Potential Issues:**

- If component relies on actual Teleport positioning for functionality, we won't catch bugs
  - Mitigation: Add E2E tests to verify modal displays correctly in browser
  - Check browser console for errors when modal opens

---

## Alternative: Add E2E Coverage

If we want to verify Teleport works in production, add E2E test:

```typescript
// tests/e2e/email-modal.spec.ts
import { test, expect } from "@playwright/test";

test("Email modal displays correctly", async ({ page }) => {
  await page.goto("/some-page-with-modal");
  await page.click('[data-testid="open-email-modal"]');

  // Query document.body (not component wrapper)
  const modal = await page.locator(".fixed");
  await expect(modal).toBeVisible();

  // Type email
  await page.fill('textarea[placeholder="Email body"]', "test");
  await expect(page.locator('button:has-text("Send")')).toBeEnabled();
});
```

This provides production-grade verification while keeping unit tests fast.
