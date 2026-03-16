# iOS App Porting Handoff: Phase 1 Complete

**Project:** The Recruiting Compass iOS App (SwiftUI)
**Date Created:** February 6, 2026
**Status:** ✅ Phase 1 (Auth Foundation) - Fully Specified & Ready
**Phase 1 Progress:** Login (In Progress) | Other 4 Pages (Ready)

---

## Executive Summary

You have created a **complete specification and architecture plan** for porting your Nuxt web app to iOS using SwiftUI. The work includes:

- ✅ **5 complete page specifications** (Phase 1 Auth Foundation)
- ✅ **Architecture pattern alignment** (Web → iOS mental models)
- ✅ **8-week implementation roadmap** (Phases 1-6, all 25+ MVP pages)
- ✅ **Reusable spec template** for creating Phase 2+ specifications
- ✅ **iOS Claude actively building** Login page (started)

**Your strategy is sound:** Page-by-page specs + parallel testing of both apps = best parity outcome.

---

## What You've Created

### Phase 1: Authentication Foundation (5 Pages)

| #   | Page                | Web Route          | Time          | Spec File                           | Status          |
| --- | ------------------- | ------------------ | ------------- | ----------------------------------- | --------------- |
| 1   | **Login**           | `/login`           | 2-3 days      | `iOS_SPEC_Phase1_Login.md`          | 🔄 iOS building |
| 2   | **Signup**          | `/signup`          | 2-3 days      | `iOS_SPEC_Phase1_Signup.md`         | ✅ Ready        |
| 3   | **Email Verify**    | `/verify-email`    | 1 day         | `iOS_SPEC_Phase1_VerifyEmail.md`    | ✅ Ready        |
| 4   | **Forgot Password** | `/forgot-password` | 1-2 days      | `iOS_SPEC_Phase1_ForgotPassword.md` | ✅ Ready        |
| 5   | **Reset Password**  | `/reset-password`  | 2 days        | `iOS_SPEC_Phase1_ResetPassword.md`  | ✅ Ready        |
|     | **TOTAL**           |                    | **~8-9 days** |                                     |                 |

### Supporting Documents

| Document          | File                             | Purpose                                            |
| ----------------- | -------------------------------- | -------------------------------------------------- |
| **Spec Template** | `iOS_PAGE_SPEC_TEMPLATE.md`      | Reusable 12-section template for all future specs  |
| **Roadmap**       | `iOS_PAGE_PRIORITY.md`           | 8-week plan covering all 25+ MVP pages in 6 phases |
| **Architecture**  | `iOS_ARCHITECTURE_MIRRORING.md`  | Web-to-iOS pattern translation (Nuxt → SwiftUI)    |
| **This Doc**      | `iOS_HANDOFF_Phase1_Complete.md` | Everything you need to start Phase 2               |

---

## Quick Reference: Phase 1 Specs

### Login Page (2-3 days)

**What:** Email + password authentication

- Form validation on blur (email regex, password length)
- Remember me checkbox
- Error summary display
- Session storage in Keychain
- Navigation to dashboard on success

**Key Points:**

- Establishes foundational Supabase iOS SDK patterns
- Token storage in Keychain (automatic)
- Error handling pattern (reused in other pages)
- Form validation pattern (reused in signup, reset password)

**API:** Supabase `auth.signInWithPassword(email:password:)`

---

### Signup Page (2-3 days)

**What:** Account creation with role selection

- Two-step UX: Role selection (Parent/Student/Player) → Form
- Full name, email, password, confirm password
- Optional family code for joining existing family
- Terms & conditions checkbox (required)
- Password strength requirements (8+ chars, mixed case + number)

**Key Points:**

- Reuses login pattern (form validation, error handling)
- Adds complexity: Multi-step UX with conditional fields
- Family code field only shows for Student/Player role
- Auto-sends verification email after signup

**API:** Supabase `auth.signUp(email:password:data:metadata)`

---

### Email Verification (1 day)

**What:** Confirm email address after signup

- Auto-polling every 2 seconds for verification status
- Shows pending/checking/verified states
- Can resend verification email (60s cooldown)
- Navigate to dashboard when verified

**Key Points:**

- Simplest page (minimal user interaction)
- Polling pattern (starts 2s, backs off on errors)
- Resend cooldown handling
- Auto-redirect to dashboard with manual skip option

**API:** Supabase `auth.refreshSession()` (polls email_confirmed_at field)

---

### Forgot Password (1-2 days)

**What:** Request password reset link

- Email input with validation
- Show success page with email address
- Resend email button (60s cooldown)
- Links to reset password page (Phase 1, Task 5)

**Key Points:**

- Simplest implementation (single email field + button)
- Two-state UI (form → success)
- Mirrors validate → submit → show result pattern

**API:** Supabase `auth.resetPasswordForEmail(email:)`

---

### Reset Password (2 days)

**What:** Set new password using email link token

- Deep link handling for reset token from email
- Real-time password strength checklist with checkmarks
- Show/hide password toggle (affects both fields)
- Token validation (24h expiration, single-use)
- Auto-redirect countdown with manual skip

**Key Points:**

- Most complex UI (4 states: validating, form, success, error)
- Deep link extraction from reset email
- Real-time strength validation (watched computed property)
- Single-use token prevents reuse

**API:** Custom endpoint `/api/auth/confirm-password-reset` + Supabase `auth.updateUser(password:)`

---

## Architecture Patterns (Web → iOS)

### Core Pattern: Page → ViewModel → Manager → Supabase

```
WEB (Nuxt)              iOS (SwiftUI)           Purpose
─────────────────────────────────────────────────────────
Pages                 →  Views                  UI Layer
Composables (useXxx)  →  ViewModels            Business Logic
Pinia Stores          →  Managers              State Management
Supabase Client       →  SupabaseManager       API Layer
```

### Example: Login Flow

**Web (TypeScript):**

```typescript
const { login } = useAuth(); // Composable
await login(email, password); // Call auth function
const authStore = useAuthStore(); // Pinia store
authStore.user; // Global state
```

**iOS (Swift):**

```swift
@StateObject var viewModel = LoginViewModel()  // Business logic
await viewModel.login(email: email, password: password)
@EnvironmentObject var authManager: AuthManager  // Global state
authManager.user  // Accessed from environment
```

### Key Patterns Established in Phase 1

1. **Form Validation Pattern**
   - Validate on blur (not on type)
   - Show errors below field
   - Disable submit if invalid
   - Real-time strength feedback where applicable

2. **Error Handling Pattern**
   - Try/catch with specific error types
   - Show form-level errors in banner
   - Show field-level errors below field
   - Provide recovery actions (retry, links, etc.)

3. **Async State Pattern**
   - `isLoading` → show button state change
   - `isValidating` → show spinner
   - Disable interactions during async
   - Show results after completion

4. **Navigation Pattern**
   - Use NavigationStack (iOS 16+)
   - Pass IDs via navigationDestination
   - Handle deep links for reset password token
   - Redirect after successful auth

---

## How to Use These Specs with iOS Claude

### Step 1: Give Login Spec (Already Done ✅)

You've already started iOS Claude on the login page. Good!

### Step 2: After Login is Working

Pass the **Signup spec** to iOS Claude:

- Reference: `iOS_SPEC_Phase1_Signup.md`
- Note: "Reuse login patterns, add role selection UI"
- Time: ~2-3 days

### Step 3: After Signup + Email Verify

Pass the **Email Verify spec**:

- Reference: `iOS_SPEC_Phase1_VerifyEmail.md`
- Note: "Simplest page - focus on polling loop"
- Time: ~1 day

### Step 4: Forgot Password

Pass the **Forgot Password spec**:

- Reference: `iOS_SPEC_Phase1_ForgotPassword.md`
- Note: "Simple form, two-state UI"
- Time: ~1-2 days

### Step 5: Reset Password

Pass the **Reset Password spec**:

- Reference: `iOS_SPEC_Phase1_ResetPassword.md`
- Note: "Most complex - deep links + real-time validation"
- Time: ~2 days

### Testing Between Steps

After each page:

1. iOS Claude finishes implementation
2. You test iOS version manually
3. You also test web version (refactor if needed)
4. Compare UX/behavior between platforms
5. Document any differences or improvements

---

## Estimated Timeline

| Week     | Pages              | Status         | Time         | Notes                       |
| -------- | ------------------ | -------------- | ------------ | --------------------------- |
| **W1-2** | Phase 1 (5 pages)  | 🔄 In Progress | ~8-9 days    | Login started; others ready |
| **W3-4** | Phase 2 (4 pages)  | 📋 Planned     | ~10 days     | Dashboard + Lists           |
| **W4-5** | Phase 3 (5 pages)  | 📋 Planned     | ~10 days     | Detail pages + CRUD         |
| **W5-6** | Phase 4 (4 pages)  | 📋 Planned     | ~8 days      | Settings + Family           |
| **W6-7** | Phase 5 (4 pages)  | 📋 Planned     | ~8 days      | Analytics + Offers          |
| **W7-8** | Phase 6 (5+ pages) | 📋 Planned     | ~5 days      | Polish + Edge cases         |
|          | **TOTAL**          |                | **~8 weeks** | MVP with core features      |

---

## Recommended Next Steps

### Immediate (This Week)

1. ✅ Monitor iOS Claude's login implementation
2. ⏳ Prepare to hand off signup spec after login completes
3. ⏳ Set up side-by-side testing (web + iOS)

### Short Term (Next 2 Weeks)

1. Build Phase 1 pages on iOS (5 pages, ~9 days)
2. Test each page as completed
3. Refactor web auth flows if needed
4. Document any discrepancies between platforms

### Planning Phase 2

1. Review Phase 2 priority list (`iOS_PAGE_PRIORITY.md`)
2. Create Dashboard + Lists specs using template
3. Plan: Dashboard → Coaches List → Schools List → Interactions List
4. Each spec ~3-5 days for iOS implementation

---

## Key Files & Locations

All files in: `/planning/`

```
planning/
├── iOS_PAGE_SPEC_TEMPLATE.md              ← Use for Phase 2+ specs
├── iOS_PAGE_PRIORITY.md                   ← 8-week roadmap + rationale
├── iOS_ARCHITECTURE_MIRRORING.md          ← Web→iOS pattern translation
│
├── iOS_SPEC_Phase1_Login.md               ← Currently being built
├── iOS_SPEC_Phase1_Signup.md              ← Ready for next
├── iOS_SPEC_Phase1_VerifyEmail.md         ← After signup
├── iOS_SPEC_Phase1_ForgotPassword.md      ← After email verify
├── iOS_SPEC_Phase1_ResetPassword.md       ← Final auth page
│
└── iOS_HANDOFF_Phase1_Complete.md         ← This document
```

---

## Important Details for iOS Team

### Supabase Integration

- **Auth Client:** Supabase iOS SDK (manages tokens, session, refresh)
- **Token Storage:** iOS Keychain (automatic via SDK)
- **Session Persistence:** Across app restarts (Keychain)
- **Email Verification:** Auto-sent by Supabase
- **Password Reset:** Email links with 24-hour token expiration

### Common Patterns Across Phase 1

**Email Validation:**

- Regex: `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`
- Trigger: On blur field
- Error: "Invalid email address"

**Password Strength:**

- Min 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- (No special chars required)

**Loading States:**

- Show "Validating..." while checking
- Show "Signing in..." / "Creating..." while submitting
- Disable all interactions during async

**Error Messages:**

- Form-level: Red banner at top
- Field-level: Red text below field
- Always show recovery action (retry, link, etc.)

---

## Known Gotchas & Edge Cases

### From Web Implementation

1. **Email Case-Insensitivity**
   - Supabase treats emails as case-insensitive
   - Stores original case but matches case-insensitively
   - iOS should follow same behavior

2. **Password Complexity**
   - Only requires 8+ with mixed case + number
   - No special character requirement (unlike many systems)
   - Don't add extra validation iOS-side

3. **Token Expiration**
   - Reset token: 24 hours
   - Session token: 1 hour (auto-refresh handled by SDK)
   - Verification link: 24 hours

4. **Rate Limiting**
   - Resend email: ~1 per minute per email
   - Login attempts: ~5 per minute (then cooldown)
   - Handle gracefully with retry messaging

5. **Email Delivery**
   - Can take up to 60 seconds
   - User shouldn't close app during verification
   - Add retry logic in email verification polling

### iOS-Specific Considerations

1. **Deep Links**
   - Reset password email links must trigger app opening
   - Must extract token from URL parameters
   - Configure URL schemes in Xcode

2. **Keyboard Handling**
   - Dismiss keyboard on submit
   - Return key should submit form (not insert newline)
   - Email field: email keyboard type
   - Password field: default keyboard type

3. **Show/Hide Password Toggle**
   - Affects BOTH password fields simultaneously
   - Eye icon state shared across both fields
   - Clear visual feedback of toggle state

4. **Auto-Redirect**
   - After successful actions (verify email, reset password)
   - Show countdown timer
   - Allow manual skip via button
   - 2-3 second countdown typical

---

## Testing Strategy

### Unit Tests (Per Page)

- Form validation logic
- Error message generation
- State transitions
- Password strength calculation

### Integration Tests

- Auth flow: signup → verify → login
- Password recovery: forgot → reset → login
- Token validation and expiration

### E2E Tests (with Playwright on web)

- Full signup flow on web
- Full signup flow on iOS
- Compare behavior and UX

### Manual Testing Checklist

- [ ] Happy path (successful flow)
- [ ] Error scenarios (invalid inputs, network issues)
- [ ] Edge cases (very long names, special chars, rapid clicks)
- [ ] Accessibility (VoiceOver, keyboard navigation)
- [ ] Performance (<2s page loads, smooth animations)

---

## Communication with iOS Claude

### When Handing Off a Page Spec

**Example message to iOS Claude:**

```
I have a complete specification for the [Page Name] page.
Web route: [route]
Estimated time: [days]
Dependencies: [previous pages]

Key features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Spec file: iOS_SPEC_Phase1_[Name].md
Architecture reference: iOS_ARCHITECTURE_MIRRORING.md

Please implement this page following the specification.
After completion, I'll test it side-by-side with the web version.
```

### Progress Tracking

- [ ] Login - iOS Claude building
- [ ] Signup - Waiting for login completion
- [ ] Email Verify - Waiting for signup completion
- [ ] Forgot Password - Waiting for email verify completion
- [ ] Reset Password - Waiting for forgot password completion

---

## What to Do If iOS Implementation Diverges from Web

### Option 1: Accept iOS UX Difference

If iOS version is better UX (platform-native pattern), keep it different.
Example: iOS native date picker vs web date input

### Option 2: Align Web to iOS

If iOS pattern is superior, refactor web to match.
Improves overall consistency.

### Option 3: Refactor Both

If both implementations reveal a better pattern, update both.

### Document the Decision

Always document WHY they differ (platform constraints, UX research, etc.)

---

## After Phase 1: Planning Phase 2

### Phase 2 Pages (Dashboard + Lists)

1. **Dashboard** - Summary cards, recent activity
2. **Coaches List** - Filterable list with search
3. **Schools List** - Filterable list with search
4. **Interactions List** - Activity timeline

### Create Phase 2 Specs

1. Copy `iOS_PAGE_SPEC_TEMPLATE.md`
2. Fill in sections for each page
3. Reference web implementation (`pages/dashboard.vue`, `pages/coaches/index.vue`, etc.)
4. Follow same 12-section structure
5. Hand off to iOS Claude

### Timeline

- Phase 2 specs: ~1-2 days to write (3 specs)
- Phase 2 implementation: ~10 days
- Total for both: ~12 days

---

## Success Criteria for Phase 1

✅ **Completion checklist:**

- [ ] Login page functional on iOS (email, password, validation, Keychain)
- [ ] Signup page functional on iOS (role selection, form, family code)
- [ ] Email verification working (polling, resend, redirect)
- [ ] Forgot password working (email request, success message)
- [ ] Reset password working (deep links, token validation, password reset)
- [ ] All 5 pages tested on iOS and web
- [ ] No major UX discrepancies between platforms
- [ ] Supabase auth patterns established and reusable
- [ ] Phase 2 planning underway

---

## Final Notes

**You've built a world-class porting strategy:**

- ✅ Page-by-page specs prevent scope creep
- ✅ Parallel testing catches parity issues early
- ✅ Architecture alignment ensures both teams think similarly
- ✅ Comprehensive specs = iOS can work autonomously
- ✅ Reusable template = Phase 2+ specs are faster

**Key success factors going forward:**

1. Test both apps after each page (don't skip this)
2. Document platform-specific differences
3. Refactor web if iOS reveals better UX
4. Keep specs updated as you learn
5. Maintain feature parity (same APIs, same flows)

You're set up for success! 🚀

---

## Quick Links

- **Templates:** `/planning/iOS_PAGE_SPEC_TEMPLATE.md`
- **Roadmap:** `/planning/iOS_PAGE_PRIORITY.md`
- **Architecture:** `/planning/iOS_ARCHITECTURE_MIRRORING.md`
- **Current Work:** iOS Claude building login
- **Next:** Signup spec ready when login is done

---

**Created:** February 6, 2026
**Status:** Phase 1 Complete & Ready for iOS Implementation
**Confidence Level:** 🟢 High - All specifications verified against web implementation
