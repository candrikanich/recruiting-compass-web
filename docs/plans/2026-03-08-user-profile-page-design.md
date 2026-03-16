# User Profile Page Design

**Date:** 2026-03-08
**Status:** Approved
**Branch:** develop

## Problem

No dedicated user profile page exists for any user. Parents have nowhere to manage their identity (name, email, photo, password). The `account.vue` page only handles deletion and has no settings nav link. Player-specific recruiting data in `player-details.vue` is conflated with basic account identity, creating confusion about what "profile" means.

## Goal

Create a single `/settings/profile` page for all users covering personal identity, security, and account management. Athletes additionally see a bridge card linking to their recruiting profile. Retire `account.vue` by absorbing its deletion flow.

## Mental Model (Post-Implementation)

- **My Profile** → Who I am as an account holder (name, email, photo, password, account actions)
- **Athlete Profile** → Recruiting information (stats, academics, positions, social handles)

## Architecture

```
/settings/profile (new page)
  ↓
useUserProfile composable (new)
  ↓
Pinia user store (existing)
  ↓
PATCH /api/user/profile          (new — name, phone, date_of_birth)
POST  /api/auth/change-email     (new — requires re-auth)
POST  /api/auth/change-password  (new — requires current password)
/api/account/*                   (existing — deletion endpoints reused)
```

`account.vue` is deprecated. The page redirects to `/settings/profile`. Deletion API endpoints are unchanged.

## Page Sections

All users see sections 1–5. Athletes additionally see section 4 (Athlete Profile bridge).

### 1. Profile Photo
- Wraps existing `ProfilePhotoUpload.vue` component
- Upload, remove, compression handled by existing `useProfilePhoto` composable
- No changes to composable needed

### 2. Personal Info
- Fields: Full name (required), phone (optional), date of birth (optional)
- Saves independently — no page-level save button
- PATCH `/api/user/profile`

### 3. Email
- Displays current verified email
- "Change email" opens inline form: new email + current password for re-auth
- On success: Supabase `updateUser` triggers verification email, banner shown
- Old email remains active until new one is verified

### 4. Password
- Fields: Current password, new password, confirm new password
- Verified server-side — current password checked before update
- In-page submit, no redirect

### 5. Athlete Profile *(athletes only)*
- Bridge card: "Manage your recruiting profile, stats, and academic info"
- Links to `/settings/player-details`
- Not shown for parents

### 6. Data & Privacy
- Export my data (existing `useUserExport` composable)
- Delete account (lifted verbatim from `account.vue` — 30-day grace period, cancel option)

## Components

| Component | Description |
|---|---|
| `ProfilePhotoSection.vue` | Wraps existing `ProfilePhotoUpload.vue` |
| `ProfilePersonalInfoSection.vue` | Name, phone, date of birth |
| `ProfileEmailSection.vue` | Email display + change with re-auth modal |
| `ProfilePasswordSection.vue` | In-page password change form |
| `ProfileAthleteSection.vue` | Bridge card (athletes only) |
| `ProfileDataPrivacySection.vue` | Data export + account deletion |

## Navigation Changes

- Settings index card: "Account" → "Profile", route `/settings/account` → `/settings/profile`
- Header dropdown: no change needed (already links to `/settings`)
- `account.vue`: add redirect to `/settings/profile`
- Player-details settings card label: "Player Details" → "Athlete Profile" for clarity

## Data Flow

- Page loads current user from Pinia store (already initialized on mount)
- Each section saves independently with its own loading/error state
- Photo: existing composable, no API changes
- Personal info: PATCH `/api/user/profile` — fields: `full_name`, `phone`, `date_of_birth`
- Email change: re-auth modal → POST `/api/auth/change-email` → Supabase updateUser
- Password change: POST `/api/auth/change-password` → verify current → update
- Deletion: reuses existing `/api/account/request-deletion` and cancel endpoints

## Error Handling

| Scenario | UX |
|---|---|
| Wrong current password (email change) | Inline field error, no toast |
| Wrong current password (password change) | Inline field error |
| Email already in use | Inline error on email field |
| New passwords don't match | Inline validation, client-side |
| Photo upload failure | Toast with retry option |
| Network error on any section | Inline per-section error message |

## Database Changes

None. All required fields already exist on the `users` table:
- `full_name`, `phone`, `date_of_birth`, `profile_photo_url` (identity)
- `deletion_requested_at` (account deletion — existing)

## Testing Plan

**Unit**
- `useUserProfile` composable: save success, validation errors, email re-auth flow, role-based athlete section visibility
- Each section component: renders correctly for parent vs. athlete role

**Integration**
- `PATCH /api/user/profile`: updates name/phone, rejects missing required fields, validates input with Zod
- `POST /api/auth/change-email`: re-auth check, Supabase update, error on duplicate email
- `POST /api/auth/change-password`: current password verification, rejects weak passwords

**E2E**
- Parent updates name and profile photo successfully
- Athlete sees bridge card and navigates to player-details
- Email change triggers verification banner
- Account deletion flow works end-to-end from new profile page

## Files to Create

```
pages/settings/profile.vue
components/Settings/Profile/ProfilePhotoSection.vue
components/Settings/Profile/ProfilePersonalInfoSection.vue
components/Settings/Profile/ProfileEmailSection.vue
components/Settings/Profile/ProfilePasswordSection.vue
components/Settings/Profile/ProfileAthleteSection.vue
components/Settings/Profile/ProfileDataPrivacySection.vue
composables/useUserProfile.ts
server/api/user/profile.patch.ts
server/api/auth/change-email.post.ts
server/api/auth/change-password.post.ts
tests/unit/composables/useUserProfile.test.ts
tests/unit/server/api/user/profile.patch.test.ts
tests/unit/server/api/auth/change-email.post.test.ts
tests/unit/server/api/auth/change-password.post.test.ts
```

## Files to Modify

```
pages/settings/account.vue          → add redirect to /settings/profile
pages/settings/index.vue            → update settings card (Account → Profile, route)
components/Settings/SettingsCard.vue → (if label change needed)
```
