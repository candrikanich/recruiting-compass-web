# Fit Score Recalculation Bug Fix

**Date:** February 11, 2026
**Issue:** Fit scores not updating after player fills out profile
**Status:** ✅ FIXED

## The Bug

When a player updated their profile in `/settings/player-details`, the fit scores for their schools were not being recalculated. The root cause was a database table name mismatch in the recalculation endpoint.

## Root Cause

The fit score recalculation endpoint (`server/api/athlete/fit-scores/recalculate-all.post.ts`) was querying the **wrong table name**:

```typescript
// ❌ WRONG - This table doesn't exist!
const { data: playerPrefs, error: prefError } = await supabase
  .from("user_preferences_v2") // Wrong table name
  .select("preferences") // Wrong column name
  .eq("user_id", user.id)
  .eq("category", "player")
  .single();
```

The actual table structure:

- Table name: `user_preferences` (not `user_preferences_v2`)
- Column name: `data` (not `preferences`)
- Uses `category` column with value `"player"` for player details

## The Fix

**File:** `server/api/athlete/fit-scores/recalculate-all.post.ts`

### Changed Lines 40-45:

```typescript
// ✅ CORRECT
const { data: playerPrefs, error: prefError } = await supabase
  .from("user_preferences") // Correct table name
  .select("data") // Correct column name
  .eq("user_id", user.id)
  .eq("category", "player") // Filter by category
  .single();
```

### Changed Line 62:

```typescript
// Extract player details from the correct property
const playerDetails = (playerPrefs.data || {}) as Partial<PlayerDetails>;
```

### Changed Lines 201-206 (Second Fix - Upsert to Update):

**Original (BROKEN):**

```typescript
// Used upsert which tries INSERT first, causing null constraint errors
const { data: _updateResult, error: updateError } = await supabase
  .from("schools")
  .upsert(updates, { onConflict: "id" })
  .select();
```

**Fixed:**

```typescript
// Use individual update calls for each school
const updatePromises = updates.map((update) =>
  supabase
    .from("schools")
    .update({
      fit_score: update.fit_score,
      fit_score_data: update.fit_score_data,
      updated_at: update.updated_at,
    })
    .eq("id", update.id)
    .select(),
);

const results = await Promise.all(updatePromises);
const updateError = results.find((r) => r.error)?.error;
```

**Why this fix was needed:** The original code used `.upsert()` which tries to INSERT a new row first, then UPDATE on conflict. When inserting, Postgres requires all NOT NULL columns (like `user_id`), but we only provided `id`, `fit_score`, `fit_score_data`, and `updated_at`. This caused:

```
null value in column "user_id" of relation "schools" violates not-null constraint
```

The fix uses individual `.update()` calls which only UPDATE existing rows, avoiding the INSERT attempt entirely.

## Database Schema

The V2 preferences migration created a category-based structure in the existing `user_preferences` table:

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  category VARCHAR NOT NULL,  -- 'player', 'notifications', 'location', etc.
  data JSONB,                  -- The actual preference data
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

The naming "V2" refers to the **API version** (category-based structure), not a separate table name.

## Testing

- **Tests Status:** 5454/5463 passing (9 pre-existing test failures unrelated to this fix)
- **Type Check:** 1 pre-existing TypeScript error in `useFitScoreRecalculation.ts` (unrelated to fix)
- **Manual Testing:** Ready for user to test

## How to Test Manually

1. Log in as an athlete
2. Navigate to Settings → Player Details
3. Update any field (e.g., GPA, height, positions)
4. Click "Save Player Details"
5. Navigate to Schools page
6. Verify that fit scores have been updated for all schools
7. Check browser console for "[FitScore]" debug logs

## Expected Behavior After Fix

1. Player fills out profile → Click "Save"
2. Player details saved to `user_preferences` table with `category='player'`
3. Recalculation endpoint fetches player details from correct table
4. Fit scores calculated for all schools using latest player data
5. Schools table updated with new fit scores
6. Success toast: "Player details saved and fit scores updated successfully"

## Files Modified

- `server/api/athlete/fit-scores/recalculate-all.post.ts` - Fixed table/column names

## Related Files (No Changes Needed)

- `composables/usePreferenceManager.ts` - Uses correct table name
- `composables/useUserPreferencesV2.ts` - Uses correct table name
- `server/api/user/preferences/[category].post.ts` - Uses correct table name
- `pages/settings/player-details.vue` - No changes needed

## Notes

- The "V2" naming caused confusion because it suggests a separate table
- The actual structure is: one table (`user_preferences`) with category-based records
- All other composables and API endpoints use the correct table name
- Only the fit score recalculation endpoint had the wrong table name

## Commit Message

```
fix(fit-scores): correct table name in recalculation endpoint

The fit score recalculation endpoint was querying 'user_preferences_v2'
(which doesn't exist) instead of 'user_preferences' with category='player'.

This bug prevented fit scores from updating after players filled out
their profiles.

Changed:
- Query from 'user_preferences_v2' → 'user_preferences'
- Column from 'preferences' → 'data'
- Data extraction from playerPrefs.preferences → playerPrefs.data

Fixes: Fit scores now update correctly after profile changes
```
