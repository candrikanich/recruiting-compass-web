# Migration Plan: useUserPreferences V1 → V2 (Full Migration)

**Decision:** Option 3 - Full Migration to V2 with Supabase Audit Table History
**Scope:** 9 files across 7 pages + 1 composable + 2 new utility files
**Estimated Components:** 5-7 hours of focused work

---

## Phase 1: Schema & Infrastructure (COMPLETED ✅)

### 1.1 Create Preference History Audit Table

**Status:** ✅ COMPLETED
**Migration:** `017_migrate_user_preferences_v1_to_v2` applied successfully
**Data Migration:** All 299 user preference records converted from V1 → V2 format

**Results:**
- ✅ New `user_preferences` table with category-based structure created
- ✅ All V1 data migrated to V2 format:
  - 299 notification preferences
  - 1 location preference (your home location)
  - 1 player details preference
  - 1 school preferences
  - 1 communication templates
- ✅ `preference_history` audit table created with RLS policies
- ✅ Auto-update triggers for `updated_at` configured
- ✅ Backup table `user_preferences_v1_backup` preserved for safety

```sql
CREATE TABLE preference_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_fields TEXT[] NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_category CHECK (category IN ('notifications', 'location', 'player', 'school', 'dashboard'))
);

CREATE INDEX idx_preference_history_user_id ON preference_history(user_id);
CREATE INDEX idx_preference_history_category ON preference_history(category);
CREATE INDEX idx_preference_history_created_at ON preference_history(created_at);
```

### 1.2 Validation & Type Guards

**File:** `/utils/preferenceValidation.ts`
**Purpose:** Type-safe extraction from V2's generic `Record<string, unknown>`

```typescript
// Type guards for each preference category
export function validateNotificationSettings(data: unknown): NotificationSettings
export function validateHomeLocation(data: unknown): HomeLocation
export function validatePlayerDetails(data: unknown): PlayerDetails
export function validateSchoolPreferences(data: unknown): SchoolPreferences
export function validateDashboardLayout(data: unknown): DashboardWidgetVisibility

// History tracking helpers
export function trackHistoryChange<T>(oldValue: T, newValue: T, category: string): HistoryEntry[]
export function createHistoryEntry(category: string, changes: FieldChange[]): PreferenceHistoryEntry
```

### 1.3 API Endpoints for History

**File:** `/server/api/user/preferences/[category]/history.get.ts`
**Purpose:** Retrieve preference change history

```typescript
export default defineEventHandler(async (event) => {
  // GET /api/user/preferences/{category}/history
  // Returns list of preference_history entries for category
})
```

---

## Phase 2: Create Preference Manager Composable (1 hour)

**File:** `/composables/usePreferenceManager.ts`
**Purpose:** High-level preference management with history tracking

This wrapper coordinates multiple V2 instances and handles history:

```typescript
export function usePreferenceManager() {
  const notificationPrefs = useUserPreferencesV2('notifications');
  const locationPrefs = useUserPreferencesV2('location');
  const playerPrefs = useUserPreferencesV2('player');
  const schoolPrefs = useUserPreferencesV2('school');
  const dashboardPrefs = useUserPreferencesV2('dashboard');

  // Coordinated operations
  const loadAllPreferences = async () => { /* load all categories */ }
  const saveAllPreferences = async () => { /* save all categories */ }

  // Typed accessors with validation
  const getNotificationSettings = (): NotificationSettings => { /* validate & return */ }
  const setNotificationSettings = async (settings: Partial<NotificationSettings>) => { /* validate, track, save */ }

  // History operations
  const getPreferenceHistory = async (category: PreferenceCategory) => { /* fetch from API */ }
  const trackChange = async (category, oldValue, newValue) => { /* record change */ }

  return {
    notificationPrefs,
    locationPrefs,
    playerPrefs,
    schoolPrefs,
    dashboardPrefs,
    loadAllPreferences,
    saveAllPreferences,
    getNotificationSettings,
    setNotificationSettings,
    getPreferenceHistory,
    trackChange,
  };
}
```

---

## Phase 3: Refactor Pages (3-4 hours)

### Migration Pattern for Each Page

**Before (V1):**
```typescript
const { notificationSettings, updateNotificationSettings, loading, error } = useUserPreferences();

watch(notificationSettings, (settings) => {
  if (settings) Object.assign(localSettings, settings);
});

const handleSave = async () => {
  await updateNotificationSettings(localSettings);
};
```

**After (V2):**
```typescript
const { getNotificationSettings, setNotificationSettings, isLoading, error } = usePreferenceManager();

const localSettings = reactive<NotificationSettings>(
  getNotificationSettings() || getDefaultNotificationSettings()
);

onMounted(async () => {
  // Load preferences from API
  const prefs = await useUserPreferencesV2('notifications').loadPreferences();
  Object.assign(localSettings, validateNotificationSettings(prefs?.data));
});

const handleSave = async () => {
  const oldSettings = getNotificationSettings();

  try {
    await setNotificationSettings(localSettings);
    saveSuccess.value = true;
  } catch (err) {
    error.value = err?.message || "Failed to save";
  }
};
```

### Files to Refactor

1. **`/pages/settings/notifications.vue`** - Notification settings
   - Replace V1 import with `usePreferenceManager`
   - Use `getNotificationSettings()` / `setNotificationSettings()`
   - Loading state: `isLoading` → `loading`
   - Error state stays same

2. **`/pages/settings/location.vue`** - Home location
   - Replace V1 import with `usePreferenceManager`
   - Use `getHomeLocation()` / `setHomeLocation()`
   - Handle null case (location optional)

3. **`/pages/settings/player-details.vue`** - Player details
   - Replace V1 import with `usePreferenceManager`
   - Use `getPlayerDetails()` / `setPlayerDetails()`
   - Track history via manager
   - Handle undefined case

4. **`/pages/settings/school-preferences.vue`** - School preferences
   - Replace V1 import with `usePreferenceManager`
   - Use `getSchoolPreferences()` / `setSchoolPreferences()`
   - Track history via manager
   - Handle array case

5. **`/pages/settings/dashboard.vue`** - Dashboard layout
   - Replace V1 import with `usePreferenceManager`
   - Use `getDashboardLayout()` / `setDashboardLayout()`

6. **`/pages/settings/index.vue`** - Settings home
   - Check if loads preferences
   - Refactor if needed

7. **`/pages/schools/index.vue`** - Schools list
   - Check which preferences used (likely location or school prefs)
   - Refactor references only

8. **`/pages/schools/[id]/index.vue`** - School detail
   - Check which preferences used
   - Refactor references only

9. **`/composables/useSchoolMatching.ts`** - School matching logic
   - Currently uses `schoolPreferences` and `homeLocation` from V1
   - Replace with V2 calls or manager
   - **Critical:** Coordinate loading of both preferences
   - Ensure computed properties still work

### Refactoring Strategy for useSchoolMatching

```typescript
export const useSchoolMatching = () => {
  const prefManager = usePreferenceManager();

  // Load all required preferences on init
  const { schoolPrefs, locationPrefs } = useSchoolPreferencesState();

  onMounted(async () => {
    await Promise.all([
      prefManager.schoolPrefs.loadPreferences(),
      prefManager.locationPrefs.loadPreferences(),
    ]);
  });

  const calculateMatchScore = (school: School): MatchResult => {
    const schoolPrefs = validateSchoolPreferences(
      prefManager.schoolPrefs.preferences.value
    );
    const homeLocation = validateHomeLocation(
      prefManager.locationPrefs.preferences.value
    );

    // ... rest of logic unchanged
  };

  return { calculateMatchScore, ... };
};
```

---

## Phase 4: Testing & Validation (1-2 hours)

### Unit Tests

- **`usePreferenceManager.spec.ts`**
  - Test loading all preferences
  - Test setting each preference type
  - Test history tracking calls
  - Test error handling

- **`preferenceValidation.spec.ts`**
  - Test type guards for each category
  - Test invalid data rejection
  - Test null/undefined cases

### Integration Tests

- Test preference flow: load → modify → save → verify
- Test history recording after save
- Test error recovery (retry on network failure)
- Test concurrent updates to different categories

### E2E Tests (Playwright)

- **Settings flow:**
  - Navigate to settings page
  - Modify notification preferences
  - Save and verify persistence across reload
  - Modify location preferences
  - Save and verify school matching updates

- **School preferences flow:**
  - Add school preference
  - Verify auto-save
  - Check history recorded
  - Verify match scores update

### Manual Testing Checklist

- [ ] Navigate to `/settings` - all pages load without console errors
- [ ] Modify notification settings - save successfully, persist across reload
- [ ] Modify home location - school matching scores update
- [ ] Modify player details - history tracked, can view audit
- [ ] Modify school preferences - preference list updates, matches recalculate
- [ ] Modify dashboard layout - widget visibility changes stick
- [ ] Test offline scenario - preferences saved to localStorage
- [ ] Test error recovery - network failure doesn't lose edits
- [ ] Verify no `useUserPreferences` (V1) imports remain

---

## Phase 5: Cleanup (30 min)

### Deprecate V1

1. Rename original to `useUserPreferences.v1.deprecated.ts`
2. Add strong deprecation notice to old composable
3. Update documentation

### Update Documentation

- Update CLAUDE.md migration guide
- Update composable pattern in README
- Remove references to V1 in comments

---

## Critical Points

### Type Safety

V2 returns generic `Record<string, unknown>`. **Must** validate:
```typescript
// NEVER do this
const settings = prefs.value as NotificationSettings;

// DO this
const settings = validateNotificationSettings(prefs.value);
```

### History Tracking

History must be **explicitly** tracked on save:
```typescript
const oldValue = getNotificationSettings();
await setNotificationSettings(localSettings);
await trackChange('notifications', oldValue, localSettings);
```

### Async Coordination

When multiple preferences needed (useSchoolMatching):
```typescript
// WRONG - race condition
const schoolScore = calculateScore(); // loads schoolPrefs async

// RIGHT - await both
await Promise.all([loadSchoolPrefs(), loadLocationPrefs()]);
const schoolScore = calculateScore(); // now safe
```

### Default Values

V1 auto-created defaults. V2 doesn't. Must provide defaults:
```typescript
const localSettings = reactive<NotificationSettings>(
  getNotificationSettings() ?? getDefaultNotificationSettings()
);
```

---

## Unresolved Questions

1. **API endpoints ready?** Does `/api/user/preferences/{category}` exist and support all 5 categories?
2. **Database schema?** Is `preference_history` table already in Supabase, or should we create it?
3. **Offline support?** Should localStorage fallback work, or assume online-only?
4. **Performance threshold?** Is loading 5 preference categories acceptable, or should we batch into fewer API calls?
5. **Backwards compatibility?** Should old V1 data in `user_preferences` table be migrated or ignored?

---

## Rollback Plan

If critical issues emerge:

1. **Revert all imports** back to V1
2. **Run git reset** to last stable commit
3. **Investigate** issue in isolation
4. **Re-approach** with Option 2 (adapter layer) instead

Easy rollback because:
- V1 composable still exists unchanged
- No schema breaking changes yet (audit table is additive)
- No data loss (V2 doesn't delete V1 data)
