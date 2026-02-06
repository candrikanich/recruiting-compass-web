# iOS Page Specification: Login Page

**Project:** The Recruiting Compass iOS App
**Created:** February 6, 2026
**Page Name:** Login
**Web Route:** `/login`
**Priority:** MVP / Phase 1 (Critical - Foundation)
**Complexity:** Medium
**Estimated Time:** 2-3 days

---

## 1. Overview

### Purpose

Authenticate users into the app using their email and password. Establish the foundation for all subsequent auth-dependent features. This page is the primary entry point for returning users.

### Key User Actions

- Enter email address
- Enter password
- Optionally check "Remember me" to enable local credential storage
- Click "Sign In" to authenticate
- Click "Forgot password?" to begin password reset
- Click "Create one now" to navigate to signup

### Success Criteria

- User successfully logs in with valid credentials
- Session persists after login (using iOS Keychain)
- User is navigated to `/dashboard` on successful login
- Error messages are displayed for invalid credentials or network issues
- Form validation prevents submission with invalid data
- "Remember me" checkbox enables local credential caching (optional but recommended)

---

## 2. User Flows

### Primary Flow

```
1. User opens the app (not authenticated)
2. App shows Login screen
3. User enters email and taps "Email" field
4. System validates email format (real-time on blur)
5. User enters password and taps "Password" field
6. System validates password length (real-time on blur)
7. User optionally taps "Remember me" checkbox
8. User taps "Sign In" button
9. System submits credentials to Supabase Auth
10. Supabase validates credentials
11. On success:
    - System stores session token in Keychain
    - System initializes user context/stores
    - App navigates to /dashboard
12. On failure:
    - System displays error message
    - User can retry
```

### Alternative Flow: Forgotten Email/Password

```
User clicks "Forgot password?"
→ Navigate to /forgot-password page (Phase 1, Task 4)
```

### Alternative Flow: New User

```
User clicks "Create one now"
→ Navigate to /signup page (Phase 1, Task 2)
```

### Alternative Flow: Session Timeout

```
User was logged in but session expired (inactivity)
→ LoginPage receives ?reason=timeout query param
→ Display yellow banner: "You were logged out due to inactivity. Please log in again."
→ User re-enters credentials
```

### Error Scenarios

```
Error: Invalid Email Format
- User sees: "Invalid email address" below email field
- Recovery: User corrects email and re-validates (blur event)

Error: Password Too Short
- User sees: "Password must be at least 8 characters" below password field
- Recovery: User corrects password and re-validates

Error: Invalid Credentials
- User sees: "Invalid email or password" in error summary
- Recovery: User re-enters credentials and retries

Error: Network Timeout
- User sees: "Network error. Please check your connection and try again."
- Recovery: Retry button in error message

Error: Server Error (5xx)
- User sees: "Server error. Please try again later."
- Recovery: Retry button, or user can try again after waiting

Error: Too Many Attempts
- User sees: "Too many login attempts. Please try again in [X minutes]." (Supabase default)
- Recovery: Wait for cooldown period, then retry
```

---

## 3. Data Models

### User Model (Returned on Success)

```swift
struct User: Codable {
  let id: String                 // UUID from Supabase auth.users.id
  let email: String              // User's email address
  let emailConfirmedAt: String?  // ISO 8601 datetime or null
  let phone: String?             // Optional phone number
  let userMetadata: [String: Any]?  // Custom metadata (not used on login)
  let createdAt: String          // ISO 8601 datetime
  let updatedAt: String          // ISO 8601 datetime
}

struct Session: Codable {
  let accessToken: String        // JWT token for API requests
  let refreshToken: String       // Token to refresh session
  let expiresIn: Int             // Seconds until token expires
  let expiresAt: Int             // Unix timestamp of expiration
  let tokenType: String          // Always "Bearer"
  let user: User                 // User object (see above)
}
```

### Related Models

- **AuthError** (from Supabase):
  - `invalid_credentials` - Email/password combination not found
  - `user_not_found` - Email not registered
  - `invalid_grant` - Generic auth failure
  - `too_many_requests` - Rate limited (wait before retry)
  - Network errors (timeout, no connectivity)

---

## 4. API Integration

### Endpoint: Authenticate User

**Method:** Direct Supabase Auth API (via iOS SDK)

```
Supabase Endpoint: https://[project-id].supabase.co/auth/v1/token
Method: POST

Request Headers:
{
  "apikey": "[SUPABASE_ANON_KEY]",
  "Content-Type": "application/json"
}

Request Body:
{
  "email": "user@example.com",
  "password": "[user_password]",
  "grant_type": "password"
}

Response (Success - 200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rfsh_xxx",
  "user": {
    "id": "12345678-1234-1234-1234-123456789012",
    "aud": "authenticated",
    "role": "authenticated",
    "email": "user@example.com",
    "email_confirmed_at": "2024-01-15T10:30:00Z",
    "phone": null,
    "confirmed_at": "2024-01-15T10:30:00Z",
    "last_sign_in_at": "2024-01-20T14:25:00Z",
    "app_metadata": {
      "provider": "email",
      "providers": ["email"]
    },
    "user_metadata": null,
    "identities": [
      {
        "id": "12345678-1234-1234-1234-123456789012",
        "user_id": "12345678-1234-1234-1234-123456789012",
        "identity_data": {
          "email": "user@example.com",
          "sub": "12345678-1234-1234-1234-123456789012"
        },
        "provider": "email",
        "last_sign_in_at": "2024-01-20T14:25:00Z",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-20T14:25:00Z"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:25:00Z"
  }
}

Response (Failure - 400/401):
{
  "error": "invalid_credentials",
  "error_description": "Invalid email or password"
}

Or:

{
  "error": "too_many_requests",
  "error_description": "Too many login attempts, please try again after 10 minutes"
}

Common Error Codes:
- 400: Invalid request (bad email format, missing fields)
- 401: Authentication failed (wrong password, user not found, account disabled)
- 429: Too many requests (rate limited)
- 500: Server error (Supabase infrastructure issue)
```

### SDK Note

Use the Supabase iOS SDK's `auth.signIn(email:password:)` method, which:

- Automatically handles the HTTP request
- Manages token storage in Keychain (if SDK is configured)
- Throws `AuthError` on failure
- Returns `AuthResponse` with `user` and `session` on success

**Web Implementation Reference:**

```typescript
// From pages/login.vue & composables/useAuth.ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: email.value,
  password: password.value,
});

if (error) {
  // Handle error (invalid_credentials, network error, etc.)
}

if (data.user) {
  // Save session, store user, navigate
}
```

### Authentication

- **Method:** OAuth2 Password Grant (Supabase handles internally)
- **Token Storage:** iOS Keychain via Supabase SDK (automatic)
- **Session Persistence:** Keychain + in-memory cache
- **Refresh Token:** Supabase SDK manages token refresh automatically
- **Logout:** Delete Keychain entry + clear session

---

## 5. State Management

### Page-Level State

```swift
@State var email: String = ""
@State var password: String = ""
@State var rememberMe: Bool = false
@State var isLoading: Bool = false
@State var isValidating: Bool = false
@State var errorMessage: String? = nil
@State var fieldErrors: [String: String] = [:]  // email, password errors

// Computed properties
var isFormValid: Bool {
  !email.trimmingCharacters(in: .whitespaces).isEmpty &&
  !password.isEmpty &&
  fieldErrors.isEmpty
}

var isButtonDisabled: Bool {
  isLoading || isValidating || !isFormValid
}
```

### Shared Global State (AuthManager)

After successful login, populate:

```swift
@MainActor
class AuthManager: ObservableObject {
  @Published var user: User? = nil
  @Published var session: Session? = nil
  @Published var isAuthenticated: Bool = false

  // After login:
  self.user = loginResponse.user
  self.session = loginResponse.session
  self.isAuthenticated = true
}
```

### Persistence Across Navigation

- **Email field value**: Clear on page dismiss (new login attempt each time)
- **"Remember me" state**: Optional - if implemented, save to UserDefaults
- **Session token**: Persists in Keychain (across app restarts)
- **Timeout banner**: Clear when page loads (check query parameter once)

---

## 6. UI/UX Details

### Layout Structure

```
┌─────────────────────────────┐
│  [Hero Background]          │  (Multi-sport field SVG, emerald gradient)
│  Opacity with field markings│
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Welcome"    ││  (Top-left back link)
│  │                         ││
│  │  [Logo centered]        ││  (Recruiting Compass stacked logo)
│  │                         ││
│  │  [Timeout banner]       ││  (If ?reason=timeout)
│  │  (yellow bg, warning)   ││
│  │                         ││
│  │  [Error summary]        ││  (If validation or auth errors)
│  │  (red bg, dismissible)  ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Email label         │││
│  │  │ [envelope icon] ... │││  (Text input)
│  │  │ [Field error]       │││  (If error, below field)
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Password label      │││
│  │  │ [lock icon] ....    │││  (Text input, secure)
│  │  │ [Field error]       │││  (If error, below field)
│  │  └─────────────────────┘││
│  │                         ││
│  │  [Remember me] [Forgot?]││  (Checkbox + link, single row)
│  │                         ││
│  │  [Sign In button]       ││  (Full width, blue gradient)
│  │  (shows "Signing in..." │││  during loading)
│  │                         ││
│  │  ──────────────────────││  (Divider line)
│  │  New to Recruiting...  ││
│  │  ──────────────────────││
│  │                         ││
│  │  Don't have account?   ││
│  │  [Create one now] →    ││  (Link to signup)
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Design System References

#### Color Palette

- **Primary action (Sign In button):** Blue gradient
  - Start: `#0066FF` (blue-500)
  - End: `#0052CC` (blue-600)
  - Hover: Darker blue (#004BD9)

- **Secondary action (Forgot password):** Text link
  - Default: `#475569` (slate-600)
  - Hover: `#2563EB` (blue-600)

- **Danger (error messages):** Red
  - Background: `#FEE2E2` (red-50)
  - Border: `#FECACA` (red-200)
  - Text: `#DC2626` (red-600)

- **Warning (timeout banner):** Yellow
  - Background: `#FFFBEB` (yellow-50)
  - Border: `#FEE3A8` (yellow-200)
  - Text: `#92400E` (yellow-800)

- **Background:**
  - Page: Emerald gradient (#059669 → #047857)
  - Card: White with slight transparency (95%) + backdrop blur

- **Text:**
  - Labels: Slate-700 (#374151)
  - Placeholder: Slate-400 (#A0AEC0)
  - Secondary: Slate-600 (#475569)

#### Typography

- **Logo area:** Centered, ~96px width
- **Page heading:** None (logo serves as heading)
- **Section labels:** 14pt, semibold, slate-700
- **Input placeholders:** 14pt, regular, slate-400
- **Body text:** 14pt, regular, slate-600
- **Error messages:** 12pt, regular, red-600
- **Button text:** 16pt, semibold, white on blue

#### Spacing

- **Page margins:** 24pt horizontal, 48pt vertical
- **Card padding:** 32pt (8pt on iOS is ~1/2 of design spacing)
- **Form spacing:** 24pt between fields
- **Label to input:** 8pt
- **Field to error:** 4pt
- **Sections (Remember/Forgot):** 8pt top margin
- **Divider spacing:** 24pt above and below

#### Border Radius

- **Card:** 16pt (rounded corners)
- **Inputs:** 8pt
- **Buttons:** 8pt

#### Shadows

- **Card:** Subtle shadow (iOS system preferred)
- **Button:** Slight shadow on press

### Interactive Elements

#### Email Input

- **Type:** Text field
- **Keyboard type:** Email (show @ symbol)
- **Autocorrect:** Off
- **Capitalization:** None
- **Leading icon:** Envelope icon (slate-400)
- **Placeholder:** "your.email@example.com"
- **Max length:** 255 characters
- **Validation trigger:** On blur (after field loses focus)
- **Disabled state:** While loading or validating
- **States:**
  - Empty/default: Border slate-300
  - Focused: Blue ring (focus indicator)
  - Error: Red border, red error text below
  - Disabled: Reduced opacity, no interaction

#### Password Input

- **Type:** Secure text field (masked)
- **Keyboard type:** Default
- **Autocorrect:** Off
- **Leading icon:** Lock icon (slate-400)
- **Placeholder:** "Enter your password"
- **Max length:** 255 characters
- **Validation trigger:** On blur
- **Disabled state:** While loading or validating
- **States:** Same as email input

#### Remember Me Checkbox

- **Type:** Checkbox (toggle)
- **Label:** "Remember me"
- **Size:** 16pt × 16pt (iOS standard)
- **Color (checked):** Blue-600 (#2563EB)
- **On tap:** Toggle boolean state, no validation needed
- **Accessibility:** Tap area 44pt minimum (includes label)

#### Forgot Password Link

- **Type:** Text link
- **Label:** "Forgot password?"
- **Color:** Slate-600, hover → blue-600
- **On tap:** Navigate to `/forgot-password`
- **Alignment:** Right side (opposite of Remember Me)

#### Sign In Button

- **Type:** Primary action button
- **Label:**
  - Default: "Sign In"
  - Loading: "Signing in..."
  - Validating: "Validating..."
- **Size:** Full width, 48pt height
- **Color:** Blue gradient (from-blue-500 to-blue-600)
- **Hover:** Darker blue gradient (from-blue-600 to-blue-700)
- **Disabled state:**
  - Opacity: 50%
  - No interaction
  - Shown when: isLoading, isValidating, or !isFormValid
- **Loading indicator:** Show spinner or change text
- **Keyboard behavior:** Return key submits form

#### Create Account Link

- **Type:** Text link
- **Label:** "Create one now"
- **Color:** Blue-600, hover → blue-700
- **On tap:** Navigate to `/signup`

### Loading States

#### First Load

- **Logo:** Visible immediately
- **Form fields:** Ready to type immediately (no skeleton)
- **Keyboard:** Does not automatically appear (user taps field)

#### During Validation (Field Blur)

- **Indicator:** Subtle spinner or change in button state
- **Duration:** <300ms typically
- **User interaction:** Can still type in other fields
- **Button state:** Disabled until validation passes

#### During Submission

- **Button text:** Changes to "Signing in..."
- **Button state:** Disabled (appears grayed out, 50% opacity)
- **Spinner:** Show in button (optional, trailing the text)
- **Form fields:** Disabled (prevent further input)
- **Error banner:** Hidden while loading
- **Timeout:** If request takes >30 seconds, show error "Connection timed out"

### Empty States

- **No data needed** - Form always shows empty state for new login attempts

### Error States

#### Field-Level Error

```
┌─────────────────────────────────┐
│ Email Label                     │
│ [envelope] [email input field]  │
│ ❌ Invalid email address        │  (Red text, 12pt, below field)
└─────────────────────────────────┘
```

#### Form-Level Error

```
┌──────────────────────────────────┐
│ ⚠️ Invalid email or password   │  (Red bg, red border)
│ Please check and try again    │
│ [Dismiss ✕]                    │
└──────────────────────────────────┘
```

#### Timeout Message (Query Parameter)

```
┌──────────────────────────────────┐
│ ⏱️ You were logged out due to    │  (Yellow bg, yellow border)
│ inactivity. Please log in again │
└──────────────────────────────────┘
```

### Accessibility

- **VoiceOver labels:**
  - Email input: "Email address, required, text field"
  - Password input: "Password, required, secure text field"
  - Remember me: "Remember me, checkbox"
  - Sign In button: "Sign In button, sign in to your account"
  - Forgot password link: "Forgot password link, opens password recovery"
  - Create account link: "Create account link, navigate to sign up"

- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
  - Blue text on white: ✅ (4.6:1)
  - Error red on white: ✅ (5.4:1)

- **Touch Targets:** 44pt minimum
  - All buttons: 48pt height ✅
  - Links: 44pt × 44pt tap area ✅

- **Dynamic Type:** Support text scaling
  - Allow fonts to scale from -2 to +5 sizes
  - Use relative font sizes (large, medium, small)

---

## 7. Dependencies

### Frameworks Required

- **SwiftUI** (iOS 15+) - UI framework
- **Supabase iOS Client** - Authentication
  - Import: `import Supabase`
  - Provides: `SupabaseClient`, auth, session management

### Third-Party Libraries

- None (use native SwiftUI components)

### External Services

- **Supabase Authentication** - Hosted auth service
  - Endpoint: `https://[project-id].supabase.co/auth/v1/token`
  - Authentication: API key (included in Supabase iOS SDK)
  - Storage: Keychain (automatic via SDK)

---

## 8. Error Handling & Edge Cases

### Network Errors

#### Timeout (No Response >30 seconds)

- **Display:** "Connection timed out. Check your network and try again."
- **Recovery:** Show retry button in error message
- **Logging:** Log timeout event for debugging

#### No Internet Connection

- **Display:** "No internet connection. Check your network."
- **Recovery:** User connects to network, taps retry
- **Check:** Use network reachability detection

#### Server Error (5xx)

- **Display:** "Server error. Please try again later."
- **Recovery:** Show retry button; explain might be temporary outage
- **Logging:** Log server error details

#### Malformed Request

- **Display:** "Invalid request. Please try again."
- **Recovery:** Internal error; suggest closing and reopening app

### Data Errors

#### Invalid Email Format

- **Trigger:** On blur of email field
- **Display:** "Invalid email address"
- **Schema:** `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`

#### Password Too Short

- **Trigger:** On blur of password field
- **Display:** "Password must be at least 8 characters"
- **Schema:** Min 8 characters

#### Password Too Long

- **Max:** 255 characters
- **Display:** Trim if needed; error if exceeds

#### Empty Fields

- **Validation:** Form submission blocked if either field is empty
- **Display:** "Email and password are required"
- **Trigger:** On Submit button tap

### User Errors

#### Invalid Credentials

- **Error from Supabase:** `invalid_credentials`
- **Display:** "Invalid email or password"
- **Recovery:** User re-enters credentials
- **Security Note:** Don't reveal which field is wrong (privacy)

#### Account Disabled

- **Error from Supabase:** `user_not_found` or similar
- **Display:** "Email not found. Please sign up first."
- **Recovery:** Link to signup page

#### Email Not Verified

- **Trigger:** Supabase allows login but user might need email verification
- **Check:** If session obtained but `emailConfirmedAt` is null
- **Display:** "Please verify your email. Check your inbox for a verification link."
- **Recovery:** Show resend verification option

#### Too Many Login Attempts

- **Error from Supabase:** `too_many_requests` (429 status)
- **Display:** "Too many login attempts. Please try again after [X] minutes."
- **Extracted from:** Response includes retry-after header or wait time
- **Recovery:** User waits, then retries

### Edge Cases

#### Very Long Email

- **Max 255 characters**
- **Display:** Truncate visually with ellipsis if longer
- **Behavior:** Full email still in field, accessible

#### Very Long Password

- **Max 255 characters**
- **Display:** All hidden (dots/asterisks)
- **Behavior:** Full password entered but masked

#### Rapid Button Taps

- **Prevention:** Disable button during submission
- **Behavior:** Only one request sent; subsequent taps ignored

#### Session Expires While User is in App

- **Handle:** If user completes login but returns to login screen after session expires
- **Show:** Timeout message: "You were logged out due to inactivity"

#### Switch Between Email/Password Fields

- **Behavior:** Each field validates on blur independently
- **State:** Email error doesn't prevent password validation

#### User Hits Return/Enter Key

- **Behavior:** Submit form (same as tapping Sign In button)
- **Disabled state:** Return key disabled if form invalid

#### App Goes to Background During Login

- **Behavior:** Request continues
- **State:** Button remains disabled until response
- **User returns:** See either success (navigated to dashboard) or error (error displayed)

#### Airplane Mode Enabled Mid-Request

- **Error:** Network error
- **Display:** "No internet connection"
- **Recovery:** User re-enables connectivity and retries

#### User Changes Email in Another App

- **Behavior:** If same account, Supabase will reject at old email
- **Error:** Invalid credentials
- **Display:** "Invalid email or password"

---

## 9. Testing Checklist

### Happy Path Tests

- [x] **Login with valid email and password**
  - App shows loading state
  - Request sent to Supabase
  - Session created and stored in Keychain
  - User navigated to `/dashboard`
  - Dashboard shows user info

- [x] **Email validation on blur**
  - Valid email (e.g., "user@example.com") passes
  - Invalid email (e.g., "notanemail") shows error
  - Error clears when fixed

- [x] **Password validation on blur**
  - Password <8 chars shows error
  - Password ≥8 chars passes

- [x] **Sign In button state**
  - Disabled until both fields valid
  - Shows "Signing in..." during request
  - Re-enables after response

- [x] **Remember me checkbox**
  - Can toggle on/off
  - State persists on page (optional: persist to UserDefaults)

- [x] **Navigation links**
  - "Forgot password?" → `/forgot-password` page
  - "Create one now" → `/signup` page
  - "← Back to Welcome" → `/` page

### Error Tests

- [x] **Invalid credentials**
  - Error message displays: "Invalid email or password"
  - Form remains usable for retry
  - Can tap Sign In again

- [x] **Network timeout**
  - After 30 seconds of no response, show timeout error
  - User can retry
  - Loading indicator stops

- [x] **No internet**
  - App detects no connectivity
  - Shows "No internet connection" error
  - User can retry when connectivity restored

- [x] **Too many attempts**
  - Supabase returns 429 with wait time
  - App displays wait time: "Try again after X minutes"
  - User cannot submit until wait is over

- [x] **Server error (5xx)**
  - Generic error message
  - Retry option available
  - No sensitive info in error

- [x] **Malformed response**
  - App handles gracefully
  - Shows "Server error" to user
  - No crashes

### Edge Case Tests

- [x] **Very long email (>100 chars)**
  - Field accepts it
  - Visually truncates with ellipsis if needed
  - Validation works correctly
  - Submission works

- [x] **Very long password (>100 chars)**
  - All characters masked
  - Submission works

- [x] **Rapid button taps**
  - Only one request sent
  - Button stays disabled
  - No duplicate submissions

- [x] **Return key press**
  - Submits form if valid
  - No effect if invalid

- [x] **Tab between fields**
  - Email field validates when leaving
  - Password field validates when leaving
  - Tab order: email → password → remember me → sign in button

- [x] **Paste password**
  - Password field accepts pasted content
  - Works same as typed

- [x] **Timeout message (?reason=timeout query)**
  - Banner shows if parameter present
  - Banner hides if parameter absent
  - User can proceed with login

### Performance Tests

- [x] **Login time**
  - <2 seconds on 4G network (good Supabase latency)
  - <5 seconds on 3G network
  - Show loading state immediately

- [x] **Form input responsiveness**
  - Typing in fields is instant (no lag)
  - Validation blur event completes in <300ms

- [x] **Memory**
  - No memory leaks when navigating away and back
  - Form state clears properly

- [x] **App background/foreground**
  - Can pause login, background app, return
  - Request still completes
  - No double submission

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Email case-insensitivity:** Supabase treats emails as case-insensitive (user@example.com == USER@EXAMPLE.COM), but stores the original case. iOS should follow same behavior.

- **Password complexity:** Passwords are NOT validated for complexity (no uppercase, numbers, special chars required). The web app uses `weakPasswordSchema` which only requires 8+ chars. Match this on iOS.

- **Email verification delay:** After signup, email verification can take up to 30 seconds to propagate. If user tries to login too soon, they might see "user not found" even though they just signed up.

- **Session token expiration:** Access tokens expire in 1 hour. Supabase SDK handles auto-refresh, but if refresh fails, user must re-login.

- **Multiple concurrent logins:** If same user logs in on web + iOS simultaneously, tokens are independent but point to same account data.

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/login.vue`
- **Composables used:**
  - `useAuth()` - Authentication logic
  - `useFormValidation()` - Form validation utilities
- **Store mutations:**
  - `useUserStore().initializeUser()` - Populates user context after login
- **Related components:**
  - `FormErrorSummary.vue` - Error display
  - `FieldError.vue` - Field-level error display
- **Validation schema:** `/utils/validation/schemas.ts` → `loginSchema`

### Design References

- **Hero background:** Multi-sport field SVG (baseball, football, basketball, soccer)
- **Colors:** Emerald green gradient (#059669 → #047857)
- **Logo:** Recruiting Compass stacked logo (~/assets/logos/recruiting-compass-stacked.svg)
- **Icons:** Heroicons (envelope, lock, arrow-left)

### API Documentation

- **Supabase Auth:** https://supabase.io/docs/reference/swift/auth-signup
- **Supabase iOS SDK:** https://github.com/supabase/supabase-swift
- **Error codes:** https://supabase.io/docs/guides/auth/troubleshooting

### Database Schema

- **Table:** `auth.users` (Supabase managed, not custom)
- **Relevant fields:**
  - `id` (UUID)
  - `email` (unique, case-insensitive)
  - `encrypted_password` (hashed, never returned)
  - `email_confirmed_at` (null if unverified)
  - `last_sign_in_at` (timestamp)

---

## 12. Sign-Off

**Specification reviewed by:** Chris Kandrikanich
**Web implementation verified:** February 6, 2026
**Ready for iOS implementation:** ✅ **YES**

### Notes

This is the **critical first page** of Phase 1. Establish the following patterns while building this page:

1. **Supabase iOS SDK setup** - Configure and test basic auth
2. **Keychain storage** - Save/retrieve session tokens
3. **Error handling pattern** - Consistent error display across all pages
4. **Form validation pattern** - Reusable validation logic for other forms
5. **Loading state pattern** - Button/form disabled states during async operations
6. **Navigation pattern** - How views push/pop to other views

Once this page is solid, all subsequent Phase 1 pages (signup, email verify, password reset) build on these patterns and should be faster to implement.

**Suggested approach:** Build this incrementally:

1. **Day 1:** UI layout + form fields + validation
2. **Day 2:** Supabase integration + session storage
3. **Day 3:** Error handling + edge cases + testing

---

## Appendix A: Example Implementation Reference

### Similar Pages in Web Codebase

- `/signup` - Uses same form validation pattern, same auth structure
- `/forgot-password` - Uses same error handling
- `/reset-password` - Uses same pattern

### Web Code Snippets

**Composable Pattern (useAuth.ts):**

```typescript
export const useAuth = () => {
  const supabase = useSupabase();
  const login = async (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (rememberMe) {
      // Store credentials (web uses localStorage)
    }
    return data;
  };
  return { login };
};
```

**Component Pattern (login.vue):**

```typescript
const handleLogin = async () => {
  // 1. Validate form
  const validated = await validate(formData, loginSchema);
  if (!validated) return;

  // 2. Show loading state
  loading.value = true;

  try {
    // 3. Call auth
    await login(validated.email, validated.password, rememberMe.value);

    // 4. Initialize user context
    await userStore.initializeUser();

    // 5. Navigate
    await navigateTo("/dashboard");
  } catch (err) {
    // 6. Show error
    setErrors([{ field: "form", message: err.message }]);
  } finally {
    loading.value = false;
  }
};
```

**iOS Equivalent (LoginViewModel.swift):**

```swift
@MainActor
class LoginViewModel: ObservableObject {
  @Published var email = ""
  @Published var password = ""
  @Published var rememberMe = false
  @Published var isLoading = false
  @Published var error: String? = nil

  func login() async {
    isLoading = true
    defer { isLoading = false }

    do {
      // Call Supabase
      let response = try await supabaseClient.auth.signIn(
        email: email,
        password: password
      )

      // Store credentials if needed
      if rememberMe {
        // Save to Keychain or UserDefaults
      }

      // Update auth manager
      authManager.user = response.user
      authManager.session = response.session

      // Navigate
      // (return from function, let View handle navigation)
    } catch {
      self.error = error.localizedDescription
    }
  }
}
```

---

**This specification is ready to hand to iOS Claude. All details needed to implement the login page are included.**
