# Family Unit Symmetric Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow either a player or parent to create a family unit and invite the other via email or family code, eliminating the dead-end that parents hit when signing up before players.

**Architecture:** The `family_units` table loses its `player_user_id` FK (player-as-owner model) and gains `created_by_user_id` (audit anchor). A new `family_invitations` table tracks email-based invites with tokens. All existing data scoping via `family_unit_id` is preserved — only the creation/linking model changes. Signup auto-creates a family for both roles; `/join?token=` handles token acceptance for both web and iOS.

**Tech Stack:** Nuxt 3, Supabase (PostgreSQL + RLS), Nitro API routes, Vitest (unit/integration), Playwright (E2E), TypeScript strict

**Design doc:** `docs/plans/2026-02-28-family-unit-symmetric-redesign.md`

---

## Pre-flight Check

Before starting, verify:
```bash
npm run type-check   # should pass clean
npm run test         # all tests passing
```

Note the current test count so you know if you break something.

---

## Task 1: Database Migration — Schema Changes

**Files:**
- Create: `supabase/migrations/20260228000000_family_unit_symmetric.sql`

Migration naming convention: `YYYYMMDDHHMMSS_description.sql` (see `supabase/migrations/20260223000000_help_feedback.sql` as reference).

**Step 1: Write the migration**

```sql
-- supabase/migrations/20260228000000_family_unit_symmetric.sql

-- 1. Add created_by_user_id (nullable during transition)
ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id);

-- 2. Backfill created_by_user_id from player_user_id for existing rows
UPDATE family_units
  SET created_by_user_id = player_user_id
  WHERE created_by_user_id IS NULL AND player_user_id IS NOT NULL;

-- 3. Make created_by_user_id NOT NULL now that it's backfilled
ALTER TABLE family_units
  ALTER COLUMN created_by_user_id SET NOT NULL;

-- 4. Drop player_user_id (RLS policies that reference it will be rebuilt below)
ALTER TABLE family_units
  DROP COLUMN IF EXISTS player_user_id;

-- 5. Create family_invitations table
CREATE TABLE IF NOT EXISTS family_invitations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_unit_id   uuid NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
  invited_by       uuid NOT NULL REFERENCES users(id),
  invited_email    text NOT NULL,
  role             text NOT NULL CHECK (role IN ('player', 'parent')),
  token            text NOT NULL UNIQUE,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz
);

-- Index for token lookups (used on every /join page load)
CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON family_invitations(token);
-- Index for listing pending invites by family
CREATE INDEX IF NOT EXISTS idx_family_invitations_family ON family_invitations(family_unit_id, status);

-- 6. RLS: family_units
-- Anyone who is a member of a family can read it
-- The creator (or any member) can update it
-- Only the creator can delete it

DROP POLICY IF EXISTS "family_units_select" ON family_units;
DROP POLICY IF EXISTS "family_units_insert" ON family_units;
DROP POLICY IF EXISTS "family_units_update" ON family_units;
DROP POLICY IF EXISTS "family_units_delete" ON family_units;

ALTER TABLE family_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_units_select" ON family_units
  FOR SELECT USING (
    id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "family_units_insert" ON family_units
  FOR INSERT WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "family_units_update" ON family_units
  FOR UPDATE USING (
    id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "family_units_delete" ON family_units
  FOR DELETE USING (created_by_user_id = auth.uid());

-- 7. RLS: family_invitations
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;

-- Any family member can view invitations for their family
CREATE POLICY "family_invitations_select" ON family_invitations
  FOR SELECT USING (
    family_unit_id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Any family member can create invitations
CREATE POLICY "family_invitations_insert" ON family_invitations
  FOR INSERT WITH CHECK (
    family_unit_id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
    AND invited_by = auth.uid()
  );

-- Only the inviter can update (e.g., revoke/resend)
CREATE POLICY "family_invitations_update" ON family_invitations
  FOR UPDATE USING (invited_by = auth.uid());

-- Only the inviter can delete
CREATE POLICY "family_invitations_delete" ON family_invitations
  FOR DELETE USING (invited_by = auth.uid());

-- Public can read a specific invitation by token (needed for /join page, no auth)
-- This is handled in the API route by using service role key, not direct RLS
```

**Step 2: Apply the migration locally**

```bash
npx supabase db push
# or if using local dev:
npx supabase migration up
```

Expected: Migration applied without errors.

**Step 3: Regenerate TypeScript types**

```bash
npx supabase gen types typescript --local > types/database.ts
```

Expected: `types/database.ts` updated. You should now see `family_invitations` as a table type and `player_user_id` removed from `family_units`.

**Step 4: Check for type errors**

```bash
npm run type-check
```

Expected: Errors only where code references `player_user_id` — these are the files to fix in subsequent tasks. Note all failing files. Do NOT fix them yet.

**Step 5: Commit**

```bash
git add supabase/migrations/20260228000000_family_unit_symmetric.sql types/database.ts
git commit -m "feat(db): family unit symmetric schema — drop player_user_id, add family_invitations"
```

---

## Task 2: Update `family/create` Endpoint

**Files:**
- Modify: `server/api/family/create.post.ts`
- Modify: `tests/integration/family-management.integration.spec.ts`

The endpoint currently blocks non-players. Remove that restriction. Use `created_by_user_id` instead of `player_user_id`.

**Step 1: Write the failing test**

In `tests/integration/family-management.integration.spec.ts`, add:

```typescript
describe('POST /api/family/create — symmetric', () => {
  it('allows a parent to create a family unit', async () => {
    // Mock auth as parent role
    mockAuth({ userId: 'parent-user-id', role: 'parent' })
    mockSupabaseInsert('family_units', {
      id: 'family-123',
      created_by_user_id: 'parent-user-id',
      family_code: 'FAM-TESTCODE',
      family_name: 'My Family',
    })
    mockSupabaseInsert('family_members', {})

    const result = await $fetch('/api/family/create', { method: 'POST' })

    expect(result.familyCode).toMatch(/^FAM-[A-Z0-9]{8}$/)
    expect(result.familyUnitId).toBe('family-123')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/integration/family-management.integration.spec.ts
```

Expected: FAIL — parent blocked by role check.

**Step 3: Update the endpoint**

In `server/api/family/create.post.ts`:

- Remove the `if (role !== 'player')` guard (or change to allow both roles)
- Replace all references to `player_user_id` with `created_by_user_id`
- The `family_members` insert with `role: 'player'` should become `role: userRole` (the actual role of the creator)

```typescript
// Replace the role guard:
// BEFORE:
if (role !== 'player') {
  throw createError({ statusCode: 403, statusMessage: 'Only players can create families' })
}

// AFTER: Remove entirely. Both roles can create families.

// Replace player_user_id with created_by_user_id in the insert:
// BEFORE:
const { data: family } = await supabase.from('family_units').insert({
  player_user_id: userId,
  family_code: code,
  ...
})

// AFTER:
const { data: family } = await supabase.from('family_units').insert({
  created_by_user_id: userId,
  family_code: code,
  ...
})

// Update family_members role to use actual user role:
// BEFORE:
.insert({ family_unit_id: family.id, user_id: userId, role: 'player' })

// AFTER:
.insert({ family_unit_id: family.id, user_id: userId, role: userRole })
```

**Step 4: Run tests**

```bash
npm run test -- tests/integration/family-management.integration.spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/api/family/create.post.ts tests/integration/family-management.integration.spec.ts
git commit -m "feat(api): allow parent or player to create family unit"
```

---

## Task 3: Update `family/code/join` Endpoint

**Files:**
- Modify: `server/api/family/code/join.post.ts`

Currently blocks players. Remove that restriction — a player can join a parent-created family via code.

**Step 1: Write the failing test**

In `tests/integration/family-management.integration.spec.ts`, add:

```typescript
it('allows a player to join a family via code', async () => {
  mockAuth({ userId: 'player-user-id', role: 'player' })
  mockSupabaseSelect('family_units', [{ id: 'family-123', family_code: 'FAM-TESTCODE' }])
  mockSupabaseSelect('family_members', []) // not already a member

  const result = await $fetch('/api/family/code/join', {
    method: 'POST',
    body: { familyCode: 'FAM-TESTCODE' },
  })

  expect(result.success).toBe(true)
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/integration/family-management.integration.spec.ts
```

Expected: FAIL — player blocked.

**Step 3: Update the endpoint**

In `server/api/family/code/join.post.ts`:

- Remove the `if (role !== 'parent')` guard
- Keep the "can't join your own family" check (check if user is already the creator)
- Keep the "already a member" idempotency check

```typescript
// Remove this guard:
// BEFORE:
if (role !== 'parent') {
  throw createError({ statusCode: 403, statusMessage: 'Only parents can join families via code' })
}
// AFTER: Remove entirely.
```

**Step 4: Run tests**

```bash
npm run test -- tests/integration/family-management.integration.spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/api/family/code/join.post.ts
git commit -m "feat(api): allow players to join parent-created families via code"
```

---

## Task 4: New Email Invite Endpoints

**Files:**
- Create: `server/api/family/invite.post.ts`
- Create: `server/api/family/invite/[token].get.ts`
- Create: `server/api/family/invite/[token]/accept.post.ts`
- Create: `server/api/family/invitations/index.get.ts`
- Create: `server/api/family/invitations/[id].delete.ts`
- Create: `tests/unit/server/api/family-invite.spec.ts`

**Step 1: Write the failing tests**

```typescript
// tests/unit/server/api/family-invite.spec.ts
import { describe, it, expect, vi } from 'vitest'

describe('POST /api/family/invite', () => {
  it('creates an invitation and returns token', async () => {
    // Mock: user is authenticated member of a family
    // Mock: supabase insert into family_invitations succeeds
    // Mock: email send succeeds
    // Assert: returns { success: true, invitationId: '...' }
  })

  it('rejects if invited email is already a member', async () => {
    // Mock: supabase finds existing family_member with that email
    // Assert: throws 409 conflict
  })

  it('rejects if inviter is not a family member', async () => {
    // Mock: no family_members record for the current user
    // Assert: throws 403
  })
})

describe('GET /api/family/invite/[token]', () => {
  it('returns family info for valid pending token', async () => {
    // Mock: finds invitation with matching token, status=pending, not expired
    // Assert: returns { familyName, inviterName, role, email }
  })

  it('returns 404 for unknown token', async () => {
    // Mock: no invitation found
    // Assert: throws 404
  })

  it('returns 410 Gone for expired token', async () => {
    // Mock: invitation found but expires_at < now
    // Assert: throws 410
  })

  it('returns 409 for already-accepted token', async () => {
    // Mock: invitation found, status=accepted
    // Assert: throws 409
  })
})

describe('POST /api/family/invite/[token]/accept', () => {
  it('creates family_member record and marks invitation accepted', async () => {
    // Mock: valid pending invitation
    // Mock: user is authenticated and email matches (or warn if mismatch)
    // Assert: family_members insert called, invitation updated to accepted
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/unit/server/api/family-invite.spec.ts
```

Expected: FAIL — files don't exist yet.

**Step 3: Implement `POST /api/family/invite`**

```typescript
// server/api/family/invite.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { useLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, 'family/invite')
  const { userId } = await requireAuth(event)

  const body = await readBody(event)
  const { email, role } = body

  if (!email || !role || !['player', 'parent'].includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'email and role (player|parent) are required' })
  }

  const supabase = useSupabaseClient(event)

  // Find the inviter's family
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_unit_id')
    .eq('user_id', userId)
    .single()

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'You are not a member of any family' })
  }

  const familyUnitId = membership.family_unit_id

  // Check if the invited email is already a member
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_unit_id', familyUnitId)
      .eq('user_id', existingUser.id)
      .single()

    if (existingMember) {
      throw createError({ statusCode: 409, statusMessage: 'This person is already a member of your family' })
    }
  }

  // Get inviter name and family name for the email
  const { data: inviterProfile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single()

  const { data: family } = await supabase
    .from('family_units')
    .select('family_name')
    .eq('id', familyUnitId)
    .single()

  const token = randomUUID()

  const { data: invitation, error } = await supabase
    .from('family_invitations')
    .insert({
      family_unit_id: familyUnitId,
      invited_by: userId,
      invited_email: email.toLowerCase().trim(),
      role,
      token,
    })
    .select('id')
    .single()

  if (error) {
    logger.error('Failed to create invitation', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create invitation' })
  }

  // Send invite email (non-blocking — don't fail if email fails)
  try {
    await sendInviteEmail({
      to: email,
      inviterName: inviterProfile?.full_name ?? 'Your family',
      familyName: family?.family_name ?? 'My Family',
      role,
      token,
    })
  } catch (err) {
    logger.warn('Failed to send invite email — invitation created but email not sent', err)
  }

  logger.info('Invitation created', { invitationId: invitation.id, role, familyUnitId })
  return { success: true, invitationId: invitation.id }
})
```

**Step 4: Implement `GET /api/family/invite/[token]`**

This endpoint requires NO auth (used on the public `/join` page). Use the Supabase service role key.

```typescript
// server/api/family/invite/[token].get.ts
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { useLogger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, 'family/invite/token')
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token is required' })
  }

  // Use service role to bypass RLS — this is a public endpoint
  const supabase = useSupabaseServiceClient()

  const { data: invitation } = await supabase
    .from('family_invitations')
    .select(`
      id, invited_email, role, status, expires_at,
      family_units ( family_name ),
      users!invited_by ( full_name )
    `)
    .eq('token', token)
    .single()

  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
  }

  if (invitation.status === 'accepted') {
    throw createError({ statusCode: 409, statusMessage: 'This invitation has already been accepted' })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'This invitation has expired' })
  }

  return {
    invitationId: invitation.id,
    email: invitation.invited_email,
    role: invitation.role,
    familyName: invitation.family_units?.family_name ?? 'My Family',
    inviterName: invitation.users?.full_name ?? 'A family member',
  }
})
```

**Step 5: Implement `POST /api/family/invite/[token]/accept`**

```typescript
// server/api/family/invite/[token]/accept.post.ts
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { useLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, 'family/invite/accept')
  const { userId, email: userEmail } = await requireAuth(event)
  const token = getRouterParam(event, 'token')

  const supabase = useSupabaseClient(event)

  const { data: invitation } = await supabase
    .from('family_invitations')
    .select('id, family_unit_id, invited_email, role, status, expires_at')
    .eq('token', token)
    .single()

  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
  }

  if (invitation.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Invitation is no longer valid' })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'This invitation has expired' })
  }

  // Email mismatch: warn but allow (user logged in with different email)
  const emailMismatch = userEmail?.toLowerCase() !== invitation.invited_email.toLowerCase()

  // Check if already a member (idempotent)
  const { data: existing } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_unit_id', invitation.family_unit_id)
    .eq('user_id', userId)
    .single()

  if (!existing) {
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_unit_id: invitation.family_unit_id,
        user_id: userId,
        role: invitation.role,
      })

    if (memberError) {
      logger.error('Failed to add family member', memberError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to join family' })
    }
  }

  await supabase
    .from('family_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  logger.info('Invitation accepted', { invitationId: invitation.id, userId, emailMismatch })
  return { success: true, familyUnitId: invitation.family_unit_id, emailMismatch }
})
```

**Step 6: Implement `GET /api/family/invitations`**

```typescript
// server/api/family/invitations/index.get.ts
import { defineEventHandler, createError } from 'h3'
import { useLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, 'family/invitations')
  const { userId } = await requireAuth(event)
  const supabase = useSupabaseClient(event)

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_unit_id')
    .eq('user_id', userId)
    .single()

  if (!membership) {
    return { invitations: [] }
  }

  const { data: invitations, error } = await supabase
    .from('family_invitations')
    .select('id, invited_email, role, status, expires_at, created_at, users!invited_by(full_name)')
    .eq('family_unit_id', membership.family_unit_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Failed to fetch invitations', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch invitations' })
  }

  return { invitations: invitations ?? [] }
})
```

**Step 7: Implement `DELETE /api/family/invitations/[id]`**

```typescript
// server/api/family/invitations/[id].delete.ts
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { useLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, 'family/invitations/delete')
  const { userId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const supabase = useSupabaseClient(event)

  const { error } = await supabase
    .from('family_invitations')
    .delete()
    .eq('id', id)
    .eq('invited_by', userId) // RLS also enforces this, belt-and-suspenders

  if (error) {
    logger.error('Failed to revoke invitation', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to revoke invitation' })
  }

  logger.info('Invitation revoked', { invitationId: id, userId })
  return { success: true }
})
```

**Step 8: Run tests**

```bash
npm run test -- tests/unit/server/api/family-invite.spec.ts
```

Expected: PASS.

**Step 9: Commit**

```bash
git add server/api/family/invite.post.ts \
        server/api/family/invite/[token].get.ts \
        server/api/family/invite/[token]/accept.post.ts \
        server/api/family/invitations/index.get.ts \
        server/api/family/invitations/[id].delete.ts \
        tests/unit/server/api/family-invite.spec.ts
git commit -m "feat(api): add family email invite endpoints"
```

---

## Task 5: Email Utility for Invite Emails

**Files:**
- Modify or create: `server/utils/email.ts` (check if it exists first — there may already be an email utility)

**Step 1: Check for existing email utilities**

```bash
ls server/utils/
```

If an email utility exists, add `sendInviteEmail` to it. If not, create `server/utils/email.ts`.

**Step 2: Add `sendInviteEmail`**

```typescript
// In server/utils/email.ts (create or add to existing)
export async function sendInviteEmail({
  to,
  inviterName,
  familyName,
  role,
  token,
}: {
  to: string
  inviterName: string
  familyName: string
  role: 'player' | 'parent'
  token: string
}) {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? 'https://recruitingcompass.com'
  const joinUrl = `${baseUrl}/join?token=${token}`

  const roleLabel = role === 'player' ? 'player' : 'parent'

  // Use whatever email provider is already wired up (Resend, SendGrid, etc.)
  // Check server/utils/ or nuxt.config.ts for existing email setup
  // Template:
  //   Subject: "[familyName]'s recruiting journey awaits — you're invited!"
  //   Body: "{inviterName} has invited you to join {familyName}'s recruiting profile as a {roleLabel}."
  //   CTA: "Join [familyName]" → joinUrl
  //   Note: Link expires in 7 days.

  // Implementation depends on existing email provider — adapt accordingly
  throw new Error('TODO: wire up to existing email provider')
}
```

**Step 3: Wire up to existing provider**

Find the existing email provider setup in the codebase:
```bash
grep -r "sendEmail\|resend\|sendgrid\|nodemailer\|email" server/utils/ server/plugins/ nuxt.config.ts --include="*.ts" -l
```

Adapt the `sendInviteEmail` function to use whatever is already there.

**Step 4: Commit**

```bash
git add server/utils/email.ts
git commit -m "feat(email): add sendInviteEmail utility"
```

---

## Task 6: Update Signup Flow

**Files:**
- Modify: `pages/signup.vue`
- Modify: `composables/useAuth.ts`

**Step 1: Write the failing test**

In `tests/unit/pages/auth-a11y.spec.ts` (or a new file `tests/unit/pages/signup.spec.ts`):

```typescript
it('parent signup redirects to parent onboarding, not family-code-entry', async () => {
  // Mount signup.vue with role='parent', no family code
  // Submit form
  // Assert router.push called with '/onboarding/parent'
  // Assert router.push NOT called with '/family-code-entry'
})

it('parent signup no longer shows family code input', async () => {
  // Mount signup.vue, select 'parent'
  // Assert no input with placeholder/label containing 'family code'
})
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/unit/pages/signup.spec.ts
```

**Step 3: Update `composables/useAuth.ts`**

Find the `signup` function. Remove the `familyCode` option entirely from the parent signup path. Both roles should:
1. Create a Supabase auth user
2. Call `POST /api/family/create` after account creation
3. Redirect to their respective onboarding

```typescript
// In useAuth.ts signup():
// REMOVE the options.familyCode parameter and handling
// REMOVE the redirect to '/family-code-entry'

// For parent signup, after account + profile creation:
await $fetch('/api/family/create', { method: 'POST' })
await router.push('/onboarding/parent')

// For player signup, after account + profile creation:
await $fetch('/api/family/create', { method: 'POST' })
await router.push('/onboarding')
```

**Step 4: Update `pages/signup.vue`**

- Remove the family code input field from the parent signup form
- Remove the "if family code → dashboard, else → family-code-entry" branching
- Parent always goes to `/onboarding/parent` after signup

**Step 5: Run tests**

```bash
npm run test -- tests/unit/pages/signup.spec.ts
npm run type-check
```

**Step 6: Commit**

```bash
git add pages/signup.vue composables/useAuth.ts
git commit -m "feat(signup): remove family-code-entry dead end, both roles go to onboarding"
```

---

## Task 7: Parent Onboarding (New Page)

**Files:**
- Create: `pages/onboarding/parent.vue`
- Create: `tests/unit/pages/parent-onboarding.spec.ts`

A short 2-step wizard for parents: (1) player details, (2) invite player.

**Step 1: Write failing tests**

```typescript
// tests/unit/pages/parent-onboarding.spec.ts
describe('Parent Onboarding', () => {
  it('renders step 1 with player detail fields', () => {
    // Mount pages/onboarding/parent.vue
    // Assert: input for player name, graduation year, sport, position visible
    // Assert: step indicator shows "1 of 2"
  })

  it('proceeds to step 2 after completing step 1', async () => {
    // Fill step 1 fields, click Next
    // Assert: step 2 (invite) is shown
  })

  it('step 2 shows email invite input and family code', () => {
    // On step 2
    // Assert: email input for invite visible
    // Assert: family code displayed for copy
  })

  it('submitting step 1 saves player details to the API', async () => {
    // Mock $fetch for PATCH /api/family/player-details or similar
    // Fill and submit step 1
    // Assert: API called with { playerName, graduationYear, sport, position }
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/unit/pages/parent-onboarding.spec.ts
```

**Step 3: Create `pages/onboarding/parent.vue`**

```vue
<script setup lang="ts">
const step = ref(1)
const totalSteps = 2

// Step 1 — Player details
const playerName = ref('')
const graduationYear = ref('')
const sport = ref('')
const position = ref('')

// Step 2 — Invite
const inviteEmail = ref('')
const { familyCode, fetchMyCode } = useFamilyCode()
const { sendInvite } = useFamilyInvite()

onMounted(fetchMyCode)

async function savePlayerDetails() {
  // Save to a new endpoint (or store in family_units.family_name + a player profile record)
  // See Task 8 for the API endpoint that stores pre-fill data
  step.value = 2
}

async function sendPlayerInvite() {
  if (!inviteEmail.value) return
  await sendInvite({ email: inviteEmail.value, role: 'player' })
  await navigateTo('/dashboard')
}

function skipInvite() {
  navigateTo('/dashboard')
}
</script>

<template>
  <div>
    <StepIndicator :current="step" :total="totalSteps" />

    <!-- Step 1: Player Details -->
    <div v-if="step === 1">
      <h1>Tell us about your player</h1>
      <p>We'll pre-fill their profile so they can hit the ground running.</p>
      <UInput v-model="playerName" label="Player's name" placeholder="First Last" />
      <UInput v-model="graduationYear" label="Graduation year" placeholder="2027" />
      <UInput v-model="sport" label="Primary sport" placeholder="Baseball" />
      <UInput v-model="position" label="Position" placeholder="Pitcher" />
      <div class="flex gap-3">
        <UButton variant="ghost" @click="step = 2">Skip for now</UButton>
        <UButton @click="savePlayerDetails">Next</UButton>
      </div>
    </div>

    <!-- Step 2: Invite Player -->
    <div v-if="step === 2">
      <h1>Invite your player</h1>
      <p>Send them an invite or share your family code.</p>
      <UInput v-model="inviteEmail" label="Player's email address" type="email" />
      <UButton @click="sendPlayerInvite">Send invite</UButton>
      <div class="mt-6">
        <p class="text-sm text-gray-500">Or share your family code</p>
        <FamilyCodeDisplay :code="familyCode" />
      </div>
      <UButton variant="ghost" @click="skipInvite">I'll invite them later</UButton>
    </div>
  </div>
</template>
```

**Step 4: Run tests**

```bash
npm run test -- tests/unit/pages/parent-onboarding.spec.ts
```

**Step 5: Commit**

```bash
git add pages/onboarding/parent.vue tests/unit/pages/parent-onboarding.spec.ts
git commit -m "feat(onboarding): add parent onboarding wizard — player details + invite"
```

---

## Task 8: Store Pre-fill Player Data (Parent Onboarding Step 1)

**Files:**
- Create: `server/api/family/player-details.post.ts`

When a parent fills in the player's name/year/sport/position during their onboarding, we need to store it somewhere the player can review when they join.

Store on `family_units` as a JSON blob (simplest) OR create a new column. The simplest path: add a `pending_player_details` JSONB column to `family_units`.

**Step 1: Add migration**

```sql
-- supabase/migrations/20260228000001_family_pending_player_details.sql
ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS pending_player_details jsonb;
```

Apply: `npx supabase db push`

Regenerate types: `npx supabase gen types typescript --local > types/database.ts`

**Step 2: Write the endpoint**

```typescript
// server/api/family/player-details.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { useLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, 'family/player-details')
  const { userId } = await requireAuth(event)
  const body = await readBody(event)

  const { playerName, graduationYear, sport, position } = body

  const supabase = useSupabaseClient(event)

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_unit_id')
    .eq('user_id', userId)
    .single()

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'Not a family member' })
  }

  await supabase
    .from('family_units')
    .update({
      pending_player_details: { playerName, graduationYear, sport, position },
    })
    .eq('id', membership.family_unit_id)

  logger.info('Player details pre-filled by parent', { familyUnitId: membership.family_unit_id })
  return { success: true }
})
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260228000001_family_pending_player_details.sql \
        server/api/family/player-details.post.ts types/database.ts
git commit -m "feat(api): store parent-entered player details for pre-fill on player join"
```

---

## Task 9: New `/join` Page (Token Acceptance)

**Files:**
- Create: `pages/join.vue`
- Create: `tests/unit/pages/join.spec.ts`

**Step 1: Write failing tests**

```typescript
// tests/unit/pages/join.spec.ts
describe('/join page', () => {
  it('shows family and inviter info for valid token', async () => {
    // Mock GET /api/family/invite/[token] → { familyName, inviterName, role, email }
    // Mount pages/join.vue with ?token=valid-token in route
    // Assert: "Invited to join [familyName]" heading visible
    // Assert: "[inviterName] has invited you" visible
  })

  it('shows error for expired token', async () => {
    // Mock GET → 410 Gone
    // Assert: "This invite has expired" message shown
    // Assert: "Request new invite" link/button shown
  })

  it('shows error for already-accepted token', async () => {
    // Mock GET → 409
    // Assert: "Already connected" message shown
  })

  it('shows login form when user is not authenticated', () => {
    // Mock: no auth session
    // Assert: email + password inputs shown
    // Assert: "Sign up instead" link shown
  })

  it('shows confirm button when user is authenticated', () => {
    // Mock: authenticated user
    // Assert: "Connect to [familyName]" button shown (no login form)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/unit/pages/join.spec.ts
```

**Step 3: Create `pages/join.vue`**

```vue
<script setup lang="ts">
definePageMeta({ auth: false }) // Public page

const route = useRoute()
const token = computed(() => route.query.token as string)

// Fetch invite details (public endpoint)
const { data: invite, error, status } = await useFetch(
  () => `/api/family/invite/${token.value}`,
  { immediate: !!token.value }
)

const { isAuthenticated, user } = useUserStore()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const accepted = ref(false)

async function accept() {
  loading.value = true
  try {
    if (!isAuthenticated) {
      await login(email.value, password.value)
    }
    await $fetch(`/api/family/invite/${token.value}/accept`, { method: 'POST' })
    accepted.value = true
    await navigateTo('/dashboard')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-16 px-4">
    <!-- Loading -->
    <div v-if="status === 'pending'">Loading invite...</div>

    <!-- Error states -->
    <div v-else-if="error?.statusCode === 410">
      <h1>This invite has expired</h1>
      <p>Ask {{ invite?.inviterName ?? 'the sender' }} to send a new invite.</p>
    </div>

    <div v-else-if="error?.statusCode === 409">
      <h1>Already connected</h1>
      <p>You're already a member of this family.</p>
      <UButton to="/dashboard">Go to dashboard</UButton>
    </div>

    <div v-else-if="error">
      <h1>Invite not found</h1>
      <p>This link may be invalid or already used.</p>
    </div>

    <!-- Valid invite -->
    <div v-else-if="invite">
      <h1>You're invited to join {{ invite.familyName }}'s recruiting journey</h1>
      <p>{{ invite.inviterName }} has invited you as a {{ invite.role }}.</p>

      <!-- Authenticated: just confirm -->
      <div v-if="isAuthenticated">
        <p class="text-sm text-gray-500">
          Connecting as {{ user?.email }}
          <span v-if="user?.email !== invite.email" class="text-amber-600">
            (invite was sent to {{ invite.email }})
          </span>
        </p>
        <UButton :loading="loading" @click="accept">
          Connect to {{ invite.familyName }}
        </UButton>
      </div>

      <!-- Not authenticated: login or sign up -->
      <div v-else>
        <p class="text-sm text-gray-500 mb-4">Log in to connect, or <NuxtLink to="/signup">create an account</NuxtLink>.</p>
        <UInput v-model="email" label="Email" type="email" :placeholder="invite.email" />
        <UInput v-model="password" label="Password" type="password" />
        <UButton :loading="loading" @click="accept">Log in and connect</UButton>
      </div>
    </div>
  </div>
</template>
```

**Step 4: Run tests**

```bash
npm run test -- tests/unit/pages/join.spec.ts
```

**Step 5: Commit**

```bash
git add pages/join.vue tests/unit/pages/join.spec.ts
git commit -m "feat(pages): add /join token acceptance page for family invites"
```

---

## Task 10: Update Player Onboarding — Step 5 to Invite Step

**Files:**
- Modify: `pages/onboarding/index.vue`
- Modify: `tests/integration/auth-flow-with-onboarding.integration.spec.ts`

Step 5 currently shows "completion + parent invite prompt". Replace with a proper invite flow matching what parents have.

**Step 1: Update onboarding Step 5**

In `pages/onboarding/index.vue`, find the step 5 template section and replace:

```vue
<!-- Step 5: Invite parent (was: completion screen) -->
<div v-if="currentStep === 5">
  <h2>Invite a parent</h2>
  <p>Add a parent so they can follow your recruiting journey with you.</p>

  <UInput v-model="parentInviteEmail" label="Parent's email" type="email" />
  <UButton @click="sendParentInvite">Send invite</UButton>

  <div class="mt-6">
    <p class="text-sm text-gray-500">Or share your family code</p>
    <FamilyCodeDisplay :code="familyCode" />
  </div>

  <UButton variant="ghost" @click="navigateTo('/dashboard')">
    I'll invite them later
  </UButton>
</div>
```

Add composable usage at the top:
```typescript
const { familyCode, fetchMyCode } = useFamilyCode()
const { sendInvite } = useFamilyInvite()
const parentInviteEmail = ref('')

onMounted(fetchMyCode)

async function sendParentInvite() {
  if (!parentInviteEmail.value) return
  await sendInvite({ email: parentInviteEmail.value, role: 'parent' })
  await navigateTo('/dashboard')
}
```

**Step 2: Check if player is joining a parent-created family**

If the player is joining an existing family (via token or code), they may have pre-filled data. At the start of onboarding, check for `pending_player_details` on the family:

```typescript
onMounted(async () => {
  // Check for pre-filled data from parent
  const family = await $fetch('/api/family/my-family') // or fetch from composable
  if (family?.pendingPlayerDetails) {
    // Pre-fill form fields
    graduationYear.value = family.pendingPlayerDetails.graduationYear ?? ''
    primarySport.value = family.pendingPlayerDetails.sport ?? ''
    position.value = family.pendingPlayerDetails.position ?? ''
  }
})
```

**Step 3: Update integration test**

```bash
npm run test -- tests/integration/auth-flow-with-onboarding.integration.spec.ts
```

Fix any assertions that reference the old step 5 completion screen.

**Step 4: Commit**

```bash
git add pages/onboarding/index.vue tests/integration/auth-flow-with-onboarding.integration.spec.ts
git commit -m "feat(onboarding): update step 5 to parent invite; pre-fill from parent-entered data"
```

---

## Task 11: `useFamilyInvite` Composable

**Files:**
- Create: `composables/useFamilyInvite.ts`
- Create: `tests/unit/composables/useFamilyInvite.spec.ts`

Both onboarding pages use `useFamilyInvite` — extract this into a shared composable.

**Step 1: Write failing tests**

```typescript
// tests/unit/composables/useFamilyInvite.spec.ts
describe('useFamilyInvite', () => {
  it('sendInvite posts to /api/family/invite', async () => {
    const fetchSpy = vi.spyOn(globalThis, '$fetch').mockResolvedValue({ success: true })
    const { sendInvite } = useFamilyInvite()

    await sendInvite({ email: 'test@example.com', role: 'parent' })

    expect(fetchSpy).toHaveBeenCalledWith('/api/family/invite', {
      method: 'POST',
      body: { email: 'test@example.com', role: 'parent' },
    })
  })

  it('exposes loading state', async () => {
    const { sendInvite, loading } = useFamilyInvite()
    expect(loading.value).toBe(false)
  })
})
```

**Step 2: Create the composable**

```typescript
// composables/useFamilyInvite.ts
export function useFamilyInvite() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function sendInvite({ email, role }: { email: string; role: 'player' | 'parent' }) {
    loading.value = true
    error.value = null
    try {
      await $fetch('/api/family/invite', { method: 'POST', body: { email, role } })
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to send invite'
      throw err
    } finally {
      loading.value = false
    }
  }

  return { sendInvite, loading, error }
}
```

**Step 3: Run tests**

```bash
npm run test -- tests/unit/composables/useFamilyInvite.spec.ts
```

**Step 4: Commit**

```bash
git add composables/useFamilyInvite.ts tests/unit/composables/useFamilyInvite.spec.ts
git commit -m "feat(composables): add useFamilyInvite for email invite from both onboarding flows"
```

---

## Task 12: Update Family Settings Page — Pending Invitations

**Files:**
- Modify: `pages/settings/family-management.vue`
- Create: `components/FamilyPendingInviteCard.vue`

Add a section showing pending invitations with resend/revoke actions.

**Step 1: Create `FamilyPendingInviteCard.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  invitation: {
    id: string
    invited_email: string
    role: 'player' | 'parent'
    expires_at: string
  }
}>()

const emit = defineEmits<{ revoke: [id: string] }>()
</script>

<template>
  <div class="flex items-center justify-between rounded border p-3">
    <div>
      <p class="font-medium">{{ invitation.invited_email }}</p>
      <p class="text-sm text-gray-500">
        Invited as {{ invitation.role }} · expires {{ useRelativeTime(invitation.expires_at) }}
      </p>
    </div>
    <UButton size="sm" variant="ghost" color="red" @click="emit('revoke', invitation.id)">
      Revoke
    </UButton>
  </div>
</template>
```

**Step 2: Add pending invitations section to family management page**

In `pages/settings/family-management.vue`, add:

```vue
<script setup>
// Add to existing setup
const { invitations, fetchInvitations, revokeInvitation } = useFamilyInvitations()
onMounted(fetchInvitations)
</script>

<!-- Add this section in the template -->
<section v-if="invitations.length">
  <h2>Pending Invitations</h2>
  <FamilyPendingInviteCard
    v-for="inv in invitations"
    :key="inv.id"
    :invitation="inv"
    @revoke="revokeInvitation"
  />
</section>
```

**Step 3: Create `useFamilyInvitations` composable**

```typescript
// composables/useFamilyInvitations.ts
export function useFamilyInvitations() {
  const invitations = ref([])

  async function fetchInvitations() {
    const data = await $fetch('/api/family/invitations')
    invitations.value = data.invitations
  }

  async function revokeInvitation(id: string) {
    await $fetch(`/api/family/invitations/${id}`, { method: 'DELETE' })
    await fetchInvitations()
  }

  return { invitations, fetchInvitations, revokeInvitation }
}
```

**Step 4: Commit**

```bash
git add pages/settings/family-management.vue \
        components/FamilyPendingInviteCard.vue \
        composables/useFamilyInvitations.ts
git commit -m "feat(settings): add pending invitations section with revoke to family management"
```

---

## Task 13: iOS Universal Links (`apple-app-site-association`)

**Files:**
- Create: `public/.well-known/apple-app-site-association`

This file tells iOS to intercept `recruitingcompass.com/join` links and open the app instead of Safari.

**Step 1: Create the file**

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.recruitingcompass.app",
        "paths": ["/join", "/join/*"]
      }
    ]
  }
}
```

Replace `TEAMID` with the actual Apple Team ID from App Store Connect.

**Step 2: Verify Nuxt serves it correctly**

The file must be served at `https://recruitingcompass.com/.well-known/apple-app-site-association` with `Content-Type: application/json` and no redirect.

In `nuxt.config.ts`, add if not already present:
```typescript
nitro: {
  publicAssets: [{ dir: 'public' }]
}
```

**Step 3: Note for iOS team**

The iOS app must have Associated Domains capability enabled with `applinks:recruitingcompass.com`. The `/join` route handler in the iOS app receives the URL and extracts the `token` query parameter, then calls `GET /api/family/invite/[token]` to show the same confirmation UI.

**Step 4: Commit**

```bash
git add public/.well-known/apple-app-site-association
git commit -m "feat(ios): add apple-app-site-association for /join universal link"
```

---

## Task 14: Deprecate `accessible.get.ts`

**Files:**
- Modify: `server/api/family/accessible.get.ts`

This endpoint was parent-only (listing all families a parent belongs to). Now both roles use `GET /api/family/members`. Keep the endpoint but return a deprecation header.

```typescript
// Add to the response:
setResponseHeader(event, 'Deprecation', 'true')
setResponseHeader(event, 'Sunset', '2026-06-01')
```

Or redirect to the new endpoint if it's safe to do so. Check if anything in the iOS app or other consumers calls this endpoint before deleting.

**Step 1: Commit**

```bash
git add server/api/family/accessible.get.ts
git commit -m "chore(api): deprecate family/accessible — superseded by family/members"
```

---

## Task 15: Cleanup — Fix Remaining Type Errors

```bash
npm run type-check
```

Work through any remaining errors from Task 1 (references to `player_user_id` that weren't caught in earlier tasks). Fix each file. Do NOT batch all fixes into one commit — commit per file or logical group.

---

## Task 16: Run Full Test Suite

```bash
npm run test
npm run type-check
npm run lint
```

All tests should pass. Fix any failures. If integration tests reference the old signup flow, update assertions.

---

## Task 17: E2E Tests

**Files:**
- Modify: `tests/e2e/tier1-critical/auth.spec.ts`
- Modify: `tests/e2e/family-units.spec.ts`
- Create: `tests/e2e/family-invite-flow.spec.ts`

**Add these E2E test journeys:**

```typescript
// tests/e2e/family-invite-flow.spec.ts

test('parent signs up first, invites player via email, player joins', async ({ page }) => {
  // 1. Parent signs up
  // 2. Parent completes parent onboarding (player details + invite)
  // 3. Parent sends email invite to player
  // 4. [Intercept] Grab the invite token from the DB or email mock
  // 5. Navigate to /join?token=<token>
  // 6. Player creates account via join page
  // 7. Assert: both accounts see the same family dashboard data
})

test('player signs up first, shares code, parent joins via code', async ({ page }) => {
  // 1. Player signs up
  // 2. Player completes onboarding
  // 3. Player visits settings, copies family code
  // 4. Parent signs up
  // 5. Parent goes to Settings → Family, enters code
  // 6. Assert: parent sees player's data
})

test('expired token shows helpful error on /join page', async ({ page }) => {
  // Use a pre-seeded expired token
  // Navigate to /join?token=expired-token
  // Assert: "This invitation has expired" message visible
})
```

**Step 1: Run E2E tests**

```bash
npm run test:e2e
```

Fix any failures in existing auth.spec.ts or family-units.spec.ts that break due to signup flow changes.

**Step 2: Commit**

```bash
git add tests/e2e/family-invite-flow.spec.ts tests/e2e/tier1-critical/auth.spec.ts tests/e2e/family-units.spec.ts
git commit -m "test(e2e): add family invite flow journeys, fix auth flow assertions"
```

---

## Final Verification

```bash
npm run test          # All unit/integration tests pass
npm run test:e2e      # All E2E tests pass
npm run type-check    # No type errors
npm run lint          # No lint errors
git push              # Hooks pass
```

Check in the browser:
- [ ] Parent signup → parent onboarding → invite player
- [ ] Player signup → onboarding → invite parent
- [ ] `/join?token=` with valid token → connect accounts
- [ ] `/join?token=` with expired token → helpful error
- [ ] Settings → Family shows pending invitations with revoke
- [ ] Family code join still works for both roles

---

## Unresolved Questions

- **Email provider:** Find the existing email setup (`grep -r "resend\|sendgrid\|nodemailer" server/`). Task 5 has a TODO that must be wired up.
- **Apple Team ID:** Needed for the `apple-app-site-association` file (Task 13). Get from App Store Connect.
- **iOS app changes:** The iOS app needs matching changes for the new signup flow and Universal Links handler — out of scope for this plan but should be tracked.
- **`family_units.family_name`:** Currently defaults to "My Family". Consider prompting either party to name the family during onboarding (minor UX improvement, not blocking).
