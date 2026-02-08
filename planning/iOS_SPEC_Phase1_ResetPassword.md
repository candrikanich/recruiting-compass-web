# iOS Page Specification: Reset Password Page

**Project:** The Recruiting Compass iOS App
**Created:** February 6, 2026
**Page Name:** Reset Password / Confirm Password Reset
**Web Route:** `/reset-password?token=xxxxx`
**Priority:** MVP / Phase 1 (High - Tier 4)
**Complexity:** Medium
**Estimated Time:** 2 days
**Dependencies:** Forgot Password page (Phase 1, Task 4)

---

## 1. Overview

### Purpose

Allow users to set a new password after clicking a reset link from their email. Validate the reset token, display password requirements in real-time, and confirm the password change. Complete the password recovery workflow.

### Key User Actions

- User clicks reset link from email (contains token)
- Page validates token and loads form
- User enters new password
- User sees real-time password strength checklist (✓ checks off as requirements met)
- User confirms password (must match)
- User taps "Reset Password" button
- See success confirmation or error message
- Navigate to login page to sign in with new password

### Success Criteria

- Token validation happens on page load
- Password strength requirements displayed with live checkmarks
- Show/hide password toggle for both fields
- Passwords must match before submission
- Successful reset shows green success state
- Invalid/expired token shows red error state
- User navigated to login after successful reset
- Password change confirmed in Supabase

---

## 2. User Flows

### Primary Flow: Valid Token & Password Reset

```
1. User receives password reset email
2. User clicks "Reset Password" link in email
3. Link includes token: /reset-password?token=eyJ...
4. Page loads and extracts token from URL
5. System validates token with Supabase (should succeed if <24 hours old)
6. Page shows form: "Create New Password"
7. User enters new password (8+ chars, upper, lower, number)
8. Password strength checklist updates in real-time:
   ✓ At least 8 characters
   ✓ One uppercase letter
   ✓ One lowercase letter
   ✓ One number
9. User enters confirm password (must match)
10. Both match indicator shows ✓
11. User taps "Reset Password" button
12. System calls POST /api/auth/confirm-password-reset with new password
13. Supabase updates password and invalidates reset token
14. Page shows green success state: "Password Reset"
15. System navigates to `/login` after 2-3 seconds
16. User can now login with new password
```

### Alternative Flow: Expired Token

```
1. User clicks reset link from email
2. But token is >24 hours old
3. Page validates token and detects expiration
4. Page shows red error state: "Invalid Link"
5. Message: "This reset link is invalid or has expired"
6. Button: "Request New Reset Link" → Navigate to `/forgot-password`
```

### Alternative Flow: Wrong/Tampered Token

```
1. User clicks malformed or manually-edited link
2. Token is invalid format
3. Page detects invalid token on load
4. Page shows red error state: "Invalid Link"
5. Message: "This reset link is invalid or has expired"
6. Recovery: "Request New Reset Link" button
```

### Error Scenarios

```
Error: Token Missing from URL
- User sees: "Invalid reset link. Please request a new password reset."
- Recovery: Back to login or forgot password page

Error: Invalid Token Format
- User sees: "Invalid reset link. Please request a new password reset."
- Recovery: Request new link

Error: Token Expired (>24 hours)
- User sees: "This reset link is invalid or has expired"
- Recovery: "Request New Reset Link" button → /forgot-password

Error: Password Too Weak
- User sees: "Must be 8+ characters with uppercase, lowercase, and a number"
- Recovery: Strengthen password before submitting

Error: Passwords Don't Match
- User sees: "Passwords don't match" below confirm password
- Recovery: Re-enter confirm password

Error: Network Error
- User sees: "Failed to reset password. Please try again."
- Recovery: Retry button

Error: Single-Use Token Already Used
- User sees: "Reset link has already been used. Request a new one."
- Recovery: Resend password reset email
```

---

## 3. Data Models

### ResetPasswordRequest

```swift
struct ResetPasswordRequest: Codable {
  let password: String         // New password (validated)
}

struct ResetPasswordResponse: Codable {
  let success: Bool
  let message: String          // "Password has been reset successfully..."
}
```

### PasswordStrengthChecklist

```swift
struct PasswordStrength: Hashable {
  let hasMinLength: Bool       // >= 8 characters
  let hasUppercase: Bool       // At least one A-Z
  let hasLowercase: Bool       // At least one a-z
  let hasNumber: Bool          // At least one 0-9

  var isValid: Bool {
    hasMinLength && hasUppercase && hasLowercase && hasNumber
  }
}
```

---

## 4. API Integration

### Endpoint 1: Validate Token (Implicit via Supabase)

**Method:** Supabase Auth via iOS SDK

```
When user opens app with reset link:
supabase://app?token=eyJ...

iOS SDK automatically:
- Extracts token from deep link
- Calls Supabase auth.signInWithOtp(token:) internally
- Validates token (expires in 24 hours, single-use)
- Creates temporary session if valid
- Returns error if invalid/expired
```

### Endpoint 2: Confirm Password Reset

**Method:** Custom API endpoint

```
POST /api/auth/confirm-password-reset

Request Headers:
{
  "Authorization": "Bearer [reset-token-from-session]",
  "Content-Type": "application/json"
}

Request Body:
{
  "password": "[new_password]"
}

Response (Success - 200):
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}

Response (Failure - 400):
{
  "statusCode": 400,
  "statusMessage": "Password does not meet requirements"
}

Or (Failure - 401):
{
  "statusCode": 401,
  "statusMessage": "Invalid or expired reset link. Please request a new password reset."
}

Or (Failure - 410):
{
  "statusCode": 410,
  "statusMessage": "Reset link has expired. Please request a new password reset."
}
```

### SDK Note

- **Deep Link Handling:** iOS must extract token from deep link `recruiting-compass://reset-password?token=xxx`
- **Session Creation:** Supabase creates temporary session when token is valid
- **Token Validation:** Supabase validates:
  - Token format (JWT)
  - Expiration (24 hours from creation)
  - Single-use (token invalidated after use or timeout)
- **Password Update:** Call `auth.updateUser(password:)` with session from reset token

**Web Implementation Reference:**

```typescript
// From pages/reset-password.vue
const { data, error: tokenError } = await supabase.auth.verifyOtp({
  token_hash: route.query.token_hash,
  type: "recovery",
});

if (error) {
  invalidToken.value = true;
}

const { error: updateError } = await supabase.auth.updateUser({
  password: validated.password,
});

if (!updateError) {
  passwordUpdated.value = true;
  // Navigate to /login after 2 seconds
}
```

---

## 5. State Management

### Page-Level State

```swift
@State var password: String = ""
@State var confirmPassword: String = ""
@State var showPassword: Bool = false
@State var isLoading: Bool = false
@State var isValidating: Bool = false
@State var passwordUpdated: Bool = false
@State var invalidToken: Bool = false
@State var errorMessage: String? = nil
@State var fieldErrors: [String: String] = [:]

// Computed: Password strength
var passwordStrength: PasswordStrength {
  PasswordStrength(
    hasMinLength: password.count >= 8,
    hasUppercase: password.contains { $0.isUppercase },
    hasLowercase: password.contains { $0.isLowercase },
    hasNumber: password.contains { $0.isNumber }
  )
}

// Computed: Passwords match
var passwordsMatch: Bool {
  !password.isEmpty && password == confirmPassword
}

// Computed: Form valid
var isFormValid: Bool {
  passwordStrength.isValid && passwordsMatch && fieldErrors.isEmpty
}
```

### Deep Link / URL Parameter Extraction

```swift
// Extract token from deep link URL
@State var resetToken: String? = nil

// In onAppear or onOpenURL:
func handleDeepLink(_ url: URL) {
  if let token = URLComponents(url: url, resolvingAgainstBaseURL: true)?
    .queryItems?
    .first(where: { $0.name == "token" })?.value {
    resetToken = token
    validateToken(token)
  }
}

func validateToken(_ token: String) async {
  isValidating = true
  defer { isValidating = false }

  do {
    // Validate token with Supabase
    let session = try await supabaseClient.auth.session(token: token)
    // Success: token is valid, session created
    invalidToken = false
  } catch {
    // Token invalid or expired
    invalidToken = true
    errorMessage = "Invalid or expired reset link. Please request a new password reset."
  }
}
```

---

## 6. UI/UX Details

### Layout Structure - Loading/Validating State

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Login"      ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [spinner]           │││  (Blue background, animated)
│  │  │ ⏳                  │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  "Validating..."        ││
│  │  "Please wait"          ││
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Layout Structure - Form State (Valid Token)

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Login"      ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [lock icon]         │││  (Amber background)
│  │  │ 🔐                  │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  "Create New Password"  ││
│  │  "Enter your new        ││
│  │   password below"       ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ New Password        │││
│  │  │ [🔒] .........[👁️] │││  (Show/hide toggle)
│  │  │ [Field error]       │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Confirm Password    │││
│  │  │ [🔒] .........[👁️] │││  (Show/hide toggle)
│  │  │ [Field error]       │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Password must:      │││  (Strength checklist)
│  │  │ ✓ 8+ characters     │││  (Updates in real-time)
│  │  │ ✓ Uppercase letter  │││
│  │  │ ✓ Lowercase letter  │││
│  │  │ ✓ One number        │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  [Reset Password] btn   ││
│  │  "Resetting..."         ││
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
│  │  │ ✅                  │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  "Password Reset"       ││
│  │  Headline               ││
│  │                         ││
│  │  "Your password has     ││
│  │   been successfully     ││
│  │   reset"                ││
│  │  Subtitle               ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ ✅ Your password    │││  (Green success box)
│  │  │ has been            │││
│  │  │ successfully reset   │││
│  │  │ You can now log in   │││
│  │  │ with your new        │││
│  │  │ password.            │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  "Redirecting to login" ││
│  │  [spinner] 3s countdown ││
│  │                         ││
│  │  [Sign In Now] btn      ││
│  │  (Skip wait)            ││
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Layout Structure - Error State

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Login"      ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [error icon]        │││  (Red background)
│  │  │ ⚠️                  │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  "Invalid Link"         ││
│  │  Headline               ││
│  │                         ││
│  │  "This reset link is    ││
│  │   invalid or has        ││
│  │   expired"              ││
│  │  Subtitle               ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ ❌ Invalid or       │││  (Red error box)
│  │  │ expired reset link  │││
│  │  │ Please request a    │││
│  │  │ new password reset. │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  [Request New Link] btn ││
│  │  (Navigate to forgot-   ││
│  │   password)             ││
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

Same as other auth pages:

- **Colors:**
  - Validating: Blue (info)
  - Form: Amber (warning/caution)
  - Success: Green
  - Error: Red
- **Icons:**
  - Validating: Spinner (blue, animated)
  - Form: Lock icon (amber)
  - Success: Checkmark (green)
  - Error: Alert/Warning (red)
- **Typography:** 28pt headline, 16pt subtitle, 14pt body

### Interactive Elements

#### Password Input

- **Type:** Secure text field (masked by default)
- **Icon:** Lock icon (left)
- **Show/Hide Toggle:** Eye icon (right, toggles password visibility for BOTH fields)
- **Placeholder:** "Enter your new password"
- **Max length:** 255 characters
- **Validation trigger:** On blur and while typing
- **Real-time feedback:** Strength checklist updates as user types

#### Confirm Password Input

- **Same as password input**
- **Placeholder:** "Confirm your new password"
- **Validation:** Must match password field exactly
- **Real-time:** Shows ✓ when match confirmed

#### Password Strength Checklist

- **Visual:** List with checkbox icons
- **Updates:** Real-time as user types
- **Checks:**
  - ✓ At least 8 characters
  - ✓ One uppercase letter
  - ✓ One lowercase letter
  - ✓ One number
- **Colors:**
  - Unchecked: Gray circle outline
  - Checked: Green checkmark + darker text
  - Unchecked: Light gray text

#### Show/Hide Password Toggle

- **Type:** Button with eye icon
- **Location:** Right side of both password fields
- **Action:** Toggle shows/hides BOTH password fields simultaneously
- **Icon:** Eye (when hidden) / Eye-Slash (when visible)
- **Color:** Slate-400 normal, darker on hover

#### Reset Password Button

- **Label:**
  - Default: "Reset Password"
  - Loading: "Resetting..."
- **Size:** Full width, 48pt height
- **Disabled until:** Password strength valid + passwords match
- **States:** Normal, loading (spinner), disabled

#### Request New Link Button (Error state)

- **Type:** Primary button
- **Label:** "Request New Reset Link"
- **On tap:** Navigate to `/forgot-password`

#### Sign In Now Button (Success state)

- **Type:** Secondary button
- **Label:** "Sign In Now"
- **On tap:** Navigate to `/login` immediately (skip auto-redirect countdown)

---

## 7. Dependencies

### Frameworks Required

- **SwiftUI**
- **Supabase iOS Client**
- **Deep Link Handling** (iOS URLSession for handling reset link)

### Third-Party Libraries

- None

### External Services

- **Supabase Auth** (token validation, password update)

---

## 8. Error Handling & Edge Cases

### Token Errors

- **No token in URL:** "Invalid reset link" error
- **Invalid token format:** "Invalid reset link" error
- **Expired token (>24h):** "Reset link has expired" error (specific message)
- **Single-use token already used:** "Reset link has already been used. Request a new one." error
- **Token tampered/modified:** "Invalid or expired reset link" error

### Network Errors

- **Timeout during token validation:** "Unable to validate reset link. Please check your connection."
- **Timeout during password update:** "Failed to reset password. Please try again."
- **No internet:** "No internet connection. Please try again."

### Password Validation Errors

- **Password too short (<8 chars):** "Must be at least 8 characters"
- **No uppercase:** "Must contain at least one uppercase letter"
- **No lowercase:** "Must contain at least one lowercase letter"
- **No number:** "Must contain at least one number"
- **Passwords don't match:** "Passwords don't match"

### User Errors

- **Didn't enter confirm password:** Form submission blocked
- **Pasted wrong password in confirm:** Show error and clear field

### Edge Cases

- **Very long password (>255 chars):** Accept up to 255, truncate display
- **Spaces in password:** Allow
- **Special characters in password:** Allow (Supabase allows any UTF-8)
- **User backgrounds app during reset:** Request completes, show result when they return
- **User tries to use token twice:** "Reset link has already been used" error
- **Deep link with wrong query param name:** "Invalid reset link" error

---

## 9. Testing Checklist

### Happy Path Tests

- [x] Token validation on page load succeeds
- [x] Form shows for valid token
- [x] Password strength checklist updates in real-time
- [x] Checkmarks appear as requirements met
- [x] Show/hide password toggle works for both fields
- [x] Passwords must match before submit enabled
- [x] Password reset API call succeeds
- [x] Success state shows with checkmark icon
- [x] Auto-redirects to login after 2-3 seconds
- [x] Manual "Sign In Now" button skips wait

### Token Error Tests

- [x] No token in URL → error state
- [x] Invalid token format → error state
- [x] Expired token (>24h) → "expired" error message
- [x] Token already used → specific error message
- [x] Tampered token → error state

### Password Validation Tests

- [x] Password <8 chars → error: "at least 8 characters"
- [x] No uppercase → error: "uppercase letter"
- [x] No lowercase → error: "lowercase letter"
- [x] No number → error: "one number"
- [x] Passwords don't match → error + clear confirm field
- [x] Passwords do match → checkmark shows, button enabled

### Network Error Tests

- [x] Token validation timeout → error message
- [x] Password update timeout → error message
- [x] No internet → offline message
- [x] Network error during reset → retry button

### Edge Case Tests

- [x] Very long password (>100 chars) → accepts, resets correctly
- [x] Spaces in password → accepts
- [x] Special characters (!, @, #, etc.) → accepts
- [x] Unicode characters (é, ñ, etc.) → accepts
- [x] Rapid button clicks → only one submission
- [x] User backgrounds app mid-reset → completes, shows result
- [x] Eye toggle affects both fields → both hidden/shown together
- [x] Deep link from email → token extracted and validated

### Performance Tests

- [x] Password strength checks update in <100ms
- [x] Password reset completes in <3 seconds
- [x] No lag when typing password
- [x] No memory leaks when navigating away

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Token validation:** Supabase validates (24-hour expiration, single-use)
- **Password strength:** Only requires 8+ chars with mixed case + number (no special chars)
- **Password update:** Happens immediately after validation (no confirmation delay)
- **Token single-use:** Cannot be used twice (even if user navigates away and back)
- **Auto-redirect:** Happens after 2-3 seconds; user can click "Sign In Now" to skip
- **Show/Hide toggle:** Affects BOTH password fields simultaneously (not independent)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/reset-password.vue`
- **Composable:** `usePasswordReset()`
- **API endpoint:** `/server/api/auth/confirm-password-reset.post.ts`
- **Schema:** `/utils/validation/schemas.ts` → `resetPasswordSchema`

### API Documentation

- **Supabase Update User:** https://supabase.io/docs/reference/swift/auth-update-user
- **Password Reset:** https://supabase.io/docs/reference/swift/auth-password-reset

---

## 12. Sign-Off

**Specification reviewed by:** Chris Kandrikanich
**Web implementation verified:** February 6, 2026
**Ready for iOS implementation:** ✅ **YES**

### Notes

- **Deep link handling:** iOS must configure URL scheme to receive `recruiting-compass://reset-password?token=xxx` links from email
- **Token validation:** Happens automatically; show loading spinner while validating
- **Password strength:** Real-time visual feedback is key UX (users see checkmarks appear)
- **Show/Hide toggle:** Affects both fields to avoid confusion
- **Success redirect:** Auto-redirect to login after 2-3 seconds, but allow manual "Sign In Now" skip
- **Error recovery:** "Request New Reset Link" button takes user to forgot-password page

**Suggested implementation:**

- **Part 1:** Deep link handling + token validation UI
- **Part 2:** Password form + real-time strength checklist
- **Part 3:** Password reset API call + success/error states + navigation

**This completes Phase 1 Auth Foundation! After this, the core authentication system is fully functional.**
