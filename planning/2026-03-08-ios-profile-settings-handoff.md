# iOS Profile & Settings — Handoff Document

> **Prepared:** 2026-03-08
> **Web branch:** `develop`
> **Purpose:** Bring the iOS app to parity with the new "My Profile" page on the web app, which lets every user view and edit their identity, security, and account settings.

---

## Overview

The web app shipped a consolidated **My Profile** page at `/settings/profile`. It is a single scrollable screen composed of up to six distinct sections, rendered in order:

1. Profile Photo
2. Personal Information
3. Email Address
4. Password
5. Athlete Profile *(athletes only)*
6. Data & Privacy (account deletion)

Each section operates independently — saving in one section does not affect the others.

---

## Screen Architecture

### Navigation

- **Entry point:** Settings → "My Profile" row (already exists in iOS Settings list)
- **Back target:** Settings screen
- iOS should model this as a pushed `NavigationStack` destination, not a modal

### Section visibility

```
isAthlete == true  → show all 6 sections
isAthlete == false → show sections 1–4 and 6 (skip Athlete Profile)
```

Use the `role` field from the authenticated user to determine `isAthlete`:

```
role == "player" → isAthlete = true
role == "parent" → isAthlete = false
```

---

## Section 1 — Profile Photo

### Behavior

| State | Display |
|---|---|
| No photo | Circular avatar with user's initials (2 chars max), blue gradient background |
| Has photo | Circular photo (96×96 pt), object-fit cover |

- Initials derived from `full_name`: split on spaces, take first character of each word, uppercase, max 2 chars
- Photo displayed as a circle with `clipShape(Circle())`

### Upload flow

1. User taps **"Upload Photo"** button
2. Native image picker opens (camera + photo library)
3. Selected image is compressed client-side before upload (see constraints below)
4. Upload directly to Supabase Storage bucket `profile-photos`
5. Storage path: `{userId}/profile-{timestamp}.jpg`
6. After successful upload, get public URL from storage
7. Update `users.profile_photo_url` via direct Supabase client call
8. Update local user state

### Upload constraints

- Accepted types: JPEG, PNG, WebP, GIF
- Max file size before compression: **5 MB**
- Compress to JPEG before uploading (web uses a compression utility — iOS should use `UIGraphicsImageRenderer` or equivalent)
- Target compressed size: ≤1 MB recommended

### Remove flow

1. User taps **"Remove"** button (only visible when a photo exists)
2. Show confirmation alert: *"Remove Profile Photo? Are you sure you want to remove your profile photo? You can upload a new one anytime."*
3. On confirm:
   - Extract storage path from the URL (everything after `/profile-photos/`)
   - Delete file from Supabase Storage bucket `profile-photos`
   - Update `users.profile_photo_url = null` via Supabase client
   - Update local user state

### iOS implementation notes

- Use `@supabase/supabase-swift` storage client directly (no API route intermediary — the web also does this client-side)
- Show upload progress with a linear progress bar while uploading
- Show error inline below the photo area if upload/delete fails

---

## Section 2 — Personal Information

### Fields

| Field | Type | Required | Validation |
|---|---|---|---|
| Full Name | Text | Yes | Non-empty, max 100 chars |
| Phone | Text (tel) | No | Max 30 chars |
| Date of Birth | Date | No | Athletes only |

- **Date of Birth field** is only shown when `isAthlete == true`
- Phone is optional — send `null` to clear it
- Date of birth format sent to API: `YYYY-MM-DD`

### Save behavior

- Single **Save** button at bottom of form
- Show inline validation: "Name is required." if full name is empty on submit
- On success: show brief "Saved!" confirmation text (auto-dismiss after ~2s)
- On failure: show error text "Failed to save. Please try again."
- Pre-populate fields from currently authenticated user data

### API

```
PATCH /api/user/profile
Authorization: Bearer <access_token>
Content-Type: application/json

Body (all fields optional, at least one required):
{
  "full_name": "Jane Smith",      // string, min 1, max 100
  "phone": "555-555-5555",        // string | null, max 30
  "date_of_birth": "2007-06-15"   // string "YYYY-MM-DD" | null
}

Response 200:
{ "success": true }

Response 400:
{ "statusMessage": "Invalid profile data" }

Response 500:
{ "statusMessage": "Failed to update profile" }
```

---

## Section 3 — Email Address

### Display states

**Default state:**
- Shows: `Current: user@example.com`
- Button: "Change Email" (outline style)
- Tapping the button expands the form (inline, not a new screen)

**Form expanded:**
- Field: New Email Address (email keyboard)
- Field: Current Password (to confirm identity)
- Buttons: "Update Email" (primary) | "Cancel" (ghost)

**After successful submission:**
- Collapse the form
- Show info banner: *"A verification email has been sent to your new address. Check your inbox to confirm the change."*
- The banner persists for the session (module-level state on web — iOS can keep it in the view model for the session)

### API

```
POST /api/auth/change-email
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "newEmail": "newemail@example.com",
  "currentPassword": "currentPass123"
}

Response 200:
{ "success": true, "message": "Verification email sent to new address" }

Response 401:
{ "statusMessage": "Current password is incorrect" }

Response 400:
{ "statusMessage": "Invalid request" }

Response 500:
{ "statusMessage": "Failed to change email" }
```

**Error handling:**
- HTTP 401 → "Current password is incorrect."
- Other errors → "Failed to update email."

> **Note:** After a successful email change, Supabase sends a verification email to the new address. The email in the session does NOT update until the user clicks the verification link. Do not update the displayed email until re-auth.

---

## Section 4 — Password

### Form fields

| Field | Type | Required |
|---|---|---|
| Current Password | Secure text | Yes |
| New Password | Secure text | Yes, min 8 chars |
| Confirm New Password | Secure text | Yes, must match new password |

### Validation (client-side before submit)

- All three fields must be non-empty
- New Password and Confirm New Password must match — show "Passwords do not match." inline if they differ
- Do not submit if mismatch

### After success

- Clear all three fields
- Show brief "Password updated!" confirmation text (auto-dismiss)

### API

```
POST /api/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "currentPassword": "oldPass123",
  "newPassword": "newPass456"
}

Response 200:
{ "success": true }

Response 401:
{ "statusMessage": "Current password is incorrect" }

Response 400:
{ "statusMessage": "Invalid request" }

Response 500:
{ "statusMessage": "Failed to change password" }
```

**Error handling:**
- HTTP 401 → "Current password is incorrect."
- Other errors → "Failed to change password."

---

## Section 5 — Athlete Profile *(athletes only)*

This section is a **navigation link only** — it does not contain editable fields inline.

Display:
- Trophy icon (emerald/green accent)
- Title: "Athlete Profile"
- Subtitle: "Manage your recruiting profile — positions, stats, academic scores, and social handles."
- Chevron/arrow → tapping navigates to the existing Athlete Profile / Player Details screen

No API calls on this section.

---

## Section 6 — Data & Privacy

This section manages account deletion. It has three mutually exclusive display states based on deletion status.

### On screen load

Fetch deletion status immediately (non-blocking — if it fails, default to "no pending deletion"):

```
GET /api/account/deletion-status
Authorization: Bearer <access_token>

Response 200:
{ "deletion_requested_at": "2026-03-08T14:00:00Z" }  // or null
```

### State A — No pending deletion (default)

Display:
- Body text: *"You can request deletion of your account and all associated data. Your account will be permanently deleted 30 days after your request, giving you time to change your mind."*
- Button: **"Request Account Deletion"** (destructive/red, outline style)
- Tapping this button transitions to State B (confirmation step — do not call API yet)

### State B — Confirmation step

Display a destructive warning (red background):
- Title: *"This action cannot be easily undone."*
- Bullet list:
  - All your schools, coaches, interactions, and notes will be deleted
  - You will be removed from any shared family units
  - Your account will be permanently deleted after 30 days
  - You may cancel within the 30-day window
- Button: **"Yes, delete my account"** (destructive red, filled)
- Button: **"Cancel"** (ghost/neutral) → returns to State A without API call

Tapping "Yes, delete my account" calls the API and transitions to State C on success.

```
POST /api/account/request-deletion
Authorization: Bearer <access_token>

Response 200:
{ "success": true }
```

### State C — Deletion pending

Display a warning banner (amber/yellow):
- *"Your account is scheduled for deletion on **[date]**."*
- *"All your data will be permanently removed on that date. You can cancel this request before then."*
- Button: **"Cancel Deletion Request"** (outline, neutral)

Compute the deletion date: `deletion_requested_at + 30 days`, formatted as e.g. "April 7, 2026".

Tapping "Cancel Deletion Request" calls the API and returns to State A on success.

```
POST /api/account/cancel-deletion
Authorization: Bearer <access_token>

Response 200:
{ "success": true }

Response 400:
{ "statusMessage": "No pending deletion to cancel" }
```

---

## Database Fields Reference

These are the `users` table fields relevant to this feature (all readable from Supabase Auth or the users table):

```
users
├── id                    uuid
├── full_name             text
├── phone                 text | null
├── date_of_birth         date | null
├── role                  text  ("player" | "parent")
├── email                 text  (from auth.users)
├── profile_photo_url     text | null
└── deletion_requested_at timestamptz | null
```

---

## API Base URL

```
https://therecruitingcompass.com/api/
```

All endpoints require:
```
Authorization: Bearer <supabase_access_token>
```

---

## Error States Summary

| Section | Error | Display |
|---|---|---|
| Photo upload | Any failure | Red inline error below photo area |
| Personal Info | Save failure | Red text below Save button |
| Email | Wrong password | "Current password is incorrect." |
| Email | Other | "Failed to update email." |
| Password | Mismatch | "Passwords do not match." (inline, before submit) |
| Password | Wrong password | "Current password is incorrect." |
| Password | Other | "Failed to change password." |
| Deletion | Request failure | Red text below button |
| Deletion | Cancel failure | Red text below button |

---

## Loading States

Each section manages its own loading state independently:
- Disable all inputs in a section while its request is in-flight
- Show an activity indicator on the primary action button
- Never disable other sections while one is loading
