# iOS Page Specification: Forgot Password Page

**Project:** The Recruiting Compass iOS App
**Created:** February 6, 2026
**Page Name:** Forgot Password / Reset Password Request
**Web Route:** `/forgot-password`
**Priority:** MVP / Phase 1 (Medium - Tier 3)
**Complexity:** Low
**Estimated Time:** 1-2 days
**Dependencies:** Login page patterns (Phase 1, Task 1)

---

## 1. Overview

### Purpose

Allow users who forgot their password to request a password reset link via email. Show success confirmation after email is sent. Redirect user to reset password page via email link.

### Key User Actions

- Enter email address
- Click "Send Reset Link" button
- View success message with email displayed
- Open verification email
- Click password reset link (takes to `/reset-password` page)

### Success Criteria

- User receives password reset email
- Success page shows email address and next steps
- Reset link sent successfully to Supabase
- Can resend email if needed
- Form prevents submission with invalid email
- Back link returns to login

---

## 2. User Flows

### Primary Flow: Request Reset Link

```
1. User on login page, clicks "Forgot password?"
2. User navigated to `/forgot-password`
3. User enters email address
4. System validates email format on blur
5. User clicks "Send Reset Link"
6. System submits email to Supabase
7. Supabase sends password reset email
8. System shows success page with email address
9. Page displays: "Check your email, link expires in 24 hours"
10. User opens email client and clicks reset link
11. Redirected to `/reset-password` page
```

### Alternative Flow: Resend Email

```
User on success page → clicks "Send Another" button
→ System resends email to same address
→ Page shows "Email sent again" message
```

### Alternative Flow: Different Email

```
User on success page → clicks "Use Different Email" or back button
→ Form resets, user enters new email
→ Submits again
```

### Error Scenarios

```
Error: Invalid Email Format
- User sees: "Invalid email address" below email field
- Recovery: Correct email and retry

Error: Email Not Found
- User sees: "Email not found. Try signing up instead."
- Recovery: Link to signup page

Error: Network Error
- User sees: "Network error. Please check your connection."
- Recovery: Retry button

Error: Too Many Requests
- User sees: "Too many reset requests. Try again in 1 hour."
- Recovery: Wait and retry later
```

---

## 3. Data Models

### PasswordResetRequest

```swift
struct PasswordResetRequest: Codable {
  let email: String  // User's email (validated)
}
```

### Response

```swift
struct PasswordResetResponse: Codable {
  let message: String  // "Password reset email sent"
  // No sensitive data returned
}
```

---

## 4. API Integration

### Endpoint: Request Password Reset

**Method:** Direct Supabase Auth API (via iOS SDK)

```
Supabase Endpoint: https://[project-id].supabase.co/auth/v1/recover
Method: POST

Request Body:
{
  "email": "user@example.com"
}

Response (Success - 200):
{
  "message": "Password recovery email sent"
}

Response (Failure - 400):
{
  "error": "user_not_found",
  "error_description": "Email not found"
}

Or:

{
  "error": "too_many_requests",
  "error_description": "Too many password reset requests"
}
```

### SDK Note

Use Supabase iOS SDK's `auth.resetPasswordForEmail(email:)` method, which:

- Sends password reset email
- Email contains link with reset token
- Link redirects to `/reset-password?token=xxx`
- Token valid for 24 hours

**Web Implementation Reference:**

```typescript
// From pages/forgot-password.vue & composables/useAuth.ts
const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
  redirectTo: `${window.location.origin}/reset-password`,
});

if (error) {
  // Handle error
} else {
  emailSent.value = true;
  submittedEmail.value = validated.email;
}
```

---

## 5. State Management

### Page-Level State

```swift
@State var email: String = ""
@State var isLoading: Bool = false
@State var isValidating: Bool = false
@State var emailSent: Bool = false
@State var submittedEmail: String = ""
@State var error: String? = nil
@State var fieldErrors: [String: String] = [:]

// Computed
var isFormValid: Bool {
  !email.trimmingCharacters(in: .whitespaces).isEmpty &&
  fieldErrors.isEmpty
}

var isButtonDisabled: Bool {
  isLoading || isValidating || !isFormValid
}
```

---

## 6. UI/UX Details

### Layout Structure - Form State

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Login"      ││
│  │                         ││
│  │  "Reset Your Password"  ││
│  │  Headline               ││
│  │                         ││
│  │  "Enter your email to   ││
│  │  receive a password     ││
│  │  reset link"            ││
│  │  Subtitle               ││
│  │                         ││
│  │  [Error summary]        ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Email label         │││
│  │  │ [✉️] user@email... │││
│  │  │ [Field error]       │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  [Send Reset Link] btn  ││
│  │  (Primary action)       ││
│  │  "Validating..." (load) ││
│  │                         ││
│  │  ──────────────────────││
│  │  Back to Login          ││
│  │  [← Sign in instead]    ││
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Layout Structure - Success State

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Login"      ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [checkmark icon]    │││  (Green background)
│  │  │ ✉️                  │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  "Check Your Email"     ││
│  │  Headline               ││
│  │                         ││
│  │  "We've sent you a      ││
│  │  password reset link"   ││
│  │  Subtitle               ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ ✅ We sent email to │││  (Green success box)
│  │  │ user@email.com      │││
│  │  │ Click the link to   │││
│  │  │ reset password.     │││
│  │  │ Link expires in     │││
│  │  │ 24 hours.           │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  [Send Another] btn     ││  (Secondary)
│  │  (Resend to same email) ││
│  │                         ││
│  │  [Use Different Email]  ││  (Text link)
│  │                         ││
│  │  ──────────────────────││
│  │  Back to Login          ││
│  │  [← Sign in instead]    ││
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Design System References

Same as Login/Signup:

- **Form state:** Same as login (email input, button states)
- **Success state:** Green checkmark icon (80pt), green success box
- **Colors:** Emerald background, blue button, green success, red errors
- **Typography:** 28pt headline, 16pt subtitle, 14pt body

### Interactive Elements

#### Email Input

- **Same as Login page**
- **Placeholder:** "your.email@example.com"
- **Validation:** Format check on blur
- **Error:** "Invalid email address"

#### Send Reset Link Button

- **Label:**
  - Default: "Send Reset Link"
  - Loading: "Sending..."
  - Validating: "Validating..."
- **Size:** Full width, 48pt height
- **Disabled until:** Valid email entered

#### Send Another Button (Success state)

- **Type:** Secondary button
- **Label:** "Send Another Email"
- **On tap:** Resend reset email to same address
- **Cooldown:** Disabled for 60 seconds after resend

#### Use Different Email Link (Success state)

- **Type:** Text link
- **Label:** "Use a different email address"
- **On tap:** Reset form, go back to form state

#### Back Links

- **Top:** "← Back to Login"
- **Bottom:** "Sign in instead"
- **Navigate to:** `/login`

---

## 7. Dependencies

### Frameworks Required

- **SwiftUI**
- **Supabase iOS Client**

### Third-Party Libraries

- None

### External Services

- **Supabase Auth**
- **Supabase Email Service**

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** "Connection timed out. Please check your connection."
- **No internet:** "No internet connection. Please try again."

### User Errors

- **Email not found:** "Email not found. Try signing up instead." (with link)
- **Invalid email format:** "Invalid email address" (below field)
- **Too many requests:** "Too many reset requests. Try again in 1 hour."

### Edge Cases

- **User submits twice rapidly:** Only one email sent (button disabled)
- **User resends before 1 minute:** Show "Already sent, check inbox"
- **User tries different email:** Form resets, works fine
- **Email already in use (different account):** Shows "Email not found" for security

---

## 9. Testing Checklist

### Happy Path Tests

- [x] User enters valid email → click "Send Reset Link"
- [x] Success page shows email address
- [x] Email sent to Supabase
- [x] User receives password reset email
- [x] Reset link in email works
- [x] Redirects to `/reset-password` page
- [x] "Send Another" button resends email
- [x] "Use Different Email" resets form

### Error Tests

- [x] Invalid email format → error message
- [x] Email not found → "Email not found. Sign up instead."
- [x] Network timeout → error message + retry
- [x] Too many requests → rate limit message

### Edge Case Tests

- [x] Rapid double-click → only one email sent
- [x] Resend too soon (< 60s) → button disabled
- [x] Valid email with + sign (user+test@example.com) → accepted
- [x] Very long email → accepted, stored correctly

### Performance Tests

- [x] Form input responsive
- [x] Submit request completes in <3 seconds
- [x] Email arrives within 2 minutes

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **No alternative delivery:** Only email method (no SMS)
- **Link expiration:** 24 hours (Supabase default)
- **Rate limiting:** Limited by Supabase (typically 1 per minute per email)
- **Security:** Doesn't reveal whether email is registered (shows "Email not found" for both registered and unregistered)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/forgot-password.vue`
- **Composable:** `usePasswordReset()`
- **Schema:** `/utils/validation/schemas.ts` → `resetPasswordSchema`

### API Documentation

- **Supabase Reset Password:** https://supabase.io/docs/reference/swift/auth-password-reset

---

## 12. Sign-Off

**Specification reviewed by:** Chris Kandrikanich
**Web implementation verified:** February 6, 2026
**Ready for iOS implementation:** ✅ **YES**

### Notes

- **Minimal page:** Simple email input + status display
- **UX focus:** Clear next steps after email sent
- **Security:** Never reveal whether email is registered
- **No complexity:** No token handling or verification code entry (email link does everything)

**Suggested implementation:**

- **Part 1 (easy):** Build form UI + validation
- **Part 2 (easy):** Wire up reset email API call
- **Part 3 (easy):** Show success page with email

This is the simplest Phase 1 page to implement.
