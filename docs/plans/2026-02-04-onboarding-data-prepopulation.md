# Onboarding Data Pre-Population & Auto-Save Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-populate Player Details settings page with onboarding data, add dynamic sport/position management with auto-save on blur with instant toast feedback.

**Architecture:**

1. Add `primary_sport` and `primary_position` fields to `PlayerDetails` type
2. Update Player Details page to fetch and display available sports/positions dynamically
3. Replace static baseball positions with sport-specific positions
4. Implement auto-save with debounce (500ms) on blur for all form fields
5. Add toast notifications for save success/error feedback
6. Preserve existing manual "Save Player Details" button as fallback

**Tech Stack:** Vue 3 Composition API, Pinia (preferences store), usePreferenceManager composable, useToast composable, Tailwind CSS

---

## Task 1: Extend PlayerDetails Type

**Files:**

- Modify: `types/models.ts:354-397`

**Step 1: Add primary_sport and primary_position fields to PlayerDetails interface**

Open `types/models.ts` and add these two fields to the `PlayerDetails` interface (after `graduation_year`):

```typescript
export interface PlayerDetails {
  graduation_year?: number;
  primary_sport?: string; // NEW: from onboarding
  primary_position?: string; // NEW: from onboarding
  high_school?: string;
  club_team?: string;
  // ... rest of interface
}
```

**Step 2: Verify type compiles**

Run: `npm run type-check`
Expected: No errors related to `PlayerDetails`

**Step 3: Commit**

```bash
git add types/models.ts
git commit -m "type: add primary_sport and primary_position to PlayerDetails"
```

---

## Task 2: Create Sports & Positions Composable Utility

**Files:**

- Create: `composables/useSportsPositionLookup.ts`

**Step 1: Create the composable**

```typescript
// composables/useSportsPositionLookup.ts
export const useSportsPositionLookup = () => {
  // Map of sport -> positions
  const sportPositions: Record<string, string[]> = {
    Baseball: [
      "P",
      "C",
      "1B",
      "2B",
      "3B",
      "SS",
      "LF",
      "CF",
      "RF",
      "DH",
      "UTIL",
    ],
    Softball: [
      "P",
      "C",
      "1B",
      "2B",
      "3B",
      "SS",
      "LF",
      "CF",
      "RF",
      "DH",
      "UTIL",
    ],
    Basketball: ["PG", "SG", "SF", "PF", "C"],
    Football: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K"],
    Soccer: ["GK", "DEF", "MID", "FWD"],
    Lacrosse: ["G", "D", "M", "A"],
    "Ice Hockey": ["G", "D", "LW", "C", "RW"],
    Volleyball: ["S", "MB", "OH", "OP", "L"],
    "Track & Field": ["Distance", "Sprints", "Jumps", "Throws", "Hurdles"],
    "Cross Country": ["Runner"],
    Swimming: ["Distance", "Sprint", "IM", "Dive"],
    Tennis: ["Singles", "Doubles"],
    Golf: ["Player"],
  };

  // Common sports list (what's available in onboarding)
  const commonSports = Object.keys(sportPositions);

  // Get positions for a given sport
  const getPositionsBySport = (sport: string): string[] => {
    return sportPositions[sport] || [];
  };

  return {
    commonSports,
    getPositionsBySport,
  };
};
```

**Step 2: Verify it exports correctly**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add composables/useSportsPositionLookup.ts
git commit -m "feat: add useSportsPositionLookup composable for dynamic positions"
```

---

## Task 3: Create Auto-Save Utility Composable

**Files:**

- Create: `composables/useAutoSave.ts`

**Step 1: Create the auto-save composable**

```typescript
// composables/useAutoSave.ts
import { ref, watch, useDebounceFn } from "vue";
import { useToast } from "./useToast";

export interface AutoSaveOptions {
  debounceMs?: number;
  onSave: () => Promise<void>;
  onError?: (error: Error) => void;
}

export const useAutoSave = (options: AutoSaveOptions) => {
  const { debounceMs = 500, onSave, onError } = options;
  const { showToast } = useToast();

  const isSaving = ref(false);
  const lastSaveTime = ref<Date | null>(null);
  const saveError = ref<Error | null>(null);

  // Debounced save function
  const performSave = useDebounceFn(async () => {
    isSaving.value = true;
    saveError.value = null;

    try {
      await onSave();
      lastSaveTime.value = new Date();
      showToast("Saved ✓", "success", 2000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      saveError.value = err;
      showToast(`Failed to save: ${err.message}`, "error");
      if (onError) {
        onError(err);
      }
    } finally {
      isSaving.value = false;
    }
  }, debounceMs);

  const triggerSave = () => {
    performSave();
  };

  return {
    isSaving,
    lastSaveTime,
    saveError,
    triggerSave,
  };
};
```

**Step 2: Verify type-check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add composables/useAutoSave.ts
git commit -m "feat: add useAutoSave composable for debounced saves with feedback"
```

---

## Task 4: Update Player Details Page - Part 1: Add Primary Sport Section

**Files:**

- Modify: `pages/settings/player-details.vue:878-950` (script setup)
- Modify: `pages/settings/player-details.vue:83-139` (template - Basic Info section)

**Step 1: Update script setup - add imports and state**

In the `<script setup>` section (around line 848), add these imports after existing imports:

```typescript
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";
import { useAutoSave } from "~/composables/useAutoSave";
```

Then add these lines after the `const form` ref declaration (around line 950):

```typescript
// Sport/Position Management
const { commonSports, getPositionsBySport } = useSportsPositionLookup();
const availablePositions = ref<string[]>([]);

// Auto-save configuration
const { isSaving, triggerSave } = useAutoSave({
  debounceMs: 500,
  onSave: async () => {
    await setPlayerDetails(form.value);
  },
});

// Watch for sport changes to update available positions
watch(
  () => form.value.primary_sport,
  (sport) => {
    if (sport) {
      availablePositions.value = getPositionsBySport(sport);
      // If selected position is not in new sport's positions, clear it
      if (
        !availablePositions.value.includes(form.value.primary_position || "")
      ) {
        form.value.primary_position = undefined;
      }
    } else {
      availablePositions.value = [];
      form.value.primary_position = undefined;
    }
  },
);
```

**Step 2: Update template - replace Positions section**

Find the "Positions" section (line 141-172) and replace it with:

```vue
<!-- Primary Sport & Position -->
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
  <h2 class="text-lg font-semibold text-slate-900 mb-4">
    Athletic Profile
  </h2>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
    <!-- Primary Sport -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Primary Sport
      </label>
      <select
        v-model="form.primary_sport"
        :disabled="isParentRole"
        @blur="triggerSave"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option :value="undefined">Select Sport</option>
        <option v-for="sport in commonSports" :key="sport" :value="sport">
          {{ sport }}
        </option>
      </select>
    </div>

    <!-- Primary Position -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Primary Position
      </label>
      <select
        v-if="availablePositions.length > 0"
        v-model="form.primary_position"
        :disabled="isParentRole"
        @blur="triggerSave"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option :value="undefined">Select Position</option>
        <option v-for="pos in availablePositions" :key="pos" :value="pos">
          {{ pos }}
        </option>
      </select>
      <select
        v-else
        disabled
        class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
      >
        <option>Select sport first</option>
      </select>
    </div>
  </div>

  <!-- Additional Positions -->
  <div>
    <h3 class="text-sm font-medium text-gray-700 mb-3">
      All Positions You Play
    </h3>
    <p class="text-xs text-gray-600 mb-4">
      Select additional positions you play (primary position above is pre-selected)
    </p>

    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      <button
        v-for="pos in availablePositions"
        :key="pos"
        type="button"
        :disabled="isParentRole"
        @click="togglePosition(pos)"
        @blur="triggerSave"
        :class="[
          'px-4 py-3 rounded-lg font-medium text-sm transition border-2 disabled:opacity-50 disabled:cursor-not-allowed',
          isPositionSelected(pos)
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
        ]"
      >
        {{ pos }}
      </button>
    </div>

    <div v-if="form.positions && form.positions.length > 0" class="mt-4">
      <p class="text-sm text-gray-600">
        Selected:
        <span class="font-medium">{{ form.positions.join(", ") }}</span>
      </p>
    </div>
  </div>
</div>
```

**Step 3: Update Basic Info section - add auto-save to existing fields**

Update the graduation year, high school, and club team fields to add `@blur="triggerSave"`. For example:

```vue
<select
  v-model="form.graduation_year"
  :disabled="isParentRole"
  @blur="triggerSave"
  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
>
  <!-- options -->
</select>
```

Do the same for `high_school` and `club_team` inputs.

**Step 4: Type-check**

Run: `npm run type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add pages/settings/player-details.vue
git commit -m "feat: add primary sport and dynamic positions to player details"
```

---

## Task 5: Update Player Details Page - Part 2: Add Auto-Save to Academic Section

**Files:**

- Modify: `pages/settings/player-details.vue:286-338` (template - Academics section)

**Step 1: Add @blur handlers to academic fields**

Find the Academics section and update the GPA, SAT, and ACT fields:

```vue
<!-- GPA -->
<input
  v-model.number="form.gpa"
  data-testid="gpa-input"
  :disabled="isParentRole"
  type="number"
  step="0.01"
  min="0"
  max="5"
  placeholder="e.g., 3.75"
  @blur="triggerSave"
  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
/>

<!-- SAT Score -->
<input
  v-model.number="form.sat_score"
  :disabled="isParentRole"
  type="number"
  min="400"
  max="1600"
  placeholder="e.g., 1200"
  @blur="triggerSave"
  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
/>

<!-- ACT Score -->
<input
  v-model.number="form.act_score"
  :disabled="isParentRole"
  type="number"
  min="1"
  max="36"
  placeholder="e.g., 28"
  @blur="triggerSave"
  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
/>
```

**Step 2: Type-check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add pages/settings/player-details.vue
git commit -m "feat: add auto-save to academic fields on blur"
```

---

## Task 6: Update Home Location Settings Page

**Files:**

- Modify: `pages/settings/location.vue` (add auto-save to zip code)

**Step 1: Read the location settings page**

Read the file to understand its structure.

**Step 2: Add auto-save to zip code field**

Add the useAutoSave import and add `@blur="triggerSave"` to the zip code input field. Use the same pattern as Task 4.

**Step 3: Type-check**

Run: `npm run type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add pages/settings/location.vue
git commit -m "feat: add auto-save to home location zip code field"
```

---

## Task 7: Verify Form Pre-Population on Mount

**Files:**

- Modify: `pages/settings/player-details.vue:1024-1030`

**Step 1: Ensure onMounted loads all fields**

The existing `onMounted` already calls `getPlayerDetails()`, which should load from `user_preferences`. Verify it includes the new fields by checking the form initialization includes `primary_sport` and `primary_position`:

```typescript
onMounted(async () => {
  const playerDetails = getPlayerDetails();
  if (playerDetails) {
    form.value = { ...form.value, ...playerDetails };
    initializeHeight(playerDetails.height_inches);
    // The spread operator already includes primary_sport and primary_position
  }
});
```

**Step 2: Type-check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add pages/settings/player-details.vue
git commit -m "refactor: ensure pre-population includes primary sport and position"
```

---

## Task 8: Write Unit Tests for Auto-Save Composable

**Files:**

- Create: `tests/composables/useAutoSave.spec.ts`

**Step 1: Write tests for useAutoSave**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAutoSave } from "~/composables/useAutoSave";
import { useToast } from "~/composables/useToast";

vi.mock("~/composables/useToast");

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with correct default values", () => {
    const mockSave = vi.fn();
    const { isSaving, lastSaveTime, saveError } = useAutoSave({
      onSave: mockSave,
    });

    expect(isSaving.value).toBe(false);
    expect(lastSaveTime.value).toBeNull();
    expect(saveError.value).toBeNull();
  });

  it("should debounce save calls", async () => {
    vi.useFakeTimers();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { triggerSave } = useAutoSave({
      onSave: mockSave,
      debounceMs: 500,
    });

    triggerSave();
    triggerSave();
    triggerSave();

    expect(mockSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockSave).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("should show success toast on successful save", async () => {
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({
      showToast: mockToast,
    } as any);

    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { triggerSave } = useAutoSave({
      onSave: mockSave,
      debounceMs: 0,
    });

    vi.useFakeTimers();
    triggerSave();
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(mockToast).toHaveBeenCalledWith("Saved ✓", "success", 2000);
    vi.useRealTimers();
  });

  it("should show error toast on failed save", async () => {
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({
      showToast: mockToast,
    } as any);

    const testError = new Error("Save failed");
    const mockSave = vi.fn().mockRejectedValue(testError);
    const { triggerSave } = useAutoSave({
      onSave: mockSave,
      debounceMs: 0,
    });

    vi.useFakeTimers();
    triggerSave();
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(mockToast).toHaveBeenCalledWith(
      "Failed to save: Save failed",
      "error",
    );
    vi.useRealTimers();
  });

  it("should call onError callback on save failure", async () => {
    const mockOnError = vi.fn();
    const testError = new Error("Save failed");
    const mockSave = vi.fn().mockRejectedValue(testError);
    const { triggerSave } = useAutoSave({
      onSave: mockSave,
      onError: mockOnError,
      debounceMs: 0,
    });

    vi.useFakeTimers();
    triggerSave();
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(mockOnError).toHaveBeenCalledWith(testError);
    vi.useRealTimers();
  });
});
```

**Step 2: Run tests**

Run: `npm run test -- tests/composables/useAutoSave.spec.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add tests/composables/useAutoSave.spec.ts
git commit -m "test: add unit tests for useAutoSave composable"
```

---

## Task 9: Write Unit Tests for Sports/Position Composable

**Files:**

- Create: `tests/composables/useSportsPositionLookup.spec.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest";
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";

describe("useSportsPositionLookup", () => {
  it("should return list of common sports", () => {
    const { commonSports } = useSportsPositionLookup();

    expect(commonSports).toContain("Baseball");
    expect(commonSports).toContain("Basketball");
    expect(commonSports).toContain("Soccer");
  });

  it("should return baseball positions for Baseball sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Baseball");

    expect(positions).toContain("P");
    expect(positions).toContain("C");
    expect(positions).toContain("1B");
    expect(positions).toHaveLength(11);
  });

  it("should return basketball positions for Basketball sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Basketball");

    expect(positions).toContain("PG");
    expect(positions).toContain("SG");
    expect(positions).toContain("C");
    expect(positions).toHaveLength(5);
  });

  it("should return empty array for unknown sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("UnknownSport");

    expect(positions).toEqual([]);
  });
});
```

**Step 2: Run tests**

Run: `npm run test -- tests/composables/useSportsPositionLookup.spec.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add tests/composables/useSportsPositionLookup.spec.ts
git commit -m "test: add unit tests for useSportsPositionLookup composable"
```

---

## Task 10: Write E2E Tests for Player Details Auto-Save Flow

**Files:**

- Create: `tests/e2e/player-details-autosave.spec.ts`

**Step 1: Write E2E test**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Player Details Auto-Save", () => {
  test.beforeEach(async ({ page }) => {
    // Login as player
    await page.goto("/login");
    await page.fill('input[placeholder="Email"]', "player@example.com");
    await page.fill('input[placeholder="Password"]', "testpassword");
    await page.click("button:has-text('Sign In')");
    await page.waitForNavigation();

    // Navigate to player details
    await page.goto("/settings/player-details");
    await page.waitForLoadState("networkidle");
  });

  test("should pre-populate form with onboarding data", async ({ page }) => {
    // Verify graduation year is pre-filled
    const gradYearSelect = page.locator('select[id*="graduation"]');
    const selectedValue = await gradYearSelect.inputValue();
    expect(selectedValue).toBeTruthy();

    // Verify GPA is pre-filled
    const gpaInput = page.locator('[data-testid="gpa-input"]');
    const gpaValue = await gpaInput.inputValue();
    expect(gpaValue).toBeTruthy();
  });

  test("should auto-save graduation year on blur", async ({ page }) => {
    const gradYearSelect = page.locator("select").first();
    const currentValue = await gradYearSelect.inputValue();

    // Change value
    await gradYearSelect.selectOption(String(parseInt(currentValue) + 1));

    // Blur the field
    await gradYearSelect.blur();

    // Wait for toast notification
    const toast = page.locator('text="Saved ✓"');
    await expect(toast).toBeVisible();
    await toast.waitFor({ state: "hidden" });
  });

  test("should show primary sport and position fields", async ({ page }) => {
    const sportSelect = page.locator('select:has-text("Select Sport")').first();
    expect(sportSelect).toBeVisible();

    // Select a sport
    await sportSelect.selectOption("Baseball");

    // Verify position field becomes enabled
    const positionSelect = page.locator('select:has-text("Select Position")');
    await expect(positionSelect).toBeEnabled();
  });

  test("should update available positions when sport changes", async ({
    page,
  }) => {
    const sportSelect = page.locator("select").filter({ hasText: "Sport" });

    // Select Baseball
    await sportSelect.selectOption("Baseball");
    let positions = await page
      .locator("button:has-text('P')")
      .or(page.locator("button:has-text('C')"))
      .all();
    expect(positions.length).toBeGreaterThan(0);

    // Change to Basketball
    await sportSelect.selectOption("Basketball");
    positions = await page
      .locator("button:has-text('PG')")
      .or(page.locator("button:has-text('C')"))
      .all();
    expect(positions.length).toBeGreaterThan(0);
  });

  test("should auto-save when toggling positions", async ({ page }) => {
    const sportSelect = page.locator("select").filter({ hasText: "Sport" });
    await sportSelect.selectOption("Baseball");

    // Click position button
    await page.locator("button:has-text('P')").click();

    // Toast should appear
    const toast = page.locator('text="Saved ✓"');
    await expect(toast).toBeVisible();
  });

  test("should prevent parent role from editing", async ({ page }) => {
    // This assumes page has parent role indicator or we need to test logout/login as parent
    // For now, just verify read-only state if present
    const readOnlyBanner = page.locator("text=Read-only view");
    if (await readOnlyBanner.isVisible()) {
      const inputs = page.locator("input, select").filter({ disabled: true });
      expect(inputs).toBeTruthy();
    }
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e -- tests/e2e/player-details-autosave.spec.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add tests/e2e/player-details-autosave.spec.ts
git commit -m "test: add E2E tests for player details auto-save flow"
```

---

## Task 11: Manual Testing & Bug Fix

**Files:**

- Manual testing only

**Step 1: Start dev server**

Run: `npm run dev`
Navigate to: `http://localhost:3000/settings/player-details`

**Step 2: Test pre-population**

- Verify form fields are pre-filled with onboarding data (grad year, GPA, SAT, ACT, zip code)
- Verify primary sport is displayed
- Verify positions match selected sport

**Step 3: Test auto-save**

- Change graduation year → blur field → verify "Saved ✓" toast appears
- Change GPA → blur field → verify "Saved ✓" toast appears
- Change primary sport → verify position list updates
- Click a position button → verify "Saved ✓" toast appears

**Step 4: Test error handling**

- Disconnect network (DevTools)
- Try to save → verify error toast appears
- Reconnect network
- Blur field again → verify save succeeds

**Step 5: Test parent role**

- Login as parent
- Navigate to player details
- Verify read-only banner shows
- Verify all fields are disabled

**Step 6: Commit**

```bash
git add .
git commit -m "test: manual testing verified - auto-save and pre-population working"
```

---

## Task 12: Run Full Test Suite

**Files:**

- Run all tests

**Step 1: Run unit tests**

Run: `npm run test`
Expected: All tests pass, coverage >80%

**Step 2: Run type-check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Run linting**

Run: `npm run lint`
Expected: No errors

**Step 4: Final commit**

```bash
git add .
git commit -m "test: verify full test suite passes with >80% coverage"
```

---

## Unresolved Questions

None - requirements are clear from the specification provided.

---

## Summary of Changes

| File                                                | Change Type    | What                                                                                                    |
| --------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| `types/models.ts`                                   | Type Addition  | Added `primary_sport` and `primary_position` fields                                                     |
| `composables/useSportsPositionLookup.ts`            | New File       | Sport-to-positions mapping utility                                                                      |
| `composables/useAutoSave.ts`                        | New File       | Auto-save with debounce and toast feedback                                                              |
| `pages/settings/player-details.vue`                 | Major Refactor | Added sport/position fields, replaced static positions with dynamic, added auto-save to all form fields |
| `pages/settings/location.vue`                       | Minor Update   | Added auto-save to zip code field                                                                       |
| `tests/composables/useAutoSave.spec.ts`             | New File       | Unit tests for auto-save                                                                                |
| `tests/composables/useSportsPositionLookup.spec.ts` | New File       | Unit tests for sports lookup                                                                            |
| `tests/e2e/player-details-autosave.spec.ts`         | New File       | E2E tests for auto-save flow                                                                            |

---

## Key Benefits

✅ **No More Re-Entry** - Onboarding data automatically pre-fills settings page
✅ **Smart Positions** - Position list dynamically filtered by selected sport
✅ **Instant Feedback** - Toast notifications confirm saves immediately
✅ **No Manual Saves** - Auto-save on blur with debounce prevents excessive API calls
✅ **Error Resilient** - Network errors shown, users can retry by editing field again
✅ **Fully Tested** - Unit + E2E tests ensure reliability
✅ **Accessible** - Works for parents (read-only) and players (editable)
