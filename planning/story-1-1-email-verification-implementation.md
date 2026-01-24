# Story 1.1: Email Verification Implementation Plan

**Status:** Approved
**Date Created:** 2026-01-24
**Story:** Parent Creates Account (Story 1.1)
**Related User Story File:** `/research/userStory-1-1.md`

---

## Executive Summary

Implement email verification for user accounts to satisfy Story 1.1 acceptance criteria. Current implementation allows account creation but lacks email verification workflow. This plan adds a complete email verification flow using Supabase's built-in email confirmation feature.

**Key Decisions:**
- ✅ Use Supabase's native email confirmation (automatic token handling, cleaner integration)
- ✅ Full app access for unverified users (email verification is optional/reminder)
- ✅ Resend option on verify email page + account settings
- ✅ Auto-verify and redirect to dashboard on email link click

---

## User Story Acceptance Criteria Mapping

| Acceptance Criteria | Implementation Component |
|---|---|
| Signup flow completes in under 2 minutes | Verify email page with async email sending |
| Verification email arrives within 1 minute | Supabase email service (configured in backend) |
| Password must be at least 8 characters | ✅ Already implemented |
| Email must be valid format | ✅ Already implemented |
| Cannot use duplicate email addresses | ✅ Already implemented |
| Passwords are securely hashed | ✅ Already implemented |

---

## Architecture Overview

### Email Verification Flow

```
User Signup
  ↓
Account created in Supabase Auth (email_confirmed_at = null)
  ↓
User profile created in public.users table
  ↓
Verification email sent via Supabase
  ↓
Redirect to /verify-email page
  ↓
[Option 1] User clicks link in email
  ↓
Auto-verify & redirect to dashboard
  ↓
[Option 2] User clicks "Resend" on verify page
  ↓
New verification email sent
```

### Key Components

**1. Signup Page Updates** (`pages/signup.vue`)
- After successful signup, redirect to `/verify-email` instead of `/dashboard`
- Pass email as route param or get from userStore

**2. Verify Email Page** (`pages/verify-email.vue`)
- Display verification status
- Show email address being verified
- "Resend verification email" button
- Handle token verification from email link (via query param)
- Auto-verify and redirect on token click
- Error handling for expired/invalid tokens

**3. Verify Email Composable** (`composables/useEmailVerification.ts`)
- `verifyEmailToken(token)` - Verify token from email link
- `resendVerificationEmail(email)` - Request new verification email
- `checkEmailVerificationStatus(userId)` - Check if user is verified
- Loading and error states

**4. Auth Composable Updates** (`composables/useAuth.ts`)
- Trigger email verification on signup (Supabase native)
- No major changes needed; Supabase handles automatically

**5. User Store Updates** (`stores/user.ts`)
- Add `isEmailVerified` getter to check verification status
- Update user initialization to include verification status

**6. Account Settings Component** (existing or new)
- Add "Verify email" section showing current status
- "Resend verification email" button if not verified

---

## Implementation Phases

### Phase 1: Setup & Configuration
**Objective:** Prepare Supabase for email verification

**Tasks:**
1. Verify Supabase email confirmation is enabled in project settings
2. Check email templates in Supabase (confirmation email template)
3. Test email sending in development environment
4. Document verification token format and expiry

**Files to Check/Modify:**
- Supabase project settings (UI, not code files)
- None in codebase (configuration only)

**Acceptance Criteria:**
- [ ] Verification emails send successfully in dev environment
- [ ] Email contains clickable verification link with token

---

### Phase 2: Create Email Verification Composable
**Objective:** Implement email verification logic layer

**New File:** `composables/useEmailVerification.ts`

**Functions:**
```typescript
export const useEmailVerification = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Verify token from email link
  const verifyEmailToken = async (token: string): Promise<boolean> => {
    // Call API endpoint to verify token
  };

  // Resend verification email
  const resendVerificationEmail = async (email: string): Promise<boolean> => {
    // Call API endpoint to resend
  };

  // Check if user email is verified
  const checkEmailVerificationStatus = async (userId: string): Promise<boolean> => {
    // Fetch user from auth and check email_confirmed_at
  };

  return {
    loading,
    error,
    verifyEmailToken,
    resendVerificationEmail,
    checkEmailVerificationStatus,
  };
};
```

**API Endpoints Needed:**
- `POST /api/auth/verify-email` - Verify token from email link
- `POST /api/auth/resend-verification` - Resend verification email

---

### Phase 3: Create API Endpoints
**Objective:** Handle email verification on backend

**New Files:**

#### `server/api/auth/verify-email.post.ts`
```
POST /api/auth/verify-email
Body: { token: string }
Response: { success: boolean; message: string }

Logic:
1. Extract token from request body
2. Call Supabase admin API to verify email with token
3. Return success/error
4. Handle expired token, invalid token, already verified
```

#### `server/api/auth/resend-verification.post.ts`
```
POST /api/auth/resend-verification
Body: { email: string }
Response: { success: boolean; message: string }

Logic:
1. Verify user is authenticated (optional, or allow by email)
2. Call Supabase admin API to resend confirmation email
3. Return success/error
4. Handle user not found, already verified, rate limiting
```

**Dependencies:**
- Supabase admin client (already available in server context)
- Error handling utilities

---

### Phase 4: Create Verify Email Page
**Objective:** User interface for email verification

**New File:** `pages/verify-email.vue`

**Features:**
- Display email being verified (from store or route param)
- Show verification status
  - "Waiting for verification..." (pending)
  - "Email verified!" (confirmed)
  - "Verification failed" (error)
- "Resend verification email" button (with rate limit)
- "Back to dashboard" link
- Handle token from email link (query param `token`)
- Auto-verify if token in URL and redirect
- Show expiry warning if applicable
- Skeleton/loading state while checking status
- Error messages with retry options

**Layout:**
- Centered card (similar to signup/login pages)
- Email confirmation icon/checkmark
- Clear CTA buttons
- Help text explaining what to expect

---

### Phase 5: Update Signup Flow
**Objective:** Integrate email verification into existing signup

**Changes to:** `pages/signup.vue`

**Modifications:**
- Line 631-632: Change redirect from `/dashboard` to `/verify-email`
- Pass email as route param: `navigateTo('/verify-email?email=' + validated.email)`
- Update success message to mention email verification

**Changes to:** `composables/useAuth.ts`
- No changes (Supabase handles verification email automatically on signup)

---

### Phase 6: Update User Store & Composables
**Objective:** Add email verification status tracking

**Changes to:** `stores/user.ts`

**Add:**
```typescript
// In state
isEmailVerified: boolean;

// In getter
isEmailVerified: (state) => {
  return state.user?.email_confirmed_at !== null;
}

// In action
refreshVerificationStatus: async (userId: string) => {
  // Fetch latest user to check email_confirmed_at
}
```

**Changes to:** `composables/useAuth.ts`
- No major changes required
- Supabase handles email confirmation automatically

---

### Phase 7: Add Account Settings Section (Optional, Phase 2)
**Objective:** Allow users to resend verification from settings

**File:** `pages/account-settings.vue` (or add to existing settings)

**Component:**
- Show email verification status
- Display verified date if confirmed
- "Resend verification email" button if not verified
- Success/error messages

**Not blocking for Phase 1; can be added later.**

---

## Testing Strategy

### Unit Tests
**New File:** `tests/unit/composables/useEmailVerification.spec.ts`

**Test Cases:**
- [ ] `verifyEmailToken()` succeeds with valid token
- [ ] `verifyEmailToken()` fails with invalid token
- [ ] `verifyEmailToken()` fails with expired token
- [ ] `resendVerificationEmail()` succeeds with valid email
- [ ] `resendVerificationEmail()` fails for non-existent email
- [ ] `resendVerificationEmail()` fails if email already verified
- [ ] `checkEmailVerificationStatus()` returns true for verified user
- [ ] `checkEmailVerificationStatus()` returns false for unverified user
- [ ] Loading states managed correctly
- [ ] Error states set appropriately

**New File:** `tests/unit/stores/user.spec.ts` (add to existing)

**Additional Test Cases:**
- [ ] `isEmailVerified` getter returns correct status
- [ ] `refreshVerificationStatus()` updates store

---

### E2E Tests
**New File:** `tests/e2e/tier1-critical/email-verification.spec.ts`

**Test Cases:**
- [ ] User signup redirects to verify email page
- [ ] Verify email page displays user's email
- [ ] Resend button sends new verification email
- [ ] Email verification link auto-verifies and redirects to dashboard
- [ ] Invalid token shows error message
- [ ] Expired token shows appropriate error
- [ ] User can still access app while unverified
- [ ] Verification status updates after email confirmation

**Existing Test to Update:** `tests/e2e/tier1-critical/auth.spec.ts`
- [ ] Update signup test to verify redirect to `/verify-email`
- [ ] May need to handle email verification in fixtures for other tests

---

### Integration Tests
**New File:** `tests/integration/email-verification.integration.spec.ts`

**Test Scenarios:**
- [ ] Full signup → verify email → access dashboard flow
- [ ] Resend verification email in middle of flow
- [ ] User store updates after email verification
- [ ] Token validation and expiry handling

---

## File Structure Summary

```
├── pages/
│   ├── signup.vue (MODIFY - redirect to /verify-email)
│   ├── verify-email.vue (NEW)
│   └── account-settings.vue (MODIFY - add verify email section, optional Phase 2)
│
├── composables/
│   ├── useEmailVerification.ts (NEW)
│   ├── useAuth.ts (NO CHANGES - Supabase handles it)
│   └── useFormValidation.ts (NO CHANGES)
│
├── stores/
│   └── user.ts (MODIFY - add isEmailVerified getter)
│
├── server/api/auth/
│   ├── verify-email.post.ts (NEW)
│   └── resend-verification.post.ts (NEW)
│
└── tests/
    ├── e2e/
    │   ├── tier1-critical/
    │   │   ├── auth.spec.ts (MODIFY - add verify email tests)
    │   │   └── email-verification.spec.ts (NEW)
    │   └── fixtures/
    │       └── auth.fixture.ts (MODIFY - add verify email helper)
    │
    ├── unit/
    │   └── composables/
    │       └── useEmailVerification.spec.ts (NEW)
    │
    └── integration/
        └── email-verification.integration.spec.ts (NEW)
```

---

## Implementation Order

1. **Phase 1 - Setup** (Config, no code)
2. **Phase 3 - API Endpoints** (Backend foundation)
3. **Phase 2 - Composable** (Business logic)
4. **Phase 4 - Verify Email Page** (UI)
5. **Phase 5 - Signup Updates** (Integration)
6. **Phase 6 - Store Updates** (State management)
7. **Phase 7 - Account Settings** (Optional, future)
8. **Testing** (Throughout all phases; write tests as you implement)

---

## Technical Details

### Supabase Email Confirmation

**How it works:**
1. On signup, Supabase Auth automatically sends verification email if `Double confirm users` is enabled
2. Email contains link with token: `YOUR_REDIRECT_URL?token_hash=XXX&type=email_confirmation`
3. Frontend extracts token and calls Supabase auth API to confirm
4. Supabase sets `email_confirmed_at` on user record

**Configuration:**
- Check Supabase project settings → Authentication → Email Templates
- Verify "Confirm signup" email is enabled and customized as needed

**User Metadata:**
- `email_confirmed_at` - ISO timestamp when email was verified (null if unverified)
- Available via `useSupabase().auth.getUser()`

### Verification Token Format

```
Token Type: email confirmation hash
Location: Email link query param (?token_hash=...)
Expiry: Typically 24-48 hours (configurable in Supabase)
```

### Rate Limiting Considerations

- Resend endpoint should rate limit to prevent abuse (e.g., 3 requests per 5 minutes)
- Consider checking time since last email before allowing resend
- Display countdown timer to user if rate limited

---

## Error Handling

**User-Facing Errors:**
- Invalid token → "Verification link is invalid or expired. Please request a new one."
- Expired token → "Verification link has expired. Please request a new one."
- Already verified → "Your email is already verified. Welcome!"
- Email not found → "Email address not found. Please sign up again."
- Rate limited → "Please wait X seconds before requesting another verification email."
- Email send failed → "Unable to send verification email. Please try again."

**Developer Logging:**
- Log all token verification attempts (success/failure)
- Log email send requests and failures
- Monitor for rate limit abuse patterns

---

## Assumptions & Risks

**Assumptions:**
- Supabase email service is configured and working (test in Phase 1)
- Email templates are customized with appropriate branding
- Verification tokens are secure and time-bound
- Users have access to email (no offline scenarios)

**Risks & Mitigations:**
| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Users can't receive emails | Medium | Test with real email; provide support contact |
| Token expires before user checks email | Low | Set reasonable expiry (24-48h); allow resend |
| Race condition on verify + login | Low | Check `email_confirmed_at` server-side on auth |
| Users bypass email verification | Low | Not blocking (by design); verification UX encourages completion |
| API endpoint abuse | Medium | Implement rate limiting on resend endpoint |

---

## Success Criteria

- [ ] All acceptance criteria from Story 1.1 satisfied
- [ ] Email verification flow works end-to-end
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Integration tests written and passing
- [ ] Error states handled gracefully
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Code review approved

---

## Future Enhancements (Out of Scope)

- Admin resend verification for users
- Email verification reminders (scheduled jobs)
- Account deletion if email not verified after X days
- OAuth/social login (different verification flow)
- SMS as alternative verification method
- Verification analytics/metrics

---

## References

- [Supabase Email Confirmation](https://supabase.com/docs/guides/auth/email-auth)
- [Supabase Auth Tokens](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-deep-dive-jwts)
- Story 1.1: `/research/userStory-1-1.md`
- Existing Auth Implementation: `pages/signup.vue`, `composables/useAuth.ts`, `stores/user.ts`

---

## Sign-Off

**Plan Status:** ✅ Ready for Implementation
**Approval:** Waiting for user approval to proceed with Phase 1 setup

Once approved, implementation will proceed in order as listed in "Implementation Order" section.
