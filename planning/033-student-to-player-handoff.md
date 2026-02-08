# Handoff: Standardize User Role "student" to "player"

## Status: COMPLETE

## What Was Done

### Phase 1: Database Migration

- Created `server/migrations/033_standardize_student_to_player.sql`
- Updates `user_role` enum: removes `student`, adds `player`
- Migrates `family_members.role` CHECK constraint
- Renames `family_units.student_user_id` to `player_user_id`
- Recreates index `idx_student_one_family` as `idx_player_one_family`
- Updates 2 SQL functions (`is_parent_viewing_athlete`, `get_accessible_athletes`)
- Updates RLS policy "Only students can create interactions" to "Only players..."
- Drops `user_type` column from users table
- **Migration has NOT been run on Supabase yet** - must be applied manually

### Phase 2: TypeScript Types

- `types/database.ts`: enum, constants, column types, FK references
- `types/models.ts`: User.role type
- `server/utils/auth.ts`: UserRole type
- `utils/validation/schemas.ts`: Zod enum (removed "student")

### Phase 3: Application Code (~30 files)

- **Stores**: `stores/user.ts` (isAthlete getter, defaults, signup)
- **Pages**: `signup.vue`, `family-management.vue`, `privacy.vue`
- **Composables**: `useActiveFamily.ts` (isStudent -> isPlayer), `useInteractions.ts`, `useFamilyCode.ts`, `useAuth.ts`, `useParentContext.ts`, `useFamilyInvite.ts`
- **Components**: `FamilyMemberCard.vue` (prop isStudent -> isPlayer), `ViewIndicator.vue`, `LoggedByBadge.vue`
- **Middleware**: `viewLogging.global.ts` (studentMember -> playerMember)
- **Server APIs**: 7 family-related endpoints + daily-suggestions cron

### Phase 4: Tests (~20 files)

- Updated all unit, integration, and e2e test files
- All `role: "student"` mocks changed to `role: "player"`
- Removed `user_type` references from tests
- Updated error message assertions ("Only students" -> "Only players")

### Phase 5: iOS App

- `UserRole.swift`: Removed `.student` case
- `RoleSelectionCard.swift`: Updated for 2 roles only
- Test files: Updated for `.player` only

## Verification Results

- **Tests**: 4319 passing, 5 failing (pre-existing `SchoolInterestChart` issue)
- **Lint**: 1 pre-existing error (unrelated `useResendCooldown.ts`)
- **Zero remaining "student" role references** in source code
- **Zero remaining `student_user_id` references** in source code

## What Remains

1. **Run the migration** on Supabase: `033_standardize_student_to_player.sql`
2. **iOS build verification** in Xcode (Swift diagnostics from VS Code are expected to fail)
3. **Manual testing**: Signup flow with "Player" selection
4. **Type-check** (`npm run type-check`) - runs on push

## Known Issues

- Pre-existing: `SchoolInterestChart.spec.ts` - Chart.js constructor mock issue (5 tests)
- Pre-existing: `useResendCooldown.ts` - unused `Ref` import lint error
- Comments in `family-management.vue` (lines 46, 59, 253) still say "Students" - cosmetic only
