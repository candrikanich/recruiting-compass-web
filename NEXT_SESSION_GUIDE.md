# Family Unit System - Next Session Guide

**Status:** 70% Complete - Ready for UI/API/Testing Phase
**Date Updated:** 2026-01-31

---

## ✅ What's Already Done

- [x] Database migrations (021 & 022) created and tested
- [x] RLS policies fully implemented
- [x] 5 composables updated: useSchools, useCoaches, useInteractions, useAccountLinks, useActiveFamily
- [x] 2 new composables created: useActiveFamily, useUserNotes
- [x] Test data created: 2 families with 4 test accounts and 60 data rows backfilled
- [x] All code passes: Linting (0 errors), Type-check (0 errors)
- [x] Student-only interaction creation enforced
- [x] Automatic family creation on account link confirmation

---

## 🎯 Remaining Work (3 Phases)

### Phase 5: UI Components (6-8 hours)

**Files to Create:**
1. `components/AthleteSelector.vue` - Parent athlete switching dropdown
2. `components/PrivateNotesCard.vue` - User private notes display

**Files to Modify:**
1. `pages/schools/index.vue` - Add AthleteSelector
2. `components/SchoolCard.vue` - Add PrivateNotesCard
3. `pages/settings/account-linking.vue` - Show family context

**Code templates available in:** `PHASE_4_NEXT_STEPS.md`

### Phase 6: API Endpoints (4-5 hours)

**Endpoints to Create:**
1. `POST /api/family/create.post.ts` - Manual family creation
2. `GET /api/family/members.get.ts` - Fetch family members

**Endpoints to Modify:**
1. `POST /api/account-links/confirm.post.ts` - Add family creation logic (already in composable, mirror to API if needed)

**Code examples available in:** `PHASE_4_NEXT_STEPS.md`

### Phase 7: Testing (6-8 hours)

**Tests to Create:**
1. `tests/unit/composables/useActiveFamily.spec.ts` - Family context logic
2. `tests/unit/composables/useUserNotes.spec.ts` - Private notes CRUD
3. E2E tests for parent switching and student interaction creation

---

## 🚀 Quick Start for Next Session

### Step 1: Apply Migrations (if not already done)
```bash
# In Supabase SQL Editor:
# 1. Copy entire migration 021_create_family_units.sql → Run
# 2. Copy entire migration 022_backfill_family_data.sql → Run
# 3. Regenerate types:
npx supabase gen types typescript --local > types/database.ts
```

### Step 2: Start with UI Components
- Begin with `AthleteSelector.vue` (simplest)
- Then `PrivateNotesCard.vue`
- Then integrate into existing pages

### Step 3: Create API Endpoints
- Mirror family creation logic from composable to API if needed
- Create member lookup endpoint

### Step 4: Write Tests
- Start with unit tests for new composables
- Then E2E tests for user workflows

---

## 📁 Key Files to Know

**Composables (Already Updated):**
- `composables/useActiveFamily.ts` - Family context provider (NEW)
- `composables/useUserNotes.ts` - Private notes (NEW)
- `composables/useSchools.ts` - Updated for family_unit_id
- `composables/useCoaches.ts` - Updated for family_unit_id
- `composables/useInteractions.ts` - Updated for family_unit_id + student-only check
- `composables/useAccountLinks.ts` - Updated with automatic family creation

**Migrations (Created, Not Yet Applied):**
- `server/migrations/021_create_family_units.sql`
- `server/migrations/022_backfill_family_data.sql`

**Test Data:**
- Family 1 ID: `983b2163-5d1b-4a46-997f-a60e6b42a7bd`
  - Student: test.player2028@ (d026ead8...)
  - Parents: test.parent@, test.parent2@
  - Data: 19 schools, 7 coaches, 26 interactions, etc.
- Family 2 ID: `ad6b1ff8-919e-44e7-91d0-2fa9d8f4d9fc`
  - Student: test.player2030@ (5695e387...)
  - Parents: test.parent@, test.parent2@
  - Data: Empty (ready for testing)

**Documentation:**
- `FAMILY_UNITS_IMPLEMENTATION_STATUS.md` - Full status tracker
- `FAMILY_UNITS_MIGRATION.md` - Migration application guide
- `PHASE_4_NEXT_STEPS.md` - Detailed next steps with code examples
- `MIGRATION_VALIDATION_GUIDE.md` - How to validate migrations

---

## ✨ Key Features Ready to Test

1. **Family Context Switching (Parents)**
   - Login as test.parent@
   - Use `useActiveFamily().switchAthlete()` to view different kids
   - Data automatically filtered to correct family

2. **Student-Only Interactions**
   - Only students (role === 'student') can create interactions
   - Parents get error: "Only students can create interactions"
   - Enforced at both DB level (RLS) and composable level

3. **Automatic Family Creation**
   - When parent confirms account link with student
   - Family unit created automatically
   - Parent added to family_members

4. **Private Notes**
   - Use `useUserNotes()` to add/edit private notes
   - Notes scoped to current user only
   - Not visible to other family members

---

## 🧪 Testing Checklist

Before finishing, verify:
- [ ] Migrations applied and backfill verified (100% coverage)
- [ ] `npm run type-check` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all tests pass
- [ ] Parent can switch between test.player2028@ and test.player2030@
- [ ] Parent cannot create interactions (gets error)
- [ ] Student can create interactions
- [ ] Private notes are truly private (other users can't see them)
- [ ] Shared notes visible to family
- [ ] Family creation works on account link confirmation

---

## 💡 Development Tips

1. **Use test accounts:**
   - Parent view: test.parent@andrikanich.com
   - Student view: test.player2028@andrikanich.com
   - Family data: 60 rows pre-loaded

2. **Monitor family context:**
   - `useActiveFamily().activeFamilyId` - Current family
   - `useActiveFamily().activeAthleteId` - Current athlete
   - `useActiveFamily().isViewingAsParent` - Boolean flag

3. **Private notes pattern:**
   ```typescript
   const userNotes = useUserNotes();
   const note = await userNotes.getNote('school', schoolId);
   await userNotes.saveNote('school', schoolId, 'My private notes');
   ```

---

## 📞 Questions?

Refer to:
- `PHASE_4_NEXT_STEPS.md` - Detailed code examples for UI/API
- `FAMILY_UNITS_IMPLEMENTATION_STATUS.md` - Full reference
- `MIGRATION_VALIDATION_GUIDE.md` - Migration help

---

## 🎯 Success = Done When:

✅ UI Components built and integrated
✅ API endpoints created
✅ All tests passing
✅ Parent can view multiple kids' data
✅ Students can create interactions, parents cannot
✅ Private notes working
✅ Automatic family creation on link confirmation
