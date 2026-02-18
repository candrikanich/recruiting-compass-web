# iOS Page Specification: Signup Page

**Project:** The Recruiting Compass iOS App
**Created:** February 6, 2026
**Page Name:** Signup / Create Account
**Web Route:** `/signup`
**Priority:** MVP / Phase 1 (High - Tier 2)
**Complexity:** High
**Estimated Time:** 2-3 days
**Dependencies:** Login page patterns (Phase 1, Task 1)

---

## 1. Overview

### Purpose

Allow new users to create an account by providing email, password, full name, and selecting their role (parent, student, or player). Support optional family code for multi-user family accounts. Complete the auth foundation after login is working.

### Key User Actions

- Select user type (Parent or Student/Player)
- Enter full name (first + last)
- Enter email address
- Create password (with strength requirements)
- Confirm password
- Optionally enter family code (if joining existing family)
- Accept terms and conditions
- Click "Create Account" to register
- Click "Sign in instead" to go to login page

### Success Criteria

- User account created in Supabase auth
- Email verification email sent automatically
- User navigated to `/verify-email` page
- User context initialized with new account
- Password meets strength requirements (8+ chars, uppercase, lowercase, number)
- Form prevents submission if passwords don't match
- Terms agreement is mandatory

---

## 2. User Flows

### Primary Flow: New Individual User

```
1. User taps "Create one now" on login page
2. Signup page loads
3. User taps "Student" or "Player" role button
4. Form expands to show full form
5. User enters: Full Name, Email, Password, Confirm Password
6. User agrees to Terms and Conditions (checkbox)
7. User taps "Create Account"
8. System validates all fields
9. System creates account in Supabase auth
10. Supabase sends verification email
11. System navigates to `/verify-email`
12. User sees email verification page
```

### Alternative Flow: Family Member Joining

```
1. User received family code from parent (e.g., "FAM-ABC12345")
2. User selects "Student" or "Player" role
3. User enters full name, email, password
4. User enters family code in optional field
5. User taps "Create Account"
6. System creates account AND links to family
7. System navigates to `/verify-email`
8. After verification, user appears in parent's family list
```

### Alternative Flow: Parent Creating Family

```
1. User selects "Parent" role
2. User enters full name, email, password (no family code field shown)
3. User taps "Create Account"
4. System creates account and generates random family code
5. System navigates to `/verify-email`
6. After verification, parent can invite students/players
```

### Error Scenarios

```
Error: Email Already Registered
- User sees: "This email is already registered. Try signing in instead."
- Recovery: Link to login page or use different email

Error: Passwords Don't Match
- User sees: "Passwords don't match" below confirm password field
- Recovery: Re-enter confirm password

Error: Password Too Weak
- User sees: "Must be 8+ characters with uppercase, lowercase, and a number"
- Recovery: Create stronger password

Error: Invalid Family Code
- User sees: "Family code not found or expired"
- Recovery: Verify code or skip family code

Error: Network Error
- User sees: "Network error. Please check your connection and try again."
- Recovery: Retry button

Error: Terms Not Agreed
- User sees: Button disabled until checkbox is checked
- Recovery: Check the terms checkbox
```

---

## 3. Data Models

### SignupRequest

```swift
struct SignupRequest: Codable {
  let email: String                // User's email (validated format)
  let password: String             // 8+ chars, mixed case + number
  let fullName: String             // First + Last name (sanitized)
  let role: String                 // "parent" | "student" | "player"
  let familyCode: String?          // Optional: existing family code (format: FAM-XXXXXXXX)
  let agreeToTerms: Bool           // Must be true to submit
}

struct SignupResponse: Codable {
  let user: User                   // User from Supabase auth
  let session: Session             // Session token (auto-generated)
  let familyCode: String?          // For parents: newly generated code
}
```

### User Metadata (Stored in Supabase auth.users.user_metadata)

```swift
struct UserMetadata: Codable {
  let role: String                 // "parent" | "student" | "player"
  let fullName: String
  let familyCode: String?          // Family code they created (if parent) or joined
}
```

---

## 4. API Integration

### Endpoint: Create User Account

**Method:** Direct Supabase Auth API (via iOS SDK)

```
Supabase Endpoint: https://[project-id].supabase.co/auth/v1/signup
Method: POST

Request Headers:
{
  "apikey": "[SUPABASE_ANON_KEY]",
  "Content-Type": "application/json"
}

Request Body:
{
  "email": "user@example.com",
  "password": "[secure_password]",
  "data": {
    "full_name": "John Doe",
    "role": "student",
    "family_code": "FAM-ABC12345"    // Optional
  }
}

Response (Success - 200):
{
  "user": {
    "id": "12345678-1234-1234-1234-123456789012",
    "aud": "authenticated",
    "role": "authenticated",
    "email": "user@example.com",
    "email_confirmed_at": null,      // NULL until verified
    "phone": null,
    "created_at": "2024-01-20T15:30:00Z",
    "confirmed_at": null,
    "last_sign_in_at": null,
    "app_metadata": {
      "provider": "email",
      "providers": ["email"]
    },
    "user_metadata": {
      "full_name": "John Doe",
      "role": "student",
      "family_code": "FAM-ABC12345"
    }
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "rfsh_xxx"
  }
}

Response (Failure - 400):
{
  "error": "User already registered",
  "error_description": "A user with this email address has already been registered. Please log in instead."
}

Or:

{
  "error": "Weak password",
  "error_description": "Password must be 8 or more characters with uppercase, lowercase, and a number"
}
```

### SDK Note

Use Supabase iOS SDK's `auth.signUp(email:password:data:)` method, which:

- Creates user in `auth.users` table
- Automatically sends verification email
- Returns `AuthResponse` with user and session
- Throws `AuthError` on failure

**Web Implementation Reference:**

```typescript
// From pages/signup.vue & composables/useAuth.ts
const { data, error } = await supabase.auth.signUp({
  email: validated.email,
  password: validated.password,
  options: {
    data: {
      full_name: validated.fullName,
      role: validated.role,
      family_code: validated.familyCode || undefined,
    },
  },
});

if (error) {
  // Handle error
}

if (data.user) {
  // Navigate to verify-email
}
```

---

## 5. State Management

### Page-Level State

```swift
@State var userType: String? = nil          // "parent" | "student" | "player" | nil
@State var fullName: String = ""
@State var email: String = ""
@State var password: String = ""
@State var confirmPassword: String = ""
@State var familyCode: String = ""
@State var agreeToTerms: Bool = false
@State var isLoading: Bool = false
@State var isValidating: Bool = false
@State var errorMessage: String? = nil
@State var fieldErrors: [String: String] = [:]

// Computed properties
var isFormValid: Bool {
  userType != nil &&
  !fullName.trimmingCharacters(in: .whitespaces).isEmpty &&
  !email.trimmingCharacters(in: .whitespaces).isEmpty &&
  !password.isEmpty &&
  password == confirmPassword &&
  agreeToTerms &&
  fieldErrors.isEmpty
}

var showUserTypeButtons: Bool {
  userType == nil
}

var showForm: Bool {
  userType != nil
}
```

### Shared Global State

After successful signup, populate AuthManager:

```swift
authManager.user = signupResponse.user
authManager.session = signupResponse.session
authManager.isAuthenticated = true
```

---

## 6. UI/UX Details

### Layout Structure - Step 1: User Type Selection

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Login"      ││
│  │                         ││
│  │  [Logo centered]        ││
│  │                         ││
│  │  "Create Your Account"  ││
│  │  "Select your role"     ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [👤] Parent        │││  (Selectable card)
│  │  │ Manage account      │││
│  │  │ for student/player  │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ [🏃] Student/Player │││  (Selectable card)
│  │  │ I'm the athlete     │││
│  │  └─────────────────────┘││
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Layout Structure - Step 2: Form Entry

```
┌─────────────────────────────┐
│  [Hero Background]          │
│                             │
│  ┌─────────────────────────┐│
│  │  "← Back to Login"      ││
│  │                         ││
│  │  "Create Your Account"  ││  (Title changes)
│  │  "for [Parent/Student]" ││
│  │                         ││
│  │  [Error summary]        ││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Full Name label     │││
│  │  │ [👤] John Doe       │││
│  │  │ [Field error]       │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Email label         │││
│  │  │ [✉️] email@...      │││
│  │  │ [Field error]       │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Password label      │││
│  │  │ [🔒] .......        │││
│  │  │ [strength hint]     │││
│  │  │ [Field error]       │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││
│  │  │ Confirm Password    │││
│  │  │ [🔒] .......        │││
│  │  │ [Field error]       │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  ┌─────────────────────┐││  (For Student/Player only)
│  │  │ Family Code (opt.)  │││
│  │  │ [🔑] FAM-ABC12345   │││
│  │  │ [hint: optional]    │││
│  │  └─────────────────────┘││
│  │                         ││
│  │  [Terms & Conditions]   ││
│  │  ☐ I agree to Terms    ││
│  │                         ││
│  │  [Create Account button]││
│  │  "Creating account..."  ││  (loading state)
│  │                         ││
│  │  ──────────────────────││
│  │  Already have account? ││
│  │  [Sign in instead]     ││
│  │                         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Design System References

Same as Login page:

- **Colors:** Emerald gradient background, blue buttons, red errors, yellow warnings
- **Typography:** 14pt labels, 16pt buttons, 12pt errors
- **Spacing:** 24pt between form sections, 8pt label-to-input
- **Shadows:** Subtle card shadow, button press shadow

### Interactive Elements

#### User Type Buttons

- **Type:** Card/button selection
- **States:** Default (outline), Selected (filled blue), Disabled
- **On tap:** Set `userType` and show form
- **Cannot change:** Once selected, show "Change" link to reset

#### Full Name Input

- **Placeholder:** "First and Last Name"
- **Max length:** 255 characters (sanitized)
- **Validation trigger:** On blur
- **Error display:** Below field

#### Email Input

- **Same as Login page** (email validation)
- **Additional validation:** Check if already registered
- **Error if:** "Email already registered"

#### Password Input

- **Requirements:** 8+ chars, uppercase, lowercase, number
- **Strength indicator:** Show hint text
  - "Must be 8+ characters with uppercase, lowercase, and a number"
- **Validation trigger:** On blur or while typing
- **Visual feedback:** Green checkmark or red X as user types

#### Confirm Password Input

- **Validation:** Must match password field exactly
- **Error if:** "Passwords don't match"
- **Real-time validation:** Compare while typing or on blur

#### Family Code Input (Optional, Student/Player only)

- **Label:** "Family Code (optional)"
- **Placeholder:** "e.g., FAM-ABC12345"
- **Hint:** "Enter if joining existing family"
- **Format:** FAM-XXXXXXXX
- **Validation:** Format check only (existence checked on submit)
- **Not shown for:** Parent role

#### Terms Checkbox

- **Type:** Checkbox + link
- **Label:** "I agree to the Terms and Conditions and Privacy Policy"
- **Links:** Navigate to `/legal/terms` and `/legal/privacy`
- **Required:** Form disabled until checked
- **Styling:** Gray background box around checkbox + label

#### Create Account Button

- **Label:**
  - Default: "Create Account"
  - Loading: "Creating account..."
- **Disabled until:** Full form valid AND terms checked
- **Size:** Full width, 48pt height

---

## 7. Dependencies

### Frameworks Required

- **SwiftUI** (iOS 15+)
- **Supabase iOS Client** (auth + metadata)

### Third-Party Libraries

- None (use native SwiftUI)

### External Services

- **Supabase Authentication**
- **Supabase Email Service** (auto-sends verification email)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** "Connection timed out. Please check your connection and try again."
- **No internet:** "No internet connection. Please try again."

### Data Errors

- **Email already registered:** "This email is already registered. Try signing in instead."
- **Password too weak:** "Must be 8+ characters with uppercase, lowercase, and a number"
- **Passwords don't match:** "Passwords don't match"
- **Invalid family code:** "Family code not found. Check the code and try again."
- **Invalid full name:** "Full name must be 1-255 characters"

### User Errors

- **Terms not agreed:** Button stays disabled
- **Missing required field:** Form validation prevents submit
- **Rapid submit:** Disable button during submission

### Edge Cases

- **Very long full name:** Truncate visually
- **Spaces in password:** Allow
- **Special characters in full name:** Allow (sanitized)
- **Copy-paste password:** Works same as typing
- **User changes mind on role:** Show "Change" link to go back

---

## 9. Testing Checklist

### Happy Path Tests

- [x] User selects "Parent" → form shows without family code field
- [x] User selects "Student" → form shows with family code field
- [x] User creates account with valid data → navigates to `/verify-email`
- [x] User joins family with valid code → account linked to family
- [x] Password validation in real-time
- [x] Confirm password must match
- [x] Terms checkbox required
- [x] Account created in Supabase
- [x] Verification email sent

### Error Tests

- [x] Email already registered → error message + link to login
- [x] Password too weak → error below password field
- [x] Passwords don't match → error below confirm password
- [x] Invalid family code → error on submit
- [x] Network timeout → "Connection timed out" message
- [x] Network error → "Network error" message
- [x] Terms not checked → button disabled

### Edge Case Tests

- [x] Very long full name (>100 chars) → accepts, stores correctly
- [x] Special characters in name (John O'Brien, José García) → accepts
- [x] Spaces in password → accepts
- [x] Email with + sign (user+test@example.com) → accepts
- [x] Rapid clicks on Create Account → only one submission
- [x] User backgrounds app during signup → request completes, shows result

### Performance Tests

- [x] Form input responsive (no lag)
- [x] Signup request completes in <3 seconds
- [x] Verification email arrives within 1 minute

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Password strength:** Only requires 8+ chars with mixed case + number (no special chars required)
- **Family code format:** FAM-XXXXXXXX (8 random alphanumeric chars)
- **Email verification:** Can take up to 60 seconds, user shouldn't close app
- **Family code auto-generation:** Only for parent accounts; students join existing families

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/signup.vue`
- **Composables:** `useAuth()`, `useFormValidation()`
- **Store:** `useUserStore()`
- **Schema:** `/utils/validation/schemas.ts` → `signupSchema`

### API Documentation

- **Supabase Signup:** https://supabase.io/docs/reference/swift/auth-signup

---

## 12. Sign-Off

**Specification reviewed by:** Chris Kandrikanich
**Web implementation verified:** February 6, 2026
**Ready for iOS implementation:** ✅ **YES**

### Notes

- Build this **after** Login page (depends on auth patterns)
- User type selection is critical UX (parent vs student/player)
- Family code field visibility depends on role selection
- Password strength hint should be visible immediately

**Suggested breakdown:**

- **Day 1:** UI layout + user type selection
- **Day 2:** Form fields + validation
- **Day 3:** Signup API call + error handling + navigation
