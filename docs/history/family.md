# History: Family

## 2026-03-01 — Family connection UX
"You're connected!" toast on join, family code in the profile dropdown, and a one-time parent acknowledgment banner.

## 2026-03-01 — Invite email check
Invite GET endpoint detects whether an invited email already has an account, routing to login-and-connect vs signup-and-connect.

## 2026-02-28 — Family unit symmetric redesign
Neutral family model — dropped `player_user_id`, added `created_by_user_id`, new `family_invitations` table + token join flow, RLS scoped by `family_unit_id`; either player or parent can create/invite. (migration + RLS)

## 2026-02-28 — Family invite management
Send/resend/revoke invites inline in Family Management settings for all roles (`resendInvitation` action, inline invite form reusing existing invite/revoke endpoints).
