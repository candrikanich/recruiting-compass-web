# Family Invite Management — Design

**Date:** 2026-02-28
**Status:** Approved

## Problem

Invites can only be sent during onboarding. Users who need to invite a new family member after onboarding, resend a failed invite, or revoke and re-invite have no way to do so.

## Goal

Add invite send/resend/revoke to the Family Management settings page for all roles.

## Design (Option A — Inline Section)

### New "Invite a Family Member" Section

A new card inserted above the existing "Pending Invitations" section, visible to both players and parents.

**Fields:**
- Email input (type="email", required)
- Role dropdown: Player | Parent
- Send button (disabled while loading)
- Inline error/success feedback

**Behavior:**
- Calls `useFamilyInvite.sendInvite({ email, role })`
- On success: clears form, refreshes pending invitations list
- On error: shows error message inline

### Resend on Pending Invite Card

`FamilyPendingInviteCard` gets a `Resend` button alongside the existing `Revoke` button.

**Behavior:**
- Revokes the existing invitation (`DELETE /api/family/invitations/:id`)
- Re-creates a fresh invite with the same email + role (`POST /api/family/invite`)
- Refreshes the pending invitations list

No new API endpoints needed.

## Components Changed

| File | Change |
|------|--------|
| `pages/settings/family-management.vue` | Add invite form section; wire up resend handler |
| `components/Family/FamilyPendingInviteCard.vue` | Add Resend button, emit `resend` event with `{ id, email, role }` |
| `composables/useFamilyInvitations.ts` | Add `resendInvitation(id, email, role)` action |

## Data Flow

```
User fills form → sendInvite({ email, role })
  → POST /api/family/invite
  → DB: family_invitations row created
  → Email: sendInviteEmail (non-blocking)
  → fetchInvitations() → pending list refreshes

User clicks Resend → resendInvitation(id, email, role)
  → DELETE /api/family/invitations/:id
  → POST /api/family/invite (new token, new expiry)
  → fetchInvitations() → pending list refreshes
```

## Out of Scope

- Invite history (accepted/expired invitations)
- Role-specific invite restrictions (any member can invite any role)
- Duplicate invite prevention (handled by existing 409 conflict check in `invite.post.ts`)
