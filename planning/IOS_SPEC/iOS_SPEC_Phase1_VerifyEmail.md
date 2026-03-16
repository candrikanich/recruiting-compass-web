# iOS Page Specification: Email Verification Page

**Project:** The Recruiting Compass iOS App
**Created:** February 6, 2026
**Page Name:** Verify Email
**Web Route:** `/verify-email`
**Priority:** MVP / Phase 1 (High - Tier 2)
**Complexity:** Low
**Estimated Time:** 1 day
**Dependencies:** Signup page (Phase 1, Task 2)

---

## 1. Overview

### Purpose

Allow newly signed-up users to verify their email address. Display verification status and automatically poll for confirmation. User can resend verification email if needed.

### Key User Actions

- View email verification status
- Wait for email to arrive
- Click verification link in email (happens outside app)
- See confirmation when email is verified
- Optionally resend verification email
- Navigate to dashboard when verified

### Success Criteria

- Verification status checked automatically on page load
- Real-time polling for verification completion (every 2 seconds)
- Clear messaging about what to do
- Success state allows navigation to dashboard
- User can resend verification email
- Loading spinner shows while checking
- Graceful error handling if verification fails

---

## 2. User Flows

### Primary Flow: Standard Verification

```
1. User completes signup
2. User navigated to `/verify-email`
3. Page loads and shows "pending" state
4. Page shows: "Check your email for a verification link"
5. Page displays user's email address
6. System starts polling Supabase every 2 seconds
7. User clicks link in email (outside the app)
8. Supabase updates `email_confirmed_at` field
9. App detects verification and shows "verified" state
10. Page shows: "Your email has been verified!"
11. User taps "Go to Dashboard" button
12. User navigates to `/dashboard`
```

### Alternative Flow: Email Not Arrived

```
1. User sees "pending" state
2. User waits but email doesn't arrive
3. User taps "Resend verification email" button
4. System sends new verification email
5. User receives email (may arrive quicker)
6. User clicks link
7. Verification completes (same as primary flow)
```

### Alternative Flow: User Not Logged In / Session Expired

```
User navigates to `/verify-email` without active session
→ Redirect to `/login` (not auth'd)
```

### Error Scenarios

```
Error: Verification Check Failed
- User sees: "Unable to check verification status. Try again."
- Recovery: Manual retry button

Error: Resend Failed
- User sees: "Failed to resend verification email. Try again."
- Recovery: Retry button in banner

Error: Network Error
- User sees: "Network error. Checking again..."
- Recovery: Auto-retry with backoff
```

---

## 3. Data Models

### VerificationStatus

```swift
struct VerificationStatus: Codable {
  let isVerified: Bool
  let userEmail: String
  let emailConfirmedAt: String?  // ISO 8601 datetime, null if not verified
}
```

No mutations needed; read-only operation.

---

## 4. API Integration

### Endpoint: Check Verification Status

**Method:** Fetch current session user (built into Supabase SDK)

```
Supabase Method: auth.refreshSession() or auth.user

No explicit API call needed - SDK tracks `user.email_confirmed_at`:
- null = not verified
- timestamp = verified at this time

Response (User Object):
{
  "id": "12345678-1234-1234-1234-123456789012",
  "email": "user@example.com",
  "email_confirmed_at": null,     // null = not verified
  "created_at": "2024-01-20T15:30:00Z"
}

or (after verification):

{
  "id": "12345678-1234-1234-1234-123456789012",
  "email": "user@example.com",
  "email_confirmed_at": "2024-01-20T15:35:00Z",  // verified!
  "created_at": "2024-01-20T15:30:00Z"
}
```

### Endpoint: Resend Verification Email

**Method:** Direct Supabase Auth API (via iOS SDK)

```
Supabase Endpoint: https://[project-id].supabase.co/auth/v1/resend
Method: POST

Request Body:
{
  "type": "signup",
  "email": "user@example.com"
}

Response (Success - 200):
{
  "message": "Verification email sent"
}

Response (Failure):
{
  "error": "email_not_found",
  "error_description": "Email not found"
}

Or:

{
  "error": "too_many_requests",
  "error_description": "Too many requests. Try again after 60 seconds"
}
```

### SDK Note

- Use `auth.refreshSession()` to poll verification status
- Use `auth.resend(type: "signup", email: "...")` to resend email
- Don't call constantly; implement exponential backoff (start 2s, max 10s)

**Web Implementation Reference:**

```typescript
// From pages/verify-email.vue
const emailVerification = await useEmailVerification();

// Poll every 2 seconds
const checkVerification = async () => {
  const { data } = await supabase.auth.refreshSession();
  const isVerified = !!data.session.user?.email_confirmed_at;
  return isVerified;
};

// Resend
const resendEmail = async () => {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: userEmail.value,
  });
};
```

---

## 5. State Management

### Page-Level State

```swift
@State var userEmail: String? = nil
@State var isVerified: Bool = false
@State var isChecking: Bool = false
@State var checkError: String? = nil
@State var resendError: String? = nil
@State var resendSuccess: Bool = false
@State var lastCheckTime: Date? = nil

// Polling
@State private var checkTimer: Timer? = nil
private let checkInterval: TimeInterval = 2.0  // Poll every 2 seconds
```

### Global State

Extract email from AuthManager:

```swift
@EnvironmentObject var authManager: AuthManager

var userEmail: String? {
  authManager.user?.email
}
```

---

## 6. UI/UX Details

### Layout Structure - Pending State

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Welcome"    ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [spinning icon]     │││  (Animated spinner)
│  │  │ 📧                  │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  "Verify Your Email"    ││
│  │  Headline               ││
│  │                         ││
│  │  "Check your email for" ││
│  │  "a verification link"  ││
│  │  Subtitle               ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ ℹ️ Checking...       │││  (Blue info box)
│  │  │ status...           │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ ⏱️ We sent a        │││  (Yellow info box)
│  │  │ verification email  │││
│  │  │ to: user@email.com  │││
│  │  │ Click the link to   │││
│  │  │ confirm your        │││
│  │  │ account.            │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [Resend Email] btn  │││
│  │  │ Didn't get email?   │││
│  │  └─────────────────────┘││
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Layout Structure - Verified State

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Welcome"    ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [checkmark icon]    │││  (Green background)
│  │  │ ✅                  │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  "Verified!"            ││
│  │  Success Headline       ││
│  │                         ││
│  │  "Your email has been"  ││
│  │  "verified!"            ││
│  │  Subtitle               ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ ✅ Welcome! Your    │││  (Green success box)
│  │  │ email is verified   │││
│  │  │ You can now access  │││
│  │  │ all features        │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  [Go to Dashboard] btn  ││
│  │  (Primary action)       ││
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Design System References

Same as Login/Signup:

- **Colors:**
  - Pending: Yellow/amber (warning)
  - Checking: Blue (info)
  - Verified: Green (success)
- **Icons:**
  - Pending: Envelope icon (amber)
  - Checking: Spinner (blue, animated)
  - Verified: Checkmark (green)
- **Typography:** 28pt headline, 16pt subtitle, 14pt body

### Interactive Elements

#### Status Icon (Animated)

- **Pending:** Envelope icon, amber background, static
- **Checking:** Spinner icon, blue background, rotating animation
- **Verified:** Checkmark icon, green background, static
- **Size:** 80pt × 80pt

#### Status Messages

- **Blue box (checking):** Shows polling status
- **Yellow box (pending):** Shows email address, instructions
- **Green box (verified):** Shows success message
- **Red box (error):** Shows error message

#### Resend Button

- **Type:** Secondary button
- **Label:** "Resend Verification Email"
- **Visible:** Always (but disabled if recently sent)
- **Cooldown:** Disabled for 60 seconds after resending
- **On tap:** Send resend request, show success message

#### Go to Dashboard Button

- **Type:** Primary button (only visible when verified)
- **Label:** "Go to Dashboard"
- **On tap:** Navigate to `/dashboard`
- **Visible only:** After verification

#### Back Link

- **Type:** Text link
- **Label:** "← Back to Welcome"
- **On tap:** Navigate to `/`

---

## 7. Dependencies

### Frameworks Required

- **SwiftUI**
- **Supabase iOS Client**

### Third-Party Libraries

- None

### External Services

- **Supabase Auth** (session tracking)
- **Supabase Email Service** (resend verification)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout checking:** Continue polling with backoff
- **No internet:** Show offline message, keep polling
- **Resend failed:** Show error message, allow retry

### User Errors

- **Didn't receive email:** Resend button available
- **Email went to spam:** Suggest checking spam folder
- **Clicked "Back":** App remembers they're unverified, redirects to verify page

### Edge Cases

- **User deletes email:** Email verification permanently fails (account locked?)
- **Multiple resends:** Show "sent, check your inbox" message
- **User closes app mid-verify:** Resume checking when they return
- **Very slow internet:** Polling continues, user sees "Checking..." state
- **Email verified outside app:** Next polling check detects it
- **User attempts to access dashboard unverified:** Redirect back to verify page

---

## 9. Testing Checklist

### Happy Path Tests

- [x] Page loads with "pending" state
- [x] Shows user's email address
- [x] Polling runs every 2 seconds
- [x] Status icon is animated spinner
- [x] After verification, shows "verified" state
- [x] Checkmark icon visible when verified
- [x] "Go to Dashboard" button appears when verified
- [x] Button tap navigates to dashboard

### Error Tests

- [x] Network error during polling → show error, keep trying
- [x] Resend fails → show error message, allow retry
- [x] Verification check fails → show retry button
- [x] No internet → show offline message

### Edge Case Tests

- [x] Very fast verification (user clicks link immediately) → detected quickly
- [x] Very slow verification (user waits 5 minutes) → eventually detected
- [x] User resends email multiple times → show "already sent" message
- [x] User backgrounds app → resume polling when returning
- [x] User manually verified in Supabase → detected next polling cycle

### Performance Tests

- [x] Polling doesn't drain battery
- [x] No memory leaks with repeated polling
- [x] Responsive to user actions

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Email delivery:** Can take up to 60 seconds
- **Link expiration:** Verification link expires after 24 hours (Supabase default)
- **Resend cooldown:** Limited by Supabase rate limiting (typically 1 per minute)
- **No manual verification code:** User must click email link (no SMS or TOTP alternative)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/verify-email.vue`
- **Composable:** `useEmailVerification()`

### API Documentation

- **Supabase Resend:** https://supabase.io/docs/reference/swift/auth-resend

---

## 12. Sign-Off

**Specification reviewed by:** Chris Kandrikanich
**Web implementation verified:** February 6, 2026
**Ready for iOS implementation:** ✅ **YES**

### Notes

- **Polling strategy:** Start with 2-second interval, back off to 10 seconds if repeated failures
- **Timer management:** Stop polling when verified or user leaves page
- **Resend rate limit:** Disable button for 60 seconds after resend
- **Minimal page:** User shouldn't need to do much here; auto-polling is key

**Suggested implementation:**

- **First:** Build UI (pending/checking/verified states)
- **Second:** Implement polling loop
- **Third:** Add resend functionality + error handling
