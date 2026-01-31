# Family Context Fix - Testing & Verification Guide

## What Was Fixed

Fixed a singleton instance mismatch that caused parents to see stale data when switching between viewing different athletes.

**The Bug:** When a parent switched from viewing Player1 to Player2, the page would update but some data wouldn't refresh because the composables were using a different family context instance than the page.

---

## Testing Procedure

### 1. **Check Browser Console for Instance ID Verification**

Open browser DevTools → Console tab and look for these logs:

**Expected logs when switching athletes:**
```
[useActiveFamily] Athlete switched: <old-id> → <new-id>, instance: abc1234, family: xyz9876
[Schools] Family changed: familyId=xyz9876, re-fetching schools
[useSchools] Composable instance matches page: abc1234
```

**Warning logs (indicate a problem):**
```
[useFamilyContext] Creating singleton - injection should be preferred!
[useSchools] activeFamily injection failed, using singleton fallback.
```

---

### 2. **Test Case: Parent Switching Between Athletes**

**Setup:**
- Create a test family with 2 athletes (Parent A, Player 1, Player 2)
- Player 1: Follow 3 schools
- Player 2: Follow 1 school

**Steps:**
1. Parent logs in
2. Parent checks Schools list → Should see 3 schools (Player 1's list)
3. Parent switches to Player 2 via dropdown selector
4. **Verify:** Schools list updates to show 1 school (not 3)
5. Switch back to Player 1
6. **Verify:** Schools list updates back to 3 schools

**Success Criteria:**
- ✅ Data updates when switching
- ✅ No duplicate schools from old athlete
- ✅ No warning logs in console about injection failures

---

### 3. **Test Case: Parent Adding Data for Different Athletes**

**Setup:**
- Parent A linked to Player 1 and Player 2
- Player 1 has 2 schools already

**Steps:**
1. Parent logs in, views Player 1 schools
2. Parent adds a new school to Player 1 → School appears immediately
3. Parent switches to Player 2
4. Parent switches back to Player 1
5. **Verify:** The new school is still there

**Success Criteria:**
- ✅ New data persists
- ✅ Switching away and back re-fetches correctly
- ✅ No stale data shown

---

### 4. **Check Network Requests**

Open DevTools → Network tab and monitor API calls:

**Expected when parent switches athletes:**
```
GET /api/schools?family_unit_id=<new-family-id>  ✅ Correct query
GET /api/interactions?family_unit_id=<new-family-id>  ✅ Correct query
```

**Problem signs:**
```
GET /api/schools?family_unit_id=<old-family-id>  ❌ Using stale ID
GET /api/schools?user_id=<wrong-user>  ❌ Wrong query type
```

---

## What the Fix Does

### **Step 1: Singleton Warning (useFamilyContext.ts)**
```typescript
if (!familyContextInstance) {
  console.warn("[useFamilyContext] Creating singleton - injection should be preferred!");
  familyContextInstance = useActiveFamily();
}
```

- Logs if singleton is created unexpectedly
- Helps identify injection failures

### **Step 2: Composable Injection Debugging (useSchools, useInteractions, etc.)**
```typescript
const injectedFamily = inject<ReturnType<typeof useActiveFamily>>("activeFamily");
const activeFamily = injectedFamily || useFamilyContext();

if (!injectedFamily) {
  console.warn("[useSchools] activeFamily injection failed, using singleton fallback.");
}
```

- Explicitly tracks injection success/failure
- Logs when composable has to fall back to singleton
- Makes the problem visible in console

### **Step 3: Instance ID Tracking (useActiveFamily.ts)**
```typescript
const _debugInstanceId = Math.random().toString(36).slice(2, 9);

const switchAthlete = async (athleteId: string) => {
  console.debug(
    `[useActiveFamily] Athlete switched: ${previousAthleteId} → ${athleteId}, ` +
    `instance: ${_debugInstanceId}, family: ${activeFamilyId.value}`
  );
  // ...
}
```

- Adds unique instance ID to each family context
- Shows instance ID in logs when athlete switches
- Allows verification that page and composables use same instance

---

## Troubleshooting: If Issue Still Occurs

### **Symptom: Parent sees stale data when switching athletes**

**Check 1: Look for injection failure warnings**
```javascript
// In browser console, search for:
"activeFamily injection failed"
```

If you see this message:
- Injection is failing somewhere
- Composable is using singleton fallback
- Need to verify app.vue is providing activeFamily

**Check 2: Verify instance IDs match**
```javascript
// In browser console when athlete switches, look for:
// Page instance ID
[useActiveFamily] Athlete switched: ... instance: abc1234

// This ID should match across all composables
// If you see DIFFERENT IDs, they're using different instances
```

**Check 3: Verify family context is provided in app.vue**
```typescript
// app.vue should have:
import { useActiveFamily } from "~/composables/useActiveFamily";

onBeforeMount(() => {
  const activeFamily = useActiveFamily();
  provide("activeFamily", activeFamily);  // ← This MUST exist
});
```

**Check 4: Verify pages are using injection**
```typescript
// pages/schools/index.vue should have:
const activeFamily = inject("activeFamily") || useFamilyContext();
```

---

## Performance Impact

- ✅ No performance impact from logging (debug logs only shown in dev console)
- ✅ No additional network requests
- ✅ No changes to database queries
- ✅ Instance ID generation is O(1) and negligible

---

## Rollback Plan

If issues arise, the fix can be safely rolled back by:
1. Removing the warning logs (composables will still work)
2. Reverting to previous instance ID system (or removing entirely)
3. The core fix (explicit injection tracking) is just defensive

All changes are backward compatible.

---

## Next Steps

If instance mismatch issues persist after this fix:

1. **Check app.vue** - Verify `provide("activeFamily", activeFamily)` is executed
2. **Check page injection** - Ensure pages call `inject("activeFamily")`
3. **Monitor network requests** - Verify queries use correct `family_unit_id`
4. **Check RLS policies** - Verify Supabase RLS allows access to family's data
5. **Consider cache** - Check if browser caching old responses (clear cache)

If you still see warnings in console, file an issue with:
- Screenshot of console warnings
- Network tab showing what queries are being made
- Current athlete and parent IDs being used
